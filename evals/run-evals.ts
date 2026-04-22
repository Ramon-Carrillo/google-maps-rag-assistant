/**
 * Eval runner for the Google Maps RAG Assistant.
 *
 * For each golden question, scores:
 *   1. Retrieval accuracy — did the expected source URL appear in top-k?
 *   2. Content coverage  — does the generated answer include required keywords?
 *   3. Refusal handling  — for out-of-scope / nonexistent-product questions,
 *                          does the model refuse instead of hallucinating?
 *
 * Usage:
 *   npx tsx --env-file=.env.local evals/run-evals.ts
 *
 * Output:
 *   evals/results/<timestamp>.md  — human-readable report
 *   evals/results/<timestamp>.json — raw results for diffing across runs
 */
import "../scripts/load-env";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { generateText } from "ai";
import { anthropic, CHAT_MODEL } from "../src/lib/anthropic";
import {
  retrieveRelevantDocs,
  formatRetrievedContext,
  type RetrievedDocument,
} from "../src/lib/rag/retrieval";
import { judgeRefusal, judgeMentions } from "./judge";

interface GoldenQuestion {
  id: string;
  question: string;
  expected_sources: string[];
  must_mention?: string[];
  should_refuse: boolean;
  refusal_reason?: string;
}

interface QuestionResult {
  id: string;
  question: string;
  retrieved: Array<{ source_url: string; similarity: number }>;
  answer: string;
  scores: {
    citation_hit: boolean | null;  // null when expected_sources is empty
    mentions_ok: boolean | null;    // null when must_mention is absent
    refusal_ok: boolean | null;     // null when should_refuse is false
  };
  judge_notes?: {
    mentions?: string;
    refusal?: string;
  };
  passed: boolean;
}

// --- Per-question runner ------------------------------------------------

async function loadSystemPrompt(): Promise<string> {
  const base = readFileSync(
    join(process.cwd(), "src/lib/prompts/system-prompt.md"),
    "utf-8"
  );
  const citation = readFileSync(
    join(process.cwd(), "src/lib/prompts/citation-instructions.md"),
    "utf-8"
  );
  return `${base}\n\n${citation}`;
}

async function runQuestion(
  q: GoldenQuestion,
  systemPrompt: string
): Promise<QuestionResult> {
  // 1. Retrieve using production defaults (two-stage: bi-encoder →
  // Voyage rerank → top-5). The retrieveRelevantDocs function handles
  // rate-limit fallback internally.
  const docs: RetrievedDocument[] = await retrieveRelevantDocs(q.question);

  // 2. Generate — MUST match /api/chat config exactly, including the
  // web_search tool. Without the tool, long-tail questions that would
  // succeed in production (via live Google-docs lookup) would fail in
  // eval, giving us a misleading score.
  const context = formatRetrievedContext(docs);
  const fullSystem = `${systemPrompt}\n\n## Retrieved Documentation\n\n${context}`;

  const webSearchTool = anthropic.tools.webSearch_20260209({
    maxUses: 3,
    allowedDomains: ["developers.google.com", "cloud.google.com"],
  });

  const { text } = await generateText({
    model: anthropic(CHAT_MODEL),
    system: fullSystem,
    prompt: q.question,
    maxOutputTokens: 2048,
    tools: {
      web_search: webSearchTool,
    },
  });

  // 3. Score — citation is a deterministic check; mentions and refusal
  // go through a Haiku judge (v2 — replaces v1's brittle regex).
  const retrievedUrls = docs.map((d) => d.source_url);

  const citation_hit =
    q.expected_sources.length === 0
      ? null
      : q.expected_sources.every((url) => retrievedUrls.includes(url));

  const judge_notes: QuestionResult["judge_notes"] = {};

  let mentions_ok: boolean | null = null;
  if (q.must_mention && q.must_mention.length > 0) {
    try {
      const v = await judgeMentions(q.question, text, q.must_mention);
      mentions_ok = v.verdict === "PASS";
      judge_notes.mentions = v.reason;
    } catch (err) {
      judge_notes.mentions = `[judge error: ${(err as Error).message}]`;
    }
  }

  let refusal_ok: boolean | null = null;
  if (q.should_refuse) {
    try {
      const v = await judgeRefusal(
        q.question,
        text,
        q.refusal_reason ?? "Out of scope."
      );
      refusal_ok = v.verdict === "PASS";
      judge_notes.refusal = v.reason;
    } catch (err) {
      judge_notes.refusal = `[judge error: ${(err as Error).message}]`;
    }
  }

  // A question "passes" if every applicable score is true / not-failed.
  const passed =
    (citation_hit ?? true) &&
    (q.should_refuse ? refusal_ok === true : mentions_ok ?? true);

  return {
    id: q.id,
    question: q.question,
    retrieved: docs.map((d) => ({
      source_url: d.source_url,
      similarity: Number(d.similarity.toFixed(3)),
    })),
    answer: text,
    scores: { citation_hit, mentions_ok, refusal_ok },
    judge_notes,
    passed,
  };
}

