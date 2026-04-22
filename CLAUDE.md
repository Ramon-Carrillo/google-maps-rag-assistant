# CLAUDE.md – Google Maps RAG Assistant

## Project Overview

**Project Name**: Google Maps RAG Assistant – AI-Powered Developer Support Tool

A RAG (Retrieval-Augmented Generation) chatbot that answers developer questions about Google Maps Platform. It retrieves accurate information from official Google Maps documentation and returns structured responses with inline citations, code examples, and troubleshooting steps.

**Goal**: Demonstrate senior-level prompt engineering, production-grade RAG architecture, and polished UI. Directly informed by real Tier 1 Google Maps API support experience at HCLTech (troubleshooting, JavaScript debugging, billing issues).

**Target Audience**: Developers and frontend engineers working with the Google Maps JavaScript API, Places API, Routes API, and related products.

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js App Router + TypeScript | App Router only — no Pages Router |
| AI SDK | Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) | Use `streamText` for responses |
| LLM | `claude-sonnet-4-6` | Correct API model string |
| Vector DB | Neon Postgres + pgvector | Accessed via `@neondatabase/serverless` (edge-compatible) |
| Embeddings | Voyage `voyage-code-3` | 1024 dimensions, Anthropic-recommended, code-optimized |
| UI | shadcn/ui + Tailwind CSS + Framer Motion | Dark/light mode required |
| Syntax highlighting | `react-syntax-highlighter` | With copy-to-clipboard |
| Deployment | Vercel | |

---

## Environment Variables

```env
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
# Neon pooled connection string (Neon console → Connection Details → Pooled)
DATABASE_URL=
```

---

## Notes for AI Assistance

- Use `claude-sonnet-4-6` as the model string (not `anthropic/claude-sonnet-4.6`).
- Always include citation logic — retrieved `source_url` values must surface in the response.
- Prefer `streamText` from Vercel AI SDK over raw `fetch` to the Anthropic API.
- Keep prompt iterations clearly labeled with version comments.
