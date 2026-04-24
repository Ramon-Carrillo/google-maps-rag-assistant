import { anthropic, CHAT_MODEL } from "@/lib/anthropic";
import {
  streamText,
  createUIMessageStream,
  createUIMessageStreamResponse,
  convertToModelMessages,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { readFileSync } from "fs";
import { join } from "path";
import {
  retrieveRelevantDocs,
  formatRetrievedContext,
} from "@/lib/rag/retrieval";

// --- Route config ---
//
// Vercel's Node runtime defaults to a 10s function timeout on Hobby,
// which is tight for a request that does retrieval + streaming +
// managed web_search (web_search alone can take 15–30s). Bumping to
// 60s covers a worst-case multi-search turn with headroom. Still well
// within Hobby's 60s streaming cap.
export const maxDuration = 60;

// --- Rate Limiting (in-memory sliding window) ---

const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 15;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) ?? [];

  // Remove expired timestamps
  const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  valid.push(now);
  rateLimitMap.set(ip, valid);

  return valid.length > RATE_LIMIT_MAX_REQUESTS;
}

// --- Request Validation ---
//
// @ai-sdk/react v3 (AI SDK v6) sends UIMessages, which are shaped as:
//   { id, role, parts: [{ type: "text", text: string }, ...] }
// NOT the old `{ role, content: string }` shape. We validate just enough
// to protect the endpoint from hostile payloads and pass everything else
// through to `convertToModelMessages()` below.

const textPartSchema = z.object({
  type: z.literal("text"),
  text: z.string().max(4000),
});

const uiMessageSchema = z
  .object({
    id: z.string().optional(),
    role: z.enum(["user", "assistant", "system"]),
    // Be lenient on unknown part types — the SDK also emits
    // `data-*`, `reasoning`, etc. We only validate text parts strictly.
    parts: z
      .array(
        z.union([textPartSchema, z.object({ type: z.string() }).passthrough()])
      )
      .min(1),
  })
  .passthrough();

const requestSchema = z.object({
  messages: z.array(uiMessageSchema).min(1).max(20),
});

/**
 * Flatten all text parts of a UIMessage into a single string.
 */
function extractText(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n");
}

// --- Load System Prompt ---

function loadSystemPrompt(): string {
  const promptPath = join(process.cwd(), "src/lib/prompts/system-prompt.md");
  const citationPath = join(
    process.cwd(),
    "src/lib/prompts/citation-instructions.md"
  );

  const systemPrompt = readFileSync(promptPath, "utf-8");
  const citationInstructions = readFileSync(citationPath, "utf-8");

  return `${systemPrompt}\n\n${citationInstructions}`;
}

// --- POST Handler ---

