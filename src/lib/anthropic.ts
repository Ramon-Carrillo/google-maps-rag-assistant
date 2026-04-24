import { createAnthropic } from "@ai-sdk/anthropic";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

/**
 * Shared Anthropic provider. We explicitly pin the baseURL to
 * `https://api.anthropic.com/v1` so the app is immune to a stray
 * `ANTHROPIC_BASE_URL` env var in the developer's shell (a common footgun
 * — some machines have it set without the `/v1` suffix, which silently
 * turns every request into a 404).
 *
 * Key resolution is defensive: the parent shell can have an empty
 * `ANTHROPIC_API_KEY` set (common on Windows dev boxes) which shadows
 * the real value in `.env.local`. Node's `--env-file` doesn't override
 * existing env vars; even Next.js respects shell env as authoritative.
 * When we detect the env var is empty AND we're running server-side
 * (where `fs` is available), we fall back to reading `.env.local`
 * directly. In production on Vercel, env vars are set properly and the
 * fallback never runs.
 */

function resolveApiKey(): string | undefined {
  const fromEnv = (process.env.ANTHROPIC_API_KEY ?? "").trim();
  if (fromEnv) return fromEnv;

  // Dev fallback: read .env.local directly. Only runs when fs is
  // available (i.e. server-side — fine for API routes and scripts, and
  // we never run Anthropic client-side anyway).
  try {
    const envPath = join(process.cwd(), ".env.local");
    if (!existsSync(envPath)) return undefined;
    const content = readFileSync(envPath, "utf-8");
    const match = content.match(/^ANTHROPIC_API_KEY=(.+)$/m);
    const value = match?.[1]?.trim();
    return value && value.length > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

const apiKey = resolveApiKey();

export const anthropic = createAnthropic({
  baseURL: "https://api.anthropic.com/v1",
  apiKey,
});

// Chat model.
//
// Note on Haiku: tried switching to claude-haiku-4-5-20251001 for
// speed, but it returns HTTP 400 when the request includes the
// managed web_search tool — Haiku 4.5 doesn't support programmatic
// tool calling, which web_search requires (the API asks for an
// explicit `allowed_callers=["direct"]` that the AI SDK's
// webSearch_20260209 wrapper doesn't currently expose). Falling
// back to Sonnet 4.6, which supports the full hybrid RAG surface.
//
// The real TTFT win on this project is prompt caching (see the
// streamText system array in api/chat/route.ts), not the model
// choice — and cache reads on Sonnet are still cheaper and faster
// than uncached Haiku on our workload.
export const CHAT_MODEL = "claude-sonnet-4-6";

// Same model used for eval-time LLM-as-judge. Haiku is fine for
// binary PASS/FAIL classification and keeps eval runs inexpensive.
export const JUDGE_MODEL = "claude-haiku-4-5-20251001";
