import Link from "next/link";
import {
  ArrowLeft,
  Database,
  MessageSquare,
  Search,
  Sparkles,
  FileText,
  Gauge,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { GithubIcon } from "@/components/icons/github";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const GITHUB_URL = "https://github.com/Ramon-Carrillo/google-maps-rag-assistant";

export const metadata = {
  title: "Architecture — Maps RAG Assistant",
  description:
    "How the Google Maps RAG Assistant is built: ingestion pipeline, retrieval layer, prompt engineering, and eval strategy.",
};

const pipelineSteps = [
  {
    icon: FileText,
    title: "Ingestion",
    detail:
      "Markdown docs in /documents are chunked (~800 tokens, 200 overlap), embedded with voyage-code-3 (input_type=document), and stored in Neon pgvector. Re-ingestion deletes rows by source_url so the store stays consistent.",
  },
  {
    icon: MessageSquare,
    title: "Query arrives",
    detail:
      "POST /api/chat validates the payload with Zod (max 2000 chars per message, max 20 messages), applies a 15-req/min per-IP rate limit, and extracts the most recent user message.",
  },
  {
    icon: Search,
    title: "Retrieval",
    detail:
      "The query is embedded with voyage-code-3 (input_type=query). Neon's match_documents() returns the top 5 chunks above a 0.65 cosine-similarity threshold. Results stream to the client as a data-sources message part before the LLM speaks.",
  },
  {
    icon: Sparkles,
    title: "Generation",
    detail:
      "claude-sonnet-4-6 receives the system prompt + citation instructions + retrieved chunks. Streamed back to the browser via the Vercel AI SDK. The prompt forbids answering from model memory — if retrieval returned nothing relevant, the model is instructed to refuse.",
  },
  {
    icon: Gauge,
    title: "Eval loop",
    detail:
      "evals/run-evals.ts runs 12 golden questions on every prompt or chunking change. Citation accuracy, keyword coverage, and refusal handling are tracked in committed result files so prompt iterations are auditable.",
  },
];

const decisions = [
  {
    q: "Why Voyage, not OpenAI embeddings?",
    a: "Voyage is Anthropic's officially recommended embedding provider, and voyage-code-3 is optimized for code-heavy content — the Google Maps docs are ~40% code snippets. Free tier covers 200M tokens, more than enough for a portfolio project.",
  },
  {
    q: "Why Neon over Supabase?",
    a: "The stack needed plain Postgres with pgvector, nothing more. Neon's serverless driver works natively in the Vercel Edge runtime, autosuspend keeps the free tier lean, and branching lets me run ingestion experiments without risking prod data.",
  },
  {
    q: "Why 800-token chunks with 200-token overlap?",
    a: "Short enough that top-5 retrieval fits comfortably in Claude's context after the system prompt. Overlap prevents chunk boundaries from splitting a code example away from the paragraph explaining it — which was the single biggest quality win during tuning.",
  },
  {
    q: "Why return 5 chunks, not 10?",
    a: "Measured on the eval suite: going from 5 to 10 didn't improve citation accuracy but did dilute the model's attention and increased hallucination risk. More context is not always better.",
  },
  {
    q: "Why cosine similarity, not dot product?",
    a: "Voyage embeddings are normalized, so cosine is stable across document lengths. The IVFFlat index is built with vector_cosine_ops to match.",
  },
  {
    q: "What guards against hallucination?",
    a: "Three layers: (1) the system prompt explicitly instructs refusal when retrieval is empty, (2) the eval suite includes adversarial questions like 'Google Maps Holographic API' to catch regressions, (3) the Sources Used panel in the UI makes it trivially obvious to the user which chunks the model consulted.",
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
            The architecture, the design decisions, and the eval loop behind
            the Maps RAG Assistant.
          </p>
        </section>

        {/* Pipeline diagram */}
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
                  {[
                    ["Framework", "Next.js 15 (App Router)"],
                    ["LLM", "claude-sonnet-4-6 via @ai-sdk/anthropic"],
                    ["Embeddings", "voyage-code-3 (1024-dim)"],
                    ["Vector DB", "Neon Postgres + pgvector (IVFFlat cosine)"],
                    ["Streaming", "Vercel AI SDK (createUIMessageStream)"],
                    ["UI", "shadcn/ui + Tailwind + Framer Motion"],
                    ["Deploy", "Vercel (Edge + Neon serverless driver)"],
                  ].map(([label, value]) => (
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
              <div
                key={d.q}
                className="rounded-xl border bg-card p-5"
              >
                <h3 className="mb-2 font-semibold">{d.q}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {d.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Eval pointer */}
        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-3xl px-4 py-12 text-center">
            <Database className="mx-auto mb-3 h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold">Quality is measured</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
              Every change to the system prompt, chunking, or retrieval
              parameters is evaluated against 12 golden questions — covering
              happy-path retrieval, out-of-scope refusals, and hallucination
              bait. See <code className="rounded bg-muted px-1.5 py-0.5 font-mono">/evals</code> in the repo.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 py-6 text-center text-sm text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
          <p>
            Built by Ramon Montalvo — informed by real Google Maps API support
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
