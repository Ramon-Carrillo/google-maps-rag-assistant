"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface RetrievedSource {
  source_url: string;
  source_title: string;
  similarity: number;
  snippet: string;
}

interface SourcesPanelProps {
  sources: RetrievedSource[];
}

/**
 * Collapsible panel that shows the RAG retrieval output — the chunks
 * actually consulted by the model, each with its cosine-similarity score
 * and a short snippet.
 *
 * This is what makes the app visibly a RAG system rather than "chat with
 * a wrapper." Recruiters see the retrieval step happening.
 */
export function SourcesPanel({ sources }: SourcesPanelProps) {
  const [open, setOpen] = useState(false);

  if (sources.length === 0) return null;

  return (
    <div className="mt-3 rounded-lg border bg-background/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5" />
          {sources.length} source{sources.length === 1 ? "" : "s"} consulted
        </span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <ul className="space-y-2 border-t p-3">
              {sources.map((s, i) => (
                <li
                  key={`${s.source_url}-${i}`}
                  className="rounded-md border bg-card p-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <a
                      href={s.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-1.5 text-sm font-medium text-primary hover:underline"
                    >
                      {s.source_title}
                      <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" />
                    </a>
                    <span
                      className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono tabular-nums text-muted-foreground"
                      title="Cosine similarity"
                    >
                      {s.similarity.toFixed(3)}
                    </span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                    {s.snippet}…
                  </p>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
