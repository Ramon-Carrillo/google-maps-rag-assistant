import { createAnthropic } from "@ai-sdk/anthropic";

/**
 * Shared Anthropic provider. We explicitly pin the baseURL to
 * `https://api.anthropic.com/v1` so the app is immune to a stray
 * `ANTHROPIC_BASE_URL` env var in the developer's shell (a common footgun
 * — some machines have it set without the `/v1` suffix, which silently
 * turns every request into a 404).
 */
// Read the key defensively. `--env-file` in Node won't override vars that
// already exist in the parent shell (even if empty), so a stray empty
// ANTHROPIC_API_KEY in the user's environment can silently win over
// .env.local. Trim and fall back so that doesn't happen.
const apiKey =
  (process.env.ANTHROPIC_API_KEY ?? "").trim() || undefined;

export const anthropic = createAnthropic({
  baseURL: "https://api.anthropic.com/v1",
  apiKey,
});

export const CHAT_MODEL = "claude-sonnet-4-6";

// Cheaper, faster model for eval-time judging. Haiku is fine for binary
// PASS/FAIL classification and keeps eval runs inexpensive.
export const JUDGE_MODEL = "claude-haiku-4-5-20251001";
