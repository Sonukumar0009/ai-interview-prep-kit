import fetch from "node-fetch";
import robotsParser, { Robot } from "robots-parser";
import { fetchAndCleanPage, FetchedPage } from "./pageFetcher";
import { validateExternalUrl } from "./urlSecurity";

const MAX_PAGES_TO_CRAWL = 8;
const REQUEST_DELAY_MS = 500;
const MAX_RETRIES = 2;
const USER_AGENT = "AIInterviewPrepKitBot/1.0";

const STRONG_KEYWORDS = ["career", "careers", "jobs", "job", "hiring", "openings", "positions", "recruiting"];
const WEAK_KEYWORDS = ["join-us", "join-us", "work-with-us", "team", "culture", "life-at", "about-us", "handbook", "engineering-blog", "interview", "benefits", "values"];

function scoreLink(href: string, linkText: string): number {
  let pathname = "";
  try {
    pathname = new URL(href).pathname.toLowerCase();
  } catch {
    pathname = href.toLowerCase();
  }
  // Split the path into segments so keywords must match a whole segment,
  // not an arbitrary substring (e.g. avoids "about" matching inside the
  // hostname "about.gitlab.com" or "team" matching inside "steamroller").
  const segments = pathname.split(/[/\-_]+/).filter(Boolean);
  const linkTextLower = linkText.toLowerCase();

  let s = 0;
  for (const kw of STRONG_KEYWORDS) {
    if (segments.includes(kw)) s += 5;
    else if (linkTextLower.includes(kw)) s += 3; // link text can be looser
  }
  for (const kw of WEAK_KEYWORDS) {
    if (segments.includes(kw)) s += 2;
    else if (linkTextLower.includes(kw)) s += 1;
  }
  return s;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, attempt = 0): ReturnType<typeof fetchAndCleanPage> {
  const result = await fetchAndCleanPage(url);
  if (!result.ok && attempt < MAX_RETRIES) {
    await delay(REQUEST_DELAY_MS * Math.pow(2, attempt + 1));
    return fetchWithRetry(url, attempt + 1);
  }
  return result;
}

async function loadRobots(origin: string): Promise<Robot> {
  const robotsUrl = `${origin}/robots.txt`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(robotsUrl, { signal: controller.signal, headers: { "User-Agent": USER_AGENT } });
    clearTimeout(timeout);
    const text = res.ok ? await res.text() : "";
    return robotsParser(robotsUrl, text);
  } catch {
    return robotsParser(robotsUrl, ""); // no robots.txt found -> treat as unrestricted
  }
}

export interface CrawlResult {
  pagesUsed: string[];
  pages: FetchedPage[];
  skipped: { url: string; reason: string }[];
}

export async function crawlCompanySite(startUrl: string): Promise<CrawlResult> {
  const pages: FetchedPage[] = [];
  const skipped: { url: string; reason: string }[] = [];
  const visited = new Set<string>();

  const validation = await validateExternalUrl(startUrl);
  if (!validation.ok || !validation.resolvedUrl) {
    skipped.push({ url: startUrl, reason: validation.reason || "Invalid start URL" });
    return { pagesUsed: [], pages, skipped };
  }

  const origin = validation.resolvedUrl.origin;
  const robots = await loadRobots(origin);

  const homeResult = await fetchWithRetry(validation.resolvedUrl.toString());
  await delay(REQUEST_DELAY_MS);

  if (!homeResult.ok || !homeResult.page) {
    skipped.push({ url: startUrl, reason: homeResult.error?.message || "Failed to fetch" });
    return { pagesUsed: [], pages, skipped };
  }

  visited.add(homeResult.page.url);
  pages.push(homeResult.page);

  const candidates = homeResult.page.links
    .filter((l) => {
      try {
        return new URL(l.href).origin === origin;
      } catch {
        return false;
      }
    })
    .map((l) => ({ ...l, score: scoreLink(l.href, l.text) }))
    .filter((l) => l.score > 0)
    .sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const toVisit: string[] = [];
  for (const c of candidates) {
    if (seen.has(c.href)) continue;
    seen.add(c.href);
    toVisit.push(c.href);
    if (toVisit.length >= MAX_PAGES_TO_CRAWL - 1) break;
  }

  for (const link of toVisit) {
    if (visited.has(link)) continue;
    if (!robots.isAllowed(link, USER_AGENT)) {
      skipped.push({ url: link, reason: "Disallowed by robots.txt" });
      continue;
    }
    await delay(REQUEST_DELAY_MS);
    const result = await fetchWithRetry(link);
    if (result.ok && result.page) {
      visited.add(result.page.url);
      pages.push(result.page);
    } else {
      skipped.push({ url: link, reason: result.error?.message || "Failed to fetch" });
    }
  }

  return { pagesUsed: pages.map((p) => p.url), pages, skipped };
}