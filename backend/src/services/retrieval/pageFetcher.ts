import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { validateExternalUrl } from "./urlSecurity";

const MAX_CONTENT_LENGTH_BYTES = 2 * 1024 * 1024; // 2MB
const FETCH_TIMEOUT_MS = 10000;
const ALLOWED_CONTENT_TYPES = ["text/html", "application/xhtml+xml"];

export interface FetchedPage {
  url: string;
  title: string;
  text: string;
  links: { href: string; text: string }[];
}

export interface FetchResult {
  ok: boolean;
  page?: FetchedPage;
  error?: { code: string; message: string };
}

export async function fetchAndCleanPage(rawUrl: string): Promise<FetchResult> {
  const validation = await validateExternalUrl(rawUrl);
  if (!validation.ok || !validation.resolvedUrl) {
    return { ok: false, error: { code: "INVALID_URL", message: validation.reason || "Invalid URL" } };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(validation.resolvedUrl.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "AIInterviewPrepKitBot/1.0" },
    });

    if (!response.ok) {
      return { ok: false, error: { code: "HTTP_ERROR", message: `Received status ${response.status}` } };
    }

    const contentType = response.headers.get("content-type") || "";
    if (!ALLOWED_CONTENT_TYPES.some((t) => contentType.includes(t))) {
      return {
        ok: false,
        error: { code: "UNSUPPORTED_CONTENT_TYPE", message: `Unsupported content type: ${contentType}` },
      };
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_CONTENT_LENGTH_BYTES) {
      return { ok: false, error: { code: "PAYLOAD_TOO_LARGE", message: "Page exceeds size limit" } };
    }

    const buffer = await response.buffer();
    if (buffer.byteLength > MAX_CONTENT_LENGTH_BYTES) {
      return { ok: false, error: { code: "PAYLOAD_TOO_LARGE", message: "Page exceeds size limit" } };
    }

    const $ = cheerio.load(buffer.toString("utf-8"));
    $("script, style, noscript, svg, iframe").remove();

    const title = $("title").first().text().trim();
    const text = $("body").text().replace(/\s+/g, " ").trim();

    const links: { href: string; text: string }[] = [];
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      const linkText = $(el).text().replace(/\s+/g, " ").trim();
      if (!href) return;
      try {
        const absolute = new URL(href, validation.resolvedUrl!.toString()).toString();
        links.push({ href: absolute, text: linkText });
      } catch {
        // ignore unparsable hrefs (mailto:, javascript:, tel:, etc.)
      }
    });

    return { ok: true, page: { url: validation.resolvedUrl.toString(), title, text, links } };
  } catch (err) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      error: {
        code: isAbort ? "TIMEOUT" : "FETCH_FAILED",
        message: isAbort ? "Request timed out" : (err as Error).message,
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}