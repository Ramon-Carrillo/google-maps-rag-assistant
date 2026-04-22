import Link from "next/link";
import {
  ArrowLeft,
  Database,
  MessageSquare,
  Search,
  Sparkles,
  FileText,
  Gauge,
  Layers,
  Globe,
  BookOpen,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { GithubIcon } from "@/components/icons/github";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const GITHUB_URL = "https://github.com/Ramon-Carrillo/google-maps-rag-assistant";

export const metadata = {
  title: "Architecture — Maps RAG Assistant",
  description:
    "Hybrid RAG with a curated Neon pgvector corpus and agentic web search against developers.google.com. Two-stage retrieval (Voyage embedding + cross-encoder rerank) with committed eval suite tracking every prompt and chunking change.",
};

// ─── Pipeline steps ──────────────────────────────────────────────────────────
// The live system runs a two-stage retrieval (bi-encoder → cross-encoder)
// followed by an agentic generation loop that can escalate to live web
// search when the curated corpus is insufficient. Each step here maps to
// real code under src/lib/rag/, src/app/api/chat/, or src/lib/prompts/.

const pipelineSteps = [
  {
    icon: FileText,
    title: "1. Ingestion",
    detail:
      "12 Markdown docs in /documents are chunked (~800 tokens with 200-token overlap), embedded with voyage-code-3 (input_type=document, 1024-dim), and stored in Neon pgvector. Currently 41 chunks across Maps JS API, Places, Routes, Route Optimization, Geocoding, Address Validation, Advanced Markers, API Key Restrictions, React/Next.js integration, billing, deprecations, and troubleshooting. Re-ingestion is idempotent — it deletes rows by source_url before re-inserting.",
  },
  {
    icon: MessageSquare,
    title: "2. Query arrives",
    detail:
      "POST /api/chat validates the UIMessage payload with Zod (max 4K chars per text part, max 20 messages), applies a 15-req/min per-IP rate limit, and extracts the latest user message.",
  },
  {
    icon: Search,
    title: "3. Stage-1 retrieval (bi-encoder)",
    detail:
      "The query is embedded with voyage-code-3 (input_type=query). Neon's match_documents() returns the top 20 candidate chunks above a 0.3 cosine threshold. Looser than we'd show the LLM — it's a wide-net recall step whose output feeds the reranker.",
  },
  {
    icon: Layers,
    title: "4. Stage-2 rerank (cross-encoder)",
    detail:
      "Voyage rerank-2 scores each of the 20 candidates against the query and returns the top 5 above a 0.5 relevance threshold. Cross-encoders see query + candidate together and are measurably more precise than bi-encoders at the relevance boundary. If rerank rate-limits (Voyage free tier is 3 RPM shared), the system gracefully falls back to cosine-ordered top-5 — chat stays functional.",
  },
  {
    icon: Sparkles,
    title: "5. Generation with agentic fallback",
    detail:
      "claude-sonnet-4-6 receives system prompt (v4) + retrieved chunks + web_search_20260209 tool restricted to developers.google.com and cloud.google.com (max 3 uses per message). If the corpus covers the question, Claude answers from corpus citations. If the corpus is weak but the question is in-domain, Claude calls web_search against Google's live docs and answers with web citations. If the question is out-of-scope entirely, Claude refuses without searching. Response streams back via createUIMessageStream with a data-sources part rendered as the 'Sources consulted' panel.",
  },
  {
    icon: Gauge,
    title: "6. Eval loop",
    detail:
      "evals/run-evals.ts runs 15 golden questions on every prompt, corpus, or retrieval change. Scoring combines deterministic citation-accuracy checks with Haiku-based LLM judges for mention coverage and refusal quality. Results land in evals/results/<timestamp>.md and are committed so the git history documents every iteration.",
  },
];

// ─── Design decisions ────────────────────────────────────────────────────────
// Each Q&A ties a specific architectural choice to the eval data or
// production constraint that drove it.

const decisions = [
  {
    q: "Why hybrid RAG with agentic web search instead of just growing the corpus?",
    a: "Google Maps Platform docs are 500+ pages across 30+ APIs, updated continuously. No static corpus survives contact with user questions for long — the long tail is vast. Instead of chasing completeness, the corpus covers the common 80% and the web_search tool handles the other 20% by fetching live from developers.google.com. Adversarial queries (non-existent products, off-topic questions) are still refused without searching. This is how Perplexity and ChatGPT's browsing mode work — curated-for-speed + live-for-coverage.",
  },
  {
    q: "Why a two-stage retriever instead of just cosine + top-5?",
    a: "As the corpus grew from 6 → 12 files (13 → 41 chunks), cosine-only retrieval started surfacing 'kinda relevant' chunks on adversarial queries — which caused the model to hedge instead of refuse cleanly. Adding a cross-encoder rerank stage between pgvector and the LLM sharpens the relevance boundary: the wider stage-1 net improves recall, the stage-2 rerank improves precision, and chunks that fail to clear the rerank threshold produce an empty context that fires the system prompt's refusal rule.",
  },
  {
    q: "Why Voyage, not OpenAI embeddings?",
    a: "Voyage is Anthropic's officially recommended embedding provider, and voyage-code-3 is optimized for code-heavy content — the Google Maps docs are ~40% code snippets. Using Voyage for both embedding and rerank means one API key, one rate-limit bucket, one mental model.",
  },
  {
    q: "Why Neon over Supabase?",
    a: "The stack needed plain Postgres with pgvector, nothing more. Neon's serverless driver works natively in the Vercel Edge runtime, autosuspend keeps the free tier lean, and branching would let me run ingestion experiments without risking prod data (not used in practice yet, but available).",
  },
  {
    q: "Why 800-token chunks with 200-token overlap?",
    a: "Short enough that stage-2 rerank returns of 5 chunks fit comfortably in Claude's context after the system prompt. Overlap prevents chunk boundaries from splitting a code example away from the paragraph explaining it — which was the single biggest quality win during early tuning.",
  },
  {
    q: "Why Anthropic's managed web_search tool instead of a custom fetcher?",
    a: "Three reasons. (1) No new API key or search provider to maintain — the tool is managed by Anthropic and billed at $10/1K searches, negligible at portfolio traffic. (2) allowedDomains restricts searches to Google-owned docs so the model can't wander off to Stack Overflow or blogs. (3) maxUses caps the loop so a single user message can't burn unlimited searches. Implementing this with a custom fetcher would take days; the managed tool was ~10 lines.",
  },
  {
    q: "What guards against hallucination?",
    a: "Four layers. (1) System prompt forbids answering from model memory alone — factual claims must come from retrieved chunks or web_search results. (2) Eval suite includes adversarial questions (non-existent 'Holographic API', out-of-scope weather/AWS queries) to catch regressions. (3) Sources consulted panel in the UI shows exactly which chunks the model saw, so hallucinations are immediately visible. (4) The cross-encoder reranker drops marginal chunks that would otherwise encourage the LLM to speculate.",
  },
  {
    q: "Why return 5 chunks from stage 2, not 10?",
    a: "Measured on the eval suite: going from 5 to 10 didn't improve citation accuracy but diluted the model's attention and increased hallucination risk. More context is not always better, and the rerank threshold keeps the 5 that survive genuinely relevant.",
  },
];

// ─── Stack table ─────────────────────────────────────────────────────────────

const stack: Array<[string, string]> = [
  ["Framework", "Next.js 16 (App Router)"],
  ["LLM", "claude-sonnet-4-6 via @ai-sdk/anthropic"],
  ["Embeddings", "voyage-code-3 (1024-dim)"],
  ["Reranker", "voyage rerank-2 (cross-encoder, top 20 → top 5)"],
  ["Vector DB", "Neon Postgres + pgvector (IVFFlat cosine)"],
  ["Web search", "Anthropic managed web_search_20260209 (domain-restricted)"],
  ["Streaming", "Vercel AI SDK (createUIMessageStream + tool use)"],
  ["Eval judge", "claude-haiku-4-5 via generateObject"],
  ["UI", "shadcn/ui + Tailwind + Framer Motion"],
  ["Deploy", "Vercel (Edge + Neon serverless driver)"],
];

// ─── Iteration history ───────────────────────────────────────────────────────
// Surfaces the prompt/corpus/retrieval evolution visible in git so readers
// get the "this was a real project that evolved" signal without digging.

const iterations: Array<{ version: string; change: string; outcome: string }> = [
  {
    version: "v1",
    change: "Regex-based eval scorer",
    outcome:
      "7/12 baseline — 5 'failures' were false negatives where correct refusals used phrasing the regex didn't recognize.",
  },
  {
    version: "v2",
    change: "Replaced regex with Haiku LLM-judge",
    outcome: "11/12 on the same answers — scorer stopped mis-classifying.",
  },
  {
    version: "v3",
    change: "Prompt v2 → v3 (made refusal a floor, not a ceiling)",
    outcome:
      "9/12 — the 'also list adjacent APIs' rule leaked into out-of-scope refusals. Reverted v2; documented in git.",
  },
  {
    version: "v4",
    change: "Two-stage retrieval + Anthropic web_search tool",
    outcome:
      "11/15 with all 3 newly-added long-tail questions passing. Remaining 4 failures are LLM-judge variance, not hallucinations.",
  },
];

export default function ArchitecturePage() {
  return (
    <div className="flex min-h-full flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "gap-2"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div className="flex items-center gap-1">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "h-8 w-8"
              )}
              aria-label="View source on GitHub"
            >
              <GithubIcon className="h-4 w-4" />
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Intro */}
        <section className="mx-auto max-w-3xl px-4 pt-12 pb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            How it works
          </h1>
          <p className="mt-3 text-muted-foreground">
            Hybrid RAG with a curated Neon pgvector corpus and live Google
            Maps docs lookup when the corpus is insufficient. Two-stage
            retrieval (bi-encoder → cross-encoder rerank), LLM-judge eval
            loop, and a committed iteration history in git.
          </p>
          <a
            href="https://ramoncarrillo.dev/blog/building-a-grounded-rag-assistant"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Read the full case study on ramoncarrillo.dev
          </a>
        </section>

        {/* At-a-glance architecture diagram */}
        <section className="mx-auto max-w-3xl px-4 pb-12">
          <h2 className="mb-6 text-xl font-semibold">Two-path retrieval</h2>
          <div className="rounded-xl border bg-card p-6">
            <pre className="whitespace-pre overflow-x-auto font-mono text-xs leading-[1.8] text-muted-foreground sm:text-[13px]">
{`                            user query
                                │
                  voyage-code-3 embedding
                                │
                                ▼
               pgvector match_documents(top 20, cos ≥ 0.3)
                                │
                                ▼
              voyage rerank-2 → keep top 5, score ≥ 0.5
                                │
                                ▼
              claude-sonnet-4-6 answers from corpus …
                                │
          ┌─────────────────────┴─────────────────────┐
          │ corpus covers it?                          │
          │   YES → cite corpus, done                  │
          │   NO, and in-domain → call web_search      │
          │                        ↳ developers.google.│
          │                          com + cloud.google│
          │                          .com only, max 3  │
          │   NO, out-of-scope  → refuse cleanly       │
          └────────────────────────────────────────────┘`}
            </pre>
          </div>
        </section>

        {/* Pipeline walkthrough */}
        <section className="mx-auto max-w-3xl px-4 pb-12">
          <h2 className="mb-6 text-xl font-semibold">Request pipeline</h2>

          <ol className="relative space-y-4 border-l border-border pl-6">
            {pipelineSteps.map((step, i) => (
              <li key={step.title} className="relative">
                <span className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full border bg-primary text-[11px] font-semibold text-primary-foreground">
                  {i + 1}
                </span>
                <div className="rounded-xl border bg-card p-4">
                  <div className="mb-1 flex items-center gap-2">
                    <step.icon className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">{step.title}</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {step.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Stack table */}
        <section className="border-y bg-muted/30">
          <div className="mx-auto max-w-3xl px-4 py-12">
            <h2 className="mb-6 text-xl font-semibold">Stack at a glance</h2>
            <div className="overflow-hidden rounded-xl border bg-card">
              <table className="w-full text-sm">
                <tbody>
                  {stack.map(([label, value]) => (
                    <tr key={label} className="border-b last:border-0">
                      <td className="w-36 border-r px-4 py-2.5 font-medium text-muted-foreground">
                        {label}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs">
                        {value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Design decisions */}
        <section className="mx-auto max-w-3xl px-4 py-12">
          <h2 className="mb-6 text-xl font-semibold">Design decisions</h2>
          <div className="space-y-4">
            {decisions.map((d) => (
              <div key={d.q} className="rounded-xl border bg-card p-5">
                <h3 className="mb-2 font-semibold">{d.q}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {d.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Iteration history */}
        <section className="border-y bg-muted/30">
          <div className="mx-auto max-w-3xl px-4 py-12">
            <h2 className="mb-6 text-xl font-semibold">
              Iteration history
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
              Every change to the eval scorer, system prompt, or retrieval
              layer was evaluated against the golden-question set and the
              result committed. The git log is an audit trail — nothing here
              is retroactive narrative.
            </p>
            <div className="overflow-hidden rounded-xl border bg-card">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="w-20 px-4 py-2.5">Run</th>
                    <th className="px-4 py-2.5">What changed</th>
                    <th className="px-4 py-2.5">Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {iterations.map((it) => (
                    <tr key={it.version} className="border-b last:border-0">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">
                        {it.version}
                      </td>
                      <td className="px-4 py-3 align-top">{it.change}</td>
                      <td className="px-4 py-3 align-top text-muted-foreground">
                        {it.outcome}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Eval pointer */}
        <section className="border-t">
          <div className="mx-auto max-w-3xl px-4 py-12 text-center">
            <Database className="mx-auto mb-3 h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold">Quality is measured</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
              15-question golden set covers happy-path retrieval, out-of-scope
              refusal, hallucination bait, and long-tail queries that
              specifically exercise the <code className="rounded bg-muted px-1.5 py-0.5 font-mono">web_search</code> fallback. Every eval run
              writes a timestamped markdown + JSON report to <code className="rounded bg-muted px-1.5 py-0.5 font-mono">evals/results/</code> —
              committed so the trend is visible.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-xs font-medium">
              <Globe className="h-3.5 w-3.5 text-primary" />
              <span>
                Long-tail questions now answered via live Google docs search
              </span>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 py-6 text-center text-sm text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
          <p>
            Built by Ramon Carrillo — informed by real Google Maps API support
            experience at HCLTech
          </p>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground/80 hover:text-foreground"
          >
            <GithubIcon className="h-4 w-4" />
            Source on GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
