import { sql, toVectorLiteral } from "./neon-client";
import { embedQuery, embedDocuments, rerankDocuments } from "./voyage";

export interface RetrievedDocument {
  id: string;
  content: string;
  source_url: string;
  source_title: string;
  similarity: number;
}

/**
 * Re-export Voyage embedding helpers so callers (ingestion, eval suite)
 * have a single import path for anything retrieval-related.
 */
export { embedQuery, embedDocuments };

/**
 * Two-stage retrieval: bi-encoder (pgvector cosine) for wide recall,
 * cross-encoder (Voyage rerank-2) for precise relevance scoring.
 *
 * Stage 1 casts a wider net than we'd show the LLM (up to `matchCount`
 * candidates at a looser `matchThreshold`). Stage 2 reranks those
 * candidates and keeps only the top `finalTopK` above `rerankThreshold`.
 *
 * Why two stages: bi-encoder embeddings are fast but imprecise at the
 * relevance boundary. A cross-encoder reranker sees query + candidate
 * together, yielding measurably better relevance — crucial when the
 * corpus grows, because marginal near-matches start floating to the
 * top. The rerank threshold is also the hallucination guard: if
 * nothing scores above it, retrieval returns empty and the system
 * prompt's canned refusal fires cleanly instead of the LLM speculating
 * from mid-similarity context.
 *
 * Degradation: if the rerank call fails (rate limit past backoff,
 * Voyage outage, etc.), we fall back to the top cosine-sorted
 * candidates so the chat stays functional.
 */
export async function retrieveRelevantDocs(
  query: string,
  options: {
    /** Stage-1 cosine threshold. Looser than final because reranker
     *  filters marginal hits more accurately. */
    matchThreshold?: number;
    /** Stage-1 candidate count, fed into the reranker. Default 20. */
    matchCount?: number;
    /** Stage-2 final count after rerank. Default 5. */
    finalTopK?: number;
    /** Minimum rerank relevance score to keep a chunk. Default 0.5. */
    rerankThreshold?: number;
  } = {}
): Promise<RetrievedDocument[]> {
  const {
    matchThreshold = 0.3,
    matchCount = 20,
    finalTopK = 5,
    rerankThreshold = 0.5,
  } = options;

  // ── Stage 1: bi-encoder retrieval ──
  const queryEmbedding = await embedQuery(query);
  const vectorLiteral = toVectorLiteral(queryEmbedding);

  let candidates: RetrievedDocument[];
  try {
    candidates = (await sql`
      SELECT * FROM match_documents(
        ${vectorLiteral}::vector(1024),
        ${matchThreshold}::float,
        ${matchCount}::int
      )
    `) as RetrievedDocument[];
  } catch (error) {
    console.error("Retrieval error (stage 1):", error);
    throw error;
  }

  if (candidates.length === 0) return [];

  // ── Stage 2: cross-encoder rerank ──
  try {
    const reranked = await rerankDocuments(
      query,
      candidates.map((c) => c.content),
      finalTopK,
      1,
      // Chat runtime: don't burn 30–95s on the Voyage free-tier 429
      // retry ladder. If rerank fails, the catch block below falls
      // back to cosine ordering immediately — the user gets an answer
      // in seconds instead of after a minute of silence. Ingestion
      // scripts call rerankDocuments directly without this flag and
      // keep the retry ladder.
      { retryOn429: false },
    );

    // Map rerank results back to full RetrievedDocument shape, and
    // overwrite `similarity` with the (more accurate) rerank score
    // so the UI's Sources panel shows relevance, not cosine.
    return reranked
      .filter((r) => r.relevance_score >= rerankThreshold)
      .map((r) => ({
        ...candidates[r.index],
        similarity: r.relevance_score,
      }));
  } catch (error) {
    // Graceful fallback: if rerank fails, return the cosine-ranked
    // top candidates. Worse precision, but chat stays working.
    console.error(
      "Retrieval error (stage 2 rerank) — falling back to cosine order:",
      error,
    );
    return candidates.slice(0, finalTopK);
  }
}

/**
 * Format retrieved documents into a context string for the LLM
 */
export function formatRetrievedContext(docs: RetrievedDocument[]): string {
  if (docs.length === 0) {
    return "No relevant documentation was found for this query.";
  }

  return docs
    .map(
      (doc, i) =>
        `[Source ${i + 1}: ${doc.source_title}](${doc.source_url})\n${doc.content}`
    )
    .join("\n\n---\n\n");
}
