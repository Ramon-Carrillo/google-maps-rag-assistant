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

export const CHAT_MODEL = "claude-sonnet-4-6";

// Cheaper, faster model for eval-time judging. Haiku is fine for binary
// PASS/FAIL classification and keeps eval runs inexpensive.
export const JUDGE_MODEL = "claude-haiku-4-5-20251001";
