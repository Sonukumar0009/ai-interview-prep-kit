import fetch from "node-fetch";

const SEARCH_TIMEOUT_MS = 8000;
const MAX_RESULTS = 5;
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1000;

export interface DiscussionResult {
  title: string;
  url: string;
  snippet: string;
}

export interface DiscussionSearchResult {
  ok: boolean;
  results: DiscussionResult[];
  error?: { code: string; message: string };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface TavilyResult {
  title: string;
  url: string;
  content?: string;
}

interface TavilyResponse {
  results?: TavilyResult[];
}

async function tavilySearch(query: string, attempt = 0): Promise<DiscussionSearchResult> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      results: [],
      error: { code: "MISSING_API_KEY", message: "TAVILY_API_KEY is not configured" },
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: MAX_RESULTS,
        search_depth: "basic",
      }),
    });

    // Free-tier rate limiting: back off and retry, per Section 2's
    // "rate-limit your requests and back off on failure".
    if (response.status === 429 && attempt < MAX_RETRIES) {
      await delay(BASE_DELAY_MS * Math.pow(2, attempt + 1));
      return tavilySearch(query, attempt + 1);
    }

    if (!response.ok) {
      return {
        ok: false,
        results: [],
        error: { code: "SEARCH_HTTP_ERROR", message: `Tavily returned status ${response.status}` },
      };
    }

    const data = (await response.json()) as TavilyResponse;
    const raw = data.results || [];

    const results: DiscussionResult[] = raw.slice(0, MAX_RESULTS).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content || "",
    }));

    return { ok: true, results };
  } catch (err) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    if (!isAbort && attempt < MAX_RETRIES) {
      await delay(BASE_DELAY_MS * Math.pow(2, attempt + 1));
      return tavilySearch(query, attempt + 1);
    }
    return {
      ok: false,
      results: [],
      error: {
        code: isAbort ? "TIMEOUT" : "SEARCH_FAILED",
        message: isAbort ? "Search request timed out" : (err as Error).message,
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function searchInterviewDiscussion(companyName: string): Promise<DiscussionSearchResult> {
  const query = `${companyName} interview process questions`;
  const result = await tavilySearch(query);

  if (result.ok && result.results.length > 0) {
    return result;
  }

  if (!result.ok) {
    // Per Section 2/10: skip and report a source that can't be retrieved,
    // rather than failing the whole run.
    return { ok: true, results: [], error: result.error };
  }

  return result; // ok, but genuinely zero results found
}