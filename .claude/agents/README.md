# Docs maintenance team

Three subagents that keep `/documents/*.md` aligned with what Google Maps Platform actually publishes today. They're designed to work in sequence, though each is useful on its own.

| Agent | Role | When to invoke |
|---|---|---|
| `maps-docs-auditor` | Detective — finds what's stale | "Check what's outdated", "audit the corpus" |
| `maps-docs-researcher` | Fact-finder — pulls current data from Google | "What's the current Routes/Optimization API pricing?" |
| `maps-docs-writer` | Scribe — updates the markdown files | After research is in hand, or for direct manual updates |

## Typical workflow

```
 1. User: "Check our docs for stale info"
      ↓
 2. maps-docs-auditor
      reads /documents/*.md
      WebFetches each source_url
      writes /documents/.audit/audit-YYYY-MM-DD.md
      ↓
 3. User reviews the audit, picks a stale file to fix
      ↓
 4. User: "Update billing-and-pricing.md based on the audit"
      ↓
 5. maps-docs-researcher
      deep-dives current Google pricing pages
      returns a structured brief
      ↓
 6. maps-docs-writer
      applies the brief's findings to the .md file
      reminds user to re-ingest
      ↓
 7. User: `npx tsx src/lib/rag/ingestion.ts`
      existing chunks deleted by source_url, new chunks written
      ↓
 8. User: `npx tsx evals/run-evals.ts`
      confirm the updated doc still passes eval
```

## Why three agents, not one

Separation of concerns. The auditor can run cheaply and often without modifying anything; the writer can be trusted to never hallucinate because it doesn't touch the web. Each agent has a narrow prompt, narrow tool set, and one job. That's how you keep a team from collectively turning into a single bloated super-agent.

Tool surfaces per agent:

- **auditor** — `Read, Glob, Grep, WebFetch, WebSearch, Write` (writes the audit report only, never touches `/documents/*.md`)
- **researcher** — `WebFetch, WebSearch, Read, Grep` (no Write at all)
- **writer** — `Read, Write, Edit, Glob` (no web access at all)

This is deliberate. The researcher CAN'T accidentally write to the wrong file. The writer CAN'T hallucinate from a stale WebFetch. The auditor CAN'T edit `/documents/*.md` even if asked.

## Invoking them

These are Claude Code subagents. To invoke one explicitly in a Claude Code session:

> "Use the maps-docs-auditor to check for outdated info."

Or let Claude decide based on the agent `description` fields:

> "Our docs still mention the $200 credit — can you audit the corpus?"
> (Claude will route this to `maps-docs-auditor` automatically.)

## Known-stale facts the auditor should flag

Current as of 2026-04-21 — keep this list updated as Google changes things:

- The **$200 monthly credit is gone**. Any doc that still promises it is stale.
- The **Routes API** may have been renamed (commonly referenced as "Route Optimization API"). Auditor should confirm canonical name during its run.
- `google.maps.Marker` → `AdvancedMarkerElement`
- Legacy Places API (`PlacesService`) → Places API (New) (`Place` class, `PlaceAutocompleteElement`)

## Re-ingestion after updates

Every time a `.md` file changes:

```bash
npx tsx src/lib/rag/ingestion.ts
```

The script is idempotent — it deletes existing chunks by `source_url` before re-inserting, so you can run it as often as you want without duplicates.

Then re-run evals to confirm nothing regressed:

```bash
npx tsx evals/run-evals.ts
```
