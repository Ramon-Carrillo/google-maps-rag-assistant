/**
 * Retrieval smoke test. Runs a handful of sample queries and prints the
 * top hits with similarity scores. Run with:
 *   npx tsx --env-file=.env.local scripts/smoke-test.ts
 */
import "./load-env";
import { retrieveRelevantDocs } from "../src/lib/rag/retrieval";

const QUERIES = [
  "How do I fix RefererNotAllowedMapError?",
  "What's the pricing for the Routes API?",
  "How do I use the new Places Autocomplete widget?",
  "What is deprecated in 2026?",
  // Adversarial: should return 0 sources after reranker filters out
  // marginal billing-chunk matches. This is the regression we saw on
  // eval q12 — if the reranker is working, rerank scores for this query
  // should all fall below the default 0.5 threshold.
  "What is the pricing for the Google Maps Holographic API?",
];

async function main() {
  for (const q of QUERIES) {
    console.log(`\n=== Query: ${q}`);
    // Use the defaults (20 candidates → rerank → top 5 above 0.5)
    const hits = await retrieveRelevantDocs(q);
    if (hits.length === 0) {
      console.log("  (no hits above threshold)");
      continue;
    }
    for (const hit of hits) {
      console.log(
        `  [${hit.similarity.toFixed(3)}] ${hit.source_title} — ${hit.content.slice(0, 80).replace(/\s+/g, " ")}...`
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
