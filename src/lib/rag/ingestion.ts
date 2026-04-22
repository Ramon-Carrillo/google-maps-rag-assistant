import "../../../scripts/load-env";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { embedDocuments } from "./retrieval";
import { sql, toVectorLiteral } from "./neon-client";

/**
 * Split text into chunks with overlap.
 * Target ~800-1000 tokens per chunk with ~200 token overlap.
 * Approximation: 1 token ≈ 4 characters.
 */
function chunkText(
  text: string,
  options: { chunkSize?: number; overlap?: number } = {}
): string[] {
  const { chunkSize = 3600, overlap = 800 } = options; // chars, not tokens

  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);

  let currentChunk = "";

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());

      // Keep overlap from end of current chunk
      const overlapText = currentChunk.slice(-overlap);
      currentChunk = overlapText + "\n\n" + paragraph;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Extract metadata from document frontmatter.
 * Expected format at top of file:
 * ---
 * title: Document Title
 * source_url: https://developers.google.com/maps/...
 * ---
 */
function extractMetadata(content: string): {
  title: string;
  source_url: string;
  body: string;
} {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!frontmatterMatch) {
    return { title: "Unknown", source_url: "", body: content };
  }

  const frontmatter = frontmatterMatch[1];
  const body = frontmatterMatch[2];

  const titleMatch = frontmatter.match(/title:\s*(.+)/);
  const urlMatch = frontmatter.match(/source_url:\s*(.+)/);

  return {
    title: titleMatch?.[1]?.trim() ?? "Unknown",
    source_url: urlMatch?.[1]?.trim() ?? "",
    body: body.trim(),
  };
}

/**
 * Ingest a single markdown document into the vector store.
 * Deletes existing chunks for the same source_url before inserting.
 */
async function ingestDocument(filePath: string): Promise<number> {
  const raw = readFileSync(filePath, "utf-8");
  const { title, source_url, body } = extractMetadata(raw);

  console.log(`Processing: ${title}`);

  const chunks = chunkText(body);
  console.log(`  Chunks: ${chunks.length}`);

  // Delete existing chunks for this source (re-ingestion support)
  if (source_url) {
    await sql`DELETE FROM documents WHERE source_url = ${source_url}`;
  }

  // Embed all chunks (Voyage with input_type="document")
  const embeddings = await embedDocuments(chunks);

  // Insert one row per chunk. @neondatabase/serverless doesn't support
  // parameterized bulk inserts with vector literals cleanly, so we loop —
  // fast enough for a one-shot ingestion script.
  for (let i = 0; i < chunks.length; i++) {
    const vectorLiteral = toVectorLiteral(embeddings[i]);
    await sql`
      INSERT INTO documents (content, embedding, source_url, source_title, chunk_index)
      VALUES (
        ${chunks[i]},
        ${vectorLiteral}::vector(1024),
        ${source_url},
        ${title},
        ${i}
      )
    `;
  }

  console.log(`  Inserted ${chunks.length} chunks`);
  return chunks.length;
}

/**
 * Ingest all markdown files from the /documents directory
 */
async function main() {
  const docsDir = join(process.cwd(), "documents");
  const files = readdirSync(docsDir).filter((f) => f.endsWith(".md"));

  if (files.length === 0) {
    console.log("No markdown files found in /documents");
    return;
  }

  console.log(`Found ${files.length} documents to ingest\n`);

  let totalChunks = 0;

  for (let i = 0; i < files.length; i++) {
    const count = await ingestDocument(join(docsDir, files[i]));
    totalChunks += count;
    // Stay under Voyage free-tier rate limit (3 RPM without a payment method)
    if (i < files.length - 1) {
      await new Promise((r) => setTimeout(r, 22_000));
    }
  }

  console.log(`\nDone! Total chunks ingested: ${totalChunks}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
