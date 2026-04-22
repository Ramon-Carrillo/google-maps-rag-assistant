/**
 * Force-load .env.local into process.env, overriding any existing values.
 *
 * Node's `--env-file` flag doesn't override variables that already exist
 * in the parent shell — so a stray empty `ANTHROPIC_API_KEY=` in the
 * user's shell silently wins over the real key in .env.local. This
 * helper is imported at the top of CLI scripts (ingestion, evals, smoke
 * tests) to make env loading deterministic.
 *
 * Next.js loads .env.local into process.env automatically for server
 * code, so this file is CLI-only.
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const envPath = join(process.cwd(), ".env.local");

if (existsSync(envPath)) {
  const content = readFileSync(envPath, "utf-8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    // Strip surrounding quotes if present
    const unquoted = value.replace(/^["']|["']$/g, "");
    process.env[key] = unquoted;
  }
}

// Force the correct Anthropic base URL in case the shell has the
// no-/v1 variant set (a real footgun we hit during development).
if (
  process.env.ANTHROPIC_BASE_URL &&
  !process.env.ANTHROPIC_BASE_URL.endsWith("/v1")
) {
  process.env.ANTHROPIC_BASE_URL = "https://api.anthropic.com/v1";
}
