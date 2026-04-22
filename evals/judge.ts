/**
 * LLM-based eval judge. Replaces the v1 regex-based refusal detection
 * and exact-substring keyword checks, both of which produced false
 * negatives in the first run (correct refusals phrased as "outside my
 * domain" didn't match any regex).
 *
 * We use Claude Haiku 4.5 because:
 *   - Binary classification doesn't need Sonnet-level reasoning
 *   - Haiku is ~3x cheaper per eval run
 *   - generateObject with a Zod schema gives us clean PASS/FAIL without
 *     fragile string parsing
 */
import { generateObject } from "ai";
import { z } from "zod";
import { anthropic, JUDGE_MODEL } from "../src/lib/anthropic";

// Loose on purpose — Haiku sometimes writes longer reasons and the
// strict max was forcing schema failures. We only care about the verdict.
const verdictSchema = z.object({
  verdict: z.enum(["PASS", "FAIL"]),
  reason: z.string(),
});

/**
 * Score whether the model correctly refused to answer.
 * PASS means the model declined/refused/redirected — did NOT fabricate.
 */
export async function judgeRefusal(
  question: string,
  answer: string,
  refusalReason: string
): Promise<{ verdict: "PASS" | "FAIL"; reason: string }> {
  const { object } = await generateObject({
    model: anthropic(JUDGE_MODEL),
    schema: verdictSchema,
    system:
      "You are an eval judge. You classify whether an AI assistant's response correctly REFUSED to answer an out-of-scope or nonexistent-product question. A correct refusal acknowledges the limitation (no hallucinated facts, no fabricated pricing, no made-up procedures). Rephrasing the question back to the user, redirecting them to the correct domain, or explicitly stating the product does not exist all count as valid refusals. Making up ANY specific facts (prices, features, API names) about the out-of-scope topic is a FAIL.",
    prompt: [
      `Question: ${question}`,
      `Expected behavior: Refuse because — ${refusalReason}`,
      `Assistant answer:\n"""\n${answer}\n"""`,
      "",
      "Did the assistant refuse correctly? Reply PASS or FAIL with a one-sentence reason.",
    ].join("\n"),
  });

  return object;
}

/**
 * Score whether the answer addresses the expected concepts.
 * Uses semantic judgment rather than exact substring matching, so
 * "HTTP referrer" matches an expectation of "HTTP referrers" and
 * "@googlemaps/js-api-loader" matches an expectation of "script loader."
 */
export async function judgeMentions(
  question: string,
  answer: string,
  expectedConcepts: string[]
): Promise<{ verdict: "PASS" | "FAIL"; reason: string }> {
  const { object } = await generateObject({
    model: anthropic(JUDGE_MODEL),
    schema: verdictSchema,
    system:
      "You are an eval judge. You check whether an AI assistant's answer substantively addresses each expected concept. Exact wording is NOT required — paraphrases, synonyms, and plural/singular variants all count. Only FAIL if a concept is genuinely missing or wrong.",
    prompt: [
      `Question: ${question}`,
      `Expected concepts (each must be addressed, in any wording):`,
      ...expectedConcepts.map((c) => `  - ${c}`),
      "",
      `Assistant answer:\n"""\n${answer}\n"""`,
      "",
      "Are all expected concepts addressed? Reply PASS or FAIL with a one-sentence reason.",
    ].join("\n"),
  });

  return object;
}
