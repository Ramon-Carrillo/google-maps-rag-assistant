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
];

async function main() {
  for (const q of QUERIES) {
    console.log(`\n=== Query: ${q}`);
    const hits = await retrieveRelevantDocs(q, { matchCount: 3, matchThreshold: 0.3 });
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
