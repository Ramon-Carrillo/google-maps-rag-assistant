# Eval Suite

Automated quality measurement for the Google Maps RAG Assistant. Every change to the prompt, chunking strategy, retrieval parameters, or embedding model should be evaluated against this suite before landing.

## What gets measured

For each golden question, three independent signals:

1. **Citation accuracy** — did `retrieveRelevantDocs` return the document we expected in the top-k? This measures the retriever in isolation, without touching the LLM.
2. **Content coverage** — does the generated answer contain the keywords we'd expect a correct answer to include? Weak signal on its own, strong signal combined with citation accuracy.
3. **Refusal handling** — for adversarial questions (out-of-scope topics, nonexistent products), does the model refuse instead of hallucinating? This is the most important score to watch — hallucinated answers are the single worst failure mode for a developer-facing RAG assistant.

## Files

- `golden-questions.json` — the test set. 12 questions covering retrieval, out-of-scope handling, and hallucination-bait ("Holographic API" — doesn't exist).
- `run-evals.ts` — the runner. Writes a markdown + JSON report to `results/`.
- `results/` — time-stamped run outputs. Committed to git so the history shows quality trending over time.

## Running

```bash
npx tsx --env-file=.env.local evals/run-evals.ts
```

Takes ~3-5 minutes (rate-limited by Voyage free tier at 3 RPM).

## Interpreting a failing run

- ❌ on **citation** → the retriever missed the right doc. Check chunking, embedding model, or similarity threshold.
- ❌ on **mentions** → the retriever likely worked but the LLM didn't use the context. Check the system prompt's citation-enforcement language.
- ❌ on **refusal** → the model hallucinated. Strengthen the "don't answer outside the documentation" instruction in the system prompt.

## Design notes

- The eval runner calls `retrieveRelevantDocs` and `generateText` directly — not through `/api/chat` — so it runs without a dev server and isn't affected by Next.js rate limiting.
- `matchThreshold` in the eval runner is intentionally lower than in production so refusal questions still get a retrieval attempt — this lets us verify the model refuses *despite* marginal context, not because no context was passed.

### Scorer history

- **v1 (regex-based).** Refusal detection matched against a hand-crafted regex list; `must_mention` did exact substring checks. First run scored 7/12 — but all five "failures" turned out to be false negatives where the model answered correctly in wording the scorer didn't recognize. The baseline run lives at `results/2026-04-21T23-55-53.md`.
- **v2 (LLM judge).** `judge.ts` uses Claude Haiku via `generateObject` with a Zod schema to classify refusal and mention coverage. Paraphrases, synonyms, and alternative phrasings now count. Deterministic citation check is unchanged.