export async function POST(request: Request) {
  // Rate limiting
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return new Response("Too many requests. Please wait a moment.", {
      status: 429,
    });
  }

  // Parse and validate body
  let uiMessages: UIMessage[];
  try {
    const raw = await request.json();
    const parsed = requestSchema.parse(raw);
    uiMessages = parsed.messages as UIMessage[];
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("Request validation failed:", err);
    }
    return new Response("Invalid request body", { status: 400 });
  }

  // Extract the latest user message's plain text for retrieval
  const lastUserMessage = [...uiMessages]
    .reverse()
    .find((m) => m.role === "user");

  if (!lastUserMessage) {
    return new Response("No user message found", { status: 400 });
  }

  const queryText = extractText(lastUserMessage);

  // Retrieve relevant documents via two-stage retrieval (bi-encoder
  // cosine → Voyage rerank → final top-K). We use the defaults from
  // retrieval.ts: stage-1 matchThreshold 0.3 / matchCount 20 →
  // rerank → finalTopK 5 above rerankThreshold 0.5.
  //
  // When the reranker rate-limits on the Voyage free tier, the retrieval
  // function falls back to cosine-ordered top-5 so chat stays working.
  let retrievedDocs: Awaited<ReturnType<typeof retrieveRelevantDocs>> = [];
  try {
    retrievedDocs = await retrieveRelevantDocs(queryText);
  } catch (err) {
    // Any retrieval failure (Voyage down, Neon unreachable) degrades
    // gracefully — we pass no context and rely on the web_search tool
    // below to cover the answer from live Google docs.
    console.error("Retrieval failed:", err);
  }

  const context = formatRetrievedContext(retrievedDocs);

  // Load the static system prompt. This is the same every request, so
  // we cache it with Anthropic prompt caching below (see the messages
  // array). Retrieved context is per-query and can't be cached — we
  // send it as a second system message so only the changing bit pays
  // the uncached TTFT cost.
  const basePrompt = loadSystemPrompt();
  const retrievedContextBlock = `## Retrieved Documentation\n\nThe following documentation chunks were retrieved from the curated corpus based on the user's query. Use this as the PRIMARY source of truth. If it doesn't cover the question, call the \`web_search\` tool for live Google Maps documentation before answering. Cite sources using the format specified above.\n\n${context}`;

  // Hybrid RAG: Claude can escalate to Anthropic's managed web search
  // when the curated corpus doesn't cover the question. Restricted to
  // Google-owned documentation domains so answers stay authoritative.
  //
  // maxUses=1 is the real latency/timeout guard: each managed
  // web_search round-trip takes 10–20s, so three stacked calls
  // (the SDK default was effectively unbounded here before) would
  // blow past Vercel's 60s function ceiling and produce the
  // "sources consulted chip then silence" 504 we hit earlier.
  //
  // We ALWAYS leave the tool available — even when retrieval returned
  // several chunks — because retrieval count is not the same as
  // retrieval quality. For long-tail questions (Aerial View API,
  // Solar API, newer products not in the curated corpus) the
  // retriever returns 5 low-relevance chunks but none actually
  // answer the question. Disabling the tool in that case forced
  // the model into an unhelpful "I can't confirm this" hedge. The
  // model is trusted to call web_search only when the retrieved
  // context is genuinely insufficient; the system prompt tells it
  // how to make that call.
  const webSearchTool = anthropic.tools.webSearch_20260209({
    maxUses: 1,
    allowedDomains: ["developers.google.com", "cloud.google.com"],
  });

  // Build a UI message stream that (a) emits a "sources" data part
  // upfront so the client can render citation chips before the answer,
  // and (b) merges Claude's streamed text.
  const modelMessages = await convertToModelMessages(uiMessages);

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({
        type: "data-sources",
        id: "sources",
        data: retrievedDocs.map((d) => ({
          source_url: d.source_url,
          source_title: d.source_title,
          similarity: Number(d.similarity.toFixed(3)),
          snippet: d.content.slice(0, 220),
        })),
      });

      const result = streamText({
        model: anthropic(CHAT_MODEL),
        // Prompt caching via the top-level `system` array. Two system
        // blocks:
        //   [0] static base prompt — cacheable. providerOptions
        //       marks it for Anthropic's ephemeral cache (5-min TTL).
        //       First request writes the cache, subsequent requests
        //       within 5 minutes read it at ~10% of normal input cost.
        //   [1] per-query retrieved context — not cached, changes
        //       every turn.
        // Keeping this in `system` (rather than injecting into
        // `messages`) avoids confusing the client-side UI stream
        // parser, which doesn't expect synthetic system entries in
        // the assistant's message history.
        system: [
          {
            role: "system",
            content: basePrompt,
            providerOptions: {
              anthropic: { cacheControl: { type: "ephemeral" } },
            },
          },
          { role: "system", content: retrievedContextBlock },
        ],
        messages: modelMessages,
        maxOutputTokens: 2048,
        tools: { web_search: webSearchTool },
        onError: ({ error }) => {
          // streamText swallows provider errors by default — log them
          // so they show up in Vercel function logs and we can diagnose
          // auth/rate-limit/model issues in prod.
          console.error("streamText error:", error);
        },
      });

      writer.merge(result.toUIMessageStream());
    },
    onError: (error) => {
      // Surface the error message to the client instead of silently
      // closing the stream. Without this, a thrown error in the
      // execute callback closes the UI stream with no assistant text,
      // which looks like "the agent is broken."
      console.error("UI stream error:", error);
      const message =
        error instanceof Error ? error.message : "Unknown error";
      return `Sorry — the assistant hit an error: ${message}`;
    },
  });

  return createUIMessageStreamResponse({ stream });
}
