/**
 * Voyage AI embeddings client.
 *
 * Voyage is Anthropic's officially recommended embedding provider. We hit
 * their REST endpoint directly — there's no Vercel AI SDK adapter for
 * Voyage, but the API is tiny (single POST) and this keeps the dependency
 * surface small.
 *
 * Key detail: Voyage recommends different `input_type` values for indexing
 * vs. searching. Passing the correct value measurably improves retrieval
 * quality, so we expose it as a parameter.
 *
 * Docs: https://docs.voyageai.com/reference/embeddings-api
 */

export const VOYAGE_MODEL = "voyage-code-3";
export const VOYAGE_DIMENSIONS = 1024;
export const RERANK_MODEL = "rerank-2";

const VOYAGE_EMBED_ENDPOINT = "https://api.voyageai.com/v1/embeddings";
const VOYAGE_RERANK_ENDPOINT = "https://api.voyageai.com/v1/rerank";
const MAX_BATCH_SIZE = 128; // Voyage API limit

type VoyageInputType = "document" | "query";

interface VoyageResponse {
  object: "list";
  data: Array<{ object: "embedding"; embedding: number[]; index: number }>;
  model: string;
  usage: { total_tokens: number };
}

interface VoyageError {
  detail?: string;
  error?: { message?: string };
}

function getApiKey(): string {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) {
    throw new Error(
      "VOYAGE_API_KEY is not set. Add your Voyage API key to .env.local."
    );
  }
  return key;
}

async function callVoyage(
  input: string[],
  inputType: VoyageInputType,
  attempt = 1
): Promise<number[][]> {
  const res = await fetch(VOYAGE_EMBED_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      input,
      model: VOYAGE_MODEL,
      input_type: inputType,
    }),
  });

  // Retry on 429 with exponential backoff. Voyage free tier without a
  // payment method is 3 RPM — common during bulk ingestion.
  if (res.status === 429 && attempt <= 5) {
    const backoffMs = Math.min(30_000, 5_000 * 2 ** (attempt - 1));
    console.log(`  [voyage] rate-limited, retrying in ${backoffMs / 1000}s...`);
    await new Promise((r) => setTimeout(r, backoffMs));
    return callVoyage(input, inputType, attempt + 1);
  }

  if (!res.ok) {
    let message = `Voyage API error: ${res.status} ${res.statusText}`;
    try {
      const err = (await res.json()) as VoyageError;
      message += ` — ${err.detail ?? err.error?.message ?? "unknown"}`;
    } catch {
      // ignore JSON parse errors on error body
    }
    throw new Error(message);
  }

  const json = (await res.json()) as VoyageResponse;
  // Voyage returns results in the same order as inputs, but index is
  // provided explicitly — sort by it to be defensive.
  return json.data
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}

/**
 * Embed a single query string for similarity search.
 */
export async function embedQuery(text: string): Promise<number[]> {
  const [embedding] = await callVoyage([text], "query");
  return embedding;
}

/**
 * Embed multiple document chunks for indexing. Batches automatically at
 * Voyage's 128-input limit.
 */
export async function embedDocuments(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    const batch = texts.slice(i, i + MAX_BATCH_SIZE);
    const batchEmbeddings = await callVoyage(batch, "document");
    results.push(...batchEmbeddings);
  }
  return results;
}

// ─── Reranker ─────────────────────────────────────────────────────────────────

interface VoyageRerankResponse {
  object: "list";
  data: Array<{
    index: number;
    relevance_score: number;
    document?: string;
  }>;
  model: string;
  usage: { total_tokens: number };
}

export interface RerankResult {
  /** Index into the original `documents` array passed in. */
  index: number;
  /** Voyage relevance score, 0-1. Higher = more relevant. */
  relevance_score: number;
}

/**
 * Re-rank a set of candidate documents against a query using Voyage's
 * cross-encoder reranker. This is stage 2 of a two-stage retrieval
 * pipeline — call `embedQuery` + SQL `match_documents` to get ~20
 * candidates first, then pass them here to pick the final top-K.
 *
 * Why a second stage: bi-encoder embeddings (stage 1) are fast and
 * cheap but imprecise at the relevance boundary. Cross-encoder
 * rerankers see the query and each candidate together, yielding
 * measurably better relevance scoring — at the cost of one extra API
 * call per query.
 *
 * Results are returned sorted by `relevance_score` descending.
 *
 * Docs: https://docs.voyageai.com/reference/reranker-api
 */
export async function rerankDocuments(
  query: string,
  documents: string[],
  topK: number,
  attempt = 1,
  { retryOn429 = true }: { retryOn429?: boolean } = {},
): Promise<RerankResult[]> {
  if (documents.length === 0) return [];

  const res = await fetch(VOYAGE_RERANK_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      query,
      documents,
      model: RERANK_MODEL,
      top_k: Math.min(topK, documents.length),
      // We pass the docs back to ourselves via index — no need for Voyage
      // to echo `document` text in the response, saves bandwidth.
      return_documents: false,
    }),
  });

  // Retry ladder: 5s → 10s → 20s → 30s → 30s, up to 5 attempts.
  // Appropriate for ingestion/eval scripts where we HAVE to get a
  // rerank result and can afford the wait.
  //
  // NOT appropriate for runtime chat: if Voyage is 429'ing now on the
  // free tier (3 RPM shared bucket), it will almost certainly 429
  // again 30s from now. The chat path passes `retryOn429: false` so
  // we fail fast and the caller falls back to cosine-order retrieval
  // immediately — trading a small precision loss for answer latency.
  if (res.status === 429 && retryOn429 && attempt <= 5) {
    const backoffMs = Math.min(30_000, 5_000 * 2 ** (attempt - 1));
    console.log(
      `  [voyage/rerank] rate-limited, retrying in ${backoffMs / 1000}s...`,
    );
    await new Promise((r) => setTimeout(r, backoffMs));
    return rerankDocuments(query, documents, topK, attempt + 1, { retryOn429 });
  }

  if (!res.ok) {
    let message = `Voyage rerank error: ${res.status} ${res.statusText}`;
    try {
      const err = (await res.json()) as VoyageError;
      message += ` — ${err.detail ?? err.error?.message ?? "unknown"}`;
    } catch {
      // ignore JSON parse errors on the error body
    }
    throw new Error(message);
  }

  const json = (await res.json()) as VoyageRerankResponse;
  // Voyage returns the top_k results already sorted by score, but sort
  // defensively in case the API changes.
  return json.data
    .map((d) => ({ index: d.index, relevance_score: d.relevance_score }))
    .sort((a, b) => b.relevance_score - a.relevance_score);
}
