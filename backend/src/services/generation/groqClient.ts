import fetch from "node-fetch";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-120b";
const REQUEST_TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

export interface GroqCallResult {
  ok: boolean;
  content?: string;
  error?: { code: string; message: string };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls the Groq chat completion API with retry + exponential backoff.
 * Handles 429 (rate limit) specially: reads Retry-After when present,
 * otherwise backs off exponentially. This is the safeguard against the
 * brief's explicit warning that free tiers limit tokens/minute and a
 * pipeline that falls over on the first "slow down" loses points.
 */
export async function callGroq(
  systemPrompt: string,
  userPrompt: string,
  attempt = 0
): Promise<GroqCallResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { ok: false, error: { code: "MISSING_API_KEY", message: "GROQ_API_KEY is not configured" } };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (response.status === 429) {
      if (attempt >= MAX_RETRIES) {
        return { ok: false, error: { code: "RATE_LIMITED", message: "Groq rate limit exceeded after retries" } };
      }
      const retryAfterHeader = response.headers.get("retry-after");
      const waitMs = retryAfterHeader
        ? Number(retryAfterHeader) * 1000
        : BASE_DELAY_MS * Math.pow(2, attempt + 1);
      await delay(waitMs);
      return callGroq(systemPrompt, userPrompt, attempt + 1);
    }

    if (!response.ok) {
      const bodyText = await response.text();
      // Transient server-side errors (5xx) are retried; 4xx (bad request,
      // auth) are not, since retrying won't help.
      if (response.status >= 500 && attempt < MAX_RETRIES) {
        await delay(BASE_DELAY_MS * Math.pow(2, attempt + 1));
        return callGroq(systemPrompt, userPrompt, attempt + 1);
      }
      return {
        ok: false,
        error: { code: "GROQ_HTTP_ERROR", message: `Groq returned ${response.status}: ${bodyText.slice(0, 200)}` },
      };
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return { ok: false, error: { code: "EMPTY_RESPONSE", message: "Groq returned no content" } };
    }

    return { ok: true, content };
  } catch (err) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    if (!isAbort && attempt < MAX_RETRIES) {
      await delay(BASE_DELAY_MS * Math.pow(2, attempt + 1));
      return callGroq(systemPrompt, userPrompt, attempt + 1);
    }
    return {
      ok: false,
      error: {
        code: isAbort ? "TIMEOUT" : "GROQ_REQUEST_FAILED",
        message: isAbort ? "Groq request timed out" : (err as Error).message,
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}