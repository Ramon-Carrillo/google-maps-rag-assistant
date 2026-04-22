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

  // Retrieve relevant documents. Threshold was empirically tuned against
  // the 12-question eval set: 0.65 was too strict (legitimate Maps
  // questions like "what's deprecated in 2026" topped at 0.525). 0.4
  // catches all real matches without letting in noise — out-of-scope
  // questions still sit in the 0.3s and get filtered.
  let retrievedDocs: Awaited<ReturnType<typeof retrieveRelevantDocs>> = [];
  try {
    retrievedDocs = await retrieveRelevantDocs(queryText, {
      matchThreshold: 0.4,
      matchCount: 5,
    });
  } catch (err) {
    // Any retrieval failure (Voyage down, Neon unreachable) degrades
    // gracefully — we pass no context and rely on the system prompt's
    // refusal instruction. Error is logged to Vercel function logs.
    console.error("Retrieval failed:", err);
  }

  const context = formatRetrievedContext(retrievedDocs);

  // Load system prompt and inject retrieved context
  const basePrompt = loadSystemPrompt();
  const systemPrompt = `${basePrompt}\n\n## Retrieved Documentation\n\nThe following documentation chunks were retrieved based on the user's query. Use ONLY this information to answer. Cite sources using the format specified above.\n\n${context}`;

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
        system: systemPrompt,
        messages: modelMessages,
        maxOutputTokens: 2048,
      });

      writer.merge(result.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({ stream });
}
