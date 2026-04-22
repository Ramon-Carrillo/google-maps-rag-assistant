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

const VOYAGE_ENDPOINT = "https://api.voyageai.com/v1/embeddings";
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
  const res = await fetch(VOYAGE_ENDPOINT, {
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
