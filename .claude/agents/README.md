# Docs maintenance team

Five project-level Claude Code subagents that keep `/documents/*.md` aligned with what the Google Maps Platform ecosystem actually needs. Discovery + maintenance in one team, with hard tool-surface boundaries so no single agent can both invent facts AND persist them.

## Agents at a glance

| Agent | Role | Listens to | Writes to |
|---|---|---|---|
| `maps-docs-demand-scout` | Ear to the ground — what devs actually ask | SO, GitHub issues, Reddit, blogs | `/documents/.audit/demand-scout-<date>.md` |
| `maps-docs-mapper` | Cartographer — Google's official taxonomy | `developers.google.com/maps/**` only | `/documents/.audit/mapper-<date>.md` |
| `maps-docs-auditor` | Detective — catches staleness in existing docs | Each local doc's `source_url` | `/documents/.audit/audit-<date>.md` |
| `maps-docs-researcher` | Deep-dive specialist — one topic at a time | `developers.google.com/maps/**` only | Research brief in-chat (no disk writes) |
| `maps-docs-writer` | Scribe — applies briefs to the corpus | Briefs and direct instructions | `/documents/*.md` |

## Two workflows

### Workflow A — build or expand the corpus

```
 1. User: "What should we cover?"
      ↓
 2. Run IN PARALLEL:
      - maps-docs-demand-scout  → demand-scout-<date>.md
      - maps-docs-mapper        → mapper-<date>.md
      ↓
 3. User (or orchestrator) cross-references both reports:
      high demand + official Google doc  → P1 (full doc)
      official doc + low/no demand       → P3 (stub)
      demand with no official doc        → troubleshooting content
      ↓
 4. For each P1/P2 topic:
      maps-docs-researcher → structured brief
      maps-docs-writer     → /documents/<slug>.md
      ↓
 5. Re-ingest:  npx tsx src/lib/rag/ingestion.ts
 6. Re-eval:   npx tsx evals/run-evals.ts
```

### Workflow B — maintain what's already there

```
 1. User: "Check our docs for stale info."
      ↓
 2. maps-docs-auditor → audit-<date>.md
      ↓
 3. For each stale finding the user approves:
      maps-docs-researcher → brief
      maps-docs-writer     → updates /documents/<file>.md
      ↓
 4. Re-ingest + re-eval
```

Workflow A ran first (once) when the corpus was built out. Workflow B runs periodically to catch drift.

## Tool surfaces — why the boundaries matter

Each agent has a deliberately minimal tool set. The goal is **no single agent can both invent facts and persist them**.

| Agent | Read files | Edit `/documents/` | Write reports | Access web |
|---|---|---|---|---|
| demand-scout | ✅ | ❌ | ✅ (report only) | ✅ |
| mapper       | ✅ | ❌ | ✅ (report only) | ✅ |
| auditor      | ✅ | ❌ | ✅ (report only) | ✅ |
| researcher   | ✅ | ❌ | ❌ | ✅ |
| writer       | ✅ | ✅ | ❌ (file writes only) | ❌ |

Consequences:
- The **writer can't hallucinate from a stale fetch** — no web access.
- The **researcher can't accidentally corrupt files** — no Write.
- The **three investigative agents** (scout, mapper, auditor) can only report what they find; a human routes findings to the writer.
- The writer trusts the researcher's brief; if something's wrong with the brief, the human catches it before the writer executes.

## Invoking them

These are Claude Code subagents. In a Claude Code session inside this project:

> "Run the demand-scout to see what Maps questions developers actually ask."
> "Use the mapper to build a taxonomy of Google's current APIs."
> "Audit our docs against Google's current pricing page."
> "Research the current Route Optimization API pricing."
> "Update places-api.md based on that research brief."

Claude will route each request to the right agent via the `description` frontmatter.

## Known-stale facts the auditor should flag

Keep this list updated as Google changes things:

- The **$200 monthly Google Maps Platform credit was retired Feb 28, 2025** — replaced with per-SKU free usage tiers (Essentials 10k / Pro 5k / Enterprise 1k / Map Tiles 100k).
- The **Routes API** has been renamed — verify canonical name during audits. Many third-party sources still call it "Routes API".
- `google.maps.Marker` → `AdvancedMarkerElement`.
- Legacy Places API / `PlacesService` → Places API (New) / `Place` class / `PlaceAutocompleteElement`.
- Drawing Library → Terra Draw (Aug 2025).
- Heatmap Layer → deck.gl `HeatmapLayer` (May 2025).
- `addDomListener` → native `addEventListener`.
- Places Autocomplete `bounds/location/radius` → `locationBias` / `locationRestriction`.

## After any corpus change

```bash
# Idempotent: deletes existing chunks by source_url before re-inserting
npx tsx src/lib/rag/ingestion.ts

# Confirm no eval regression
npx tsx evals/run-evals.ts
```
