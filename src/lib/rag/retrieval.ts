import { sql, toVectorLiteral } from "./neon-client";
import { embedQuery, embedDocuments } from "./voyage";

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
 * Retrieve relevant documents from Neon pgvector via the `match_documents`
 * SQL function (cosine similarity).
 */
export async function retrieveRelevantDocs(
  query: string,
  options: { matchThreshold?: number; matchCount?: number } = {}
): Promise<RetrievedDocument[]> {
  const { matchThreshold = 0.7, matchCount = 5 } = options;

  const queryEmbedding = await embedQuery(query);
  const vectorLiteral = toVectorLiteral(queryEmbedding);

  try {
    const rows = (await sql`
      SELECT * FROM match_documents(
        ${vectorLiteral}::vector(1024),
        ${matchThreshold}::float,
        ${matchCount}::int
      )
    `) as RetrievedDocument[];

    return rows ?? [];
  } catch (error) {
    console.error("Retrieval error:", error);
    return [];
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