// --- Report writer ------------------------------------------------------

function scoreToEmoji(s: boolean | null): string {
  if (s === null) return "—";
  return s ? "✅" : "❌";
}

function writeReports(results: QuestionResult[], timestamp: string) {
  const resultsDir = join(process.cwd(), "evals/results");
  if (!existsSync(resultsDir)) mkdirSync(resultsDir, { recursive: true });

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;

  const md = [
    `# Eval Run — ${timestamp}`,
    "",
    `**Pass rate:** ${passed}/${total} (${((passed / total) * 100).toFixed(0)}%)`,
    "",
    "| ID | Question | Citation | Mentions | Refusal | Pass |",
    "|---|---|:---:|:---:|:---:|:---:|",
    ...results.map(
      (r) =>
        `| ${r.id} | ${r.question.slice(0, 60)}${r.question.length > 60 ? "…" : ""} | ` +
        `${scoreToEmoji(r.scores.citation_hit)} | ${scoreToEmoji(r.scores.mentions_ok)} | ` +
        `${scoreToEmoji(r.scores.refusal_ok)} | ${r.passed ? "✅" : "❌"} |`
    ),
    "",
    "## Details",
    "",
    ...results.map((r) => {
      const notes: string[] = [];
      if (r.judge_notes?.mentions) {
        notes.push(`- **Mentions judge:** ${r.judge_notes.mentions}`);
      }
      if (r.judge_notes?.refusal) {
        notes.push(`- **Refusal judge:** ${r.judge_notes.refusal}`);
      }
      return [
        `### ${r.id} — ${r.passed ? "PASS" : "FAIL"}`,
        "",
        `**Q:** ${r.question}`,
        "",
        `**Top retrieved:**`,
        ...r.retrieved
          .slice(0, 3)
          .map((d) => `- \`${d.similarity}\` ${d.source_url}`),
        "",
        ...(notes.length > 0 ? ["**Judge notes:**", ...notes, ""] : []),
        `**Answer:**`,
        "",
        "```",
        r.answer.slice(0, 500) + (r.answer.length > 500 ? "\n…[truncated]" : ""),
        "```",
        "",
      ].join("\n");
    }),
  ].join("\n");

  writeFileSync(join(resultsDir, `${timestamp}.md`), md);
  writeFileSync(
    join(resultsDir, `${timestamp}.json`),
    JSON.stringify(results, null, 2)
  );

  console.log(`\nReport written to evals/results/${timestamp}.md`);
  console.log(`Pass rate: ${passed}/${total} (${((passed / total) * 100).toFixed(0)}%)`);
}

// --- Main ---------------------------------------------------------------

async function main() {
  const goldenPath = join(process.cwd(), "evals/golden-questions.json");
  const golden = JSON.parse(readFileSync(goldenPath, "utf-8")) as {
    questions: GoldenQuestion[];
  };

  console.log(`Running ${golden.questions.length} eval questions...\n`);
  const systemPrompt = await loadSystemPrompt();
  const results: QuestionResult[] = [];

  for (let i = 0; i < golden.questions.length; i++) {
    const q = golden.questions[i];
    process.stdout.write(`  ${q.id}... `);
    try {
      const result = await runQuestion(q, systemPrompt);
      results.push(result);
      console.log(result.passed ? "PASS" : "FAIL");
    } catch (err) {
      console.log(`ERROR: ${(err as Error).message}`);
      results.push({
        id: q.id,
        question: q.question,
        retrieved: [],
        answer: `[error: ${(err as Error).message}]`,
        scores: { citation_hit: false, mentions_ok: false, refusal_ok: false },
        passed: false,
      });
    }
    // Stay under Voyage free-tier 3 RPM for query embeddings
    if (i < golden.questions.length - 1) {
      await new Promise((r) => setTimeout(r, 22_000));
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  writeReports(results, timestamp);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
