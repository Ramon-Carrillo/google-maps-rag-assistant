# Research brief: billing & pricing — 2026-04-21

Fetch date: 2026-04-22. All sources are developers.google.com.

**Primary sources:**
- [1] https://developers.google.com/maps/billing-and-pricing/pricing — Global price list: SKU-level free caps + 5-step volume pricing
- [2] https://developers.google.com/maps/billing-and-pricing/overview — Confirms March 1, 2025 change; quotes "Free usage caps replace monthly $200 credit"
- [3] https://developers.google.com/maps/billing-and-pricing/sku-details — SKU rename notes (Routes Essentials/Pro/Enterprise; Maps SDK merger; Embed merger)
- [4] https://developers.google.com/maps/billing-and-pricing — Top-level nav to all billing subpages (overview, pay-as-you-go, subscriptions, pricing, sku-details, glossary, reporting)

## Current reality

- Google Maps Platform now uses a three-category SKU model: **Essentials**, **Pro**, and **Enterprise**. Every SKU is assigned to exactly one category, and the category determines the free-usage allowance and the volume-discount curve. [1][2]
- **The $200 monthly credit was retired on March 1, 2025** (not Feb 28 — Google's own wording in the overview anchors the switch to March 1). The overview page says: "Free usage caps replace monthly $200 credit" and "As of March 1, 2025 Google Maps Platform has made the following changes". [2]
- Replacement model: per-SKU monthly free allowances. "Each SKU provides free billable events every month, the quantity of which depends on the price category the SKU belongs to. This free usage resets on the first day of each month, at midnight Pacific US time." [2]
- Free allowance by category: **Essentials = 10,000 events/mo**, **Pro = 5,000 events/mo**, **Enterprise = 1,000 events/mo**. Some SKUs (Maps Embed, Maps SDK, Street View Metadata, Autocomplete Session Usage, Place Details IDs-Only) are **unlimited / no charge**. [1]
- Volume discount is automatic, with five monthly breakpoints applied after free usage is consumed: **0–100K, 100K–500K, 500K–1M, 1M–5M, 5M+**. Each step drops the per-1,000 rate. [1]
- Additional discretionary enterprise discounts apply above "10,000,000+ monthly billable events under at least one paid core services SKU." [1]
- Two billing models coexist: **Pay-as-you-go** (default, per-event) and **Subscriptions** ("a predictable, fixed monthly price fee for a set number of calls"). [4]
- **SKU rename**: old "Compute Routes Basic/Advanced/Preferred" no longer exists. They map to **Compute Routes Essentials / Pro / Enterprise** (and same for Route Matrix). [3]
- **Other SKU consolidations**: "Mobile Native Static Maps and Mobile Native Dynamic Maps are now merged under one single SKU: Maps SDK." "Embed and Embed Advanced are now merged under one single SKU: Embed." [3]
- **Places API** now has three tiers per surface: e.g., Place Details Essentials / Pro / Enterprise; Text Search Pro / Enterprise; Nearby Search Pro / Enterprise. Fields and features available differ by tier. [1][3]
- Google's recommended spend-control pattern: "Monitor and control your spend by setting budget alerts and usage quotas in the Google Cloud console." [2] Subscriptions are the other official cost-cap lever.
- India has a separate price list at `/maps/billing-and-pricing/pricing-india`. The global list above does not apply there. [4]
- No `/faqs` page exists at the URL in the original instructions — 404. FAQ content now lives embedded in the overview/pricing pages.

## Pricing tables (verbatim from Google)

All prices are USD per 1,000 requests. Column headers are monthly-usage bands. [1]

### Essentials tier (10,000 free events/month each)

| SKU | 0–100K | 100K–500K | 500K–1M | 1M–5M | 5M+ |
|---|---|---|---|---|---|
| Dynamic Maps | $7.00 | $5.60 | $4.20 | $2.10 | $0.53 |
| Static Maps | $2.00 | $1.60 | $1.20 | $0.60 | $0.15 |
| Street View Static | $7.00 | $5.60 | $4.20 | $2.10 | $0.53 |
| Geocoding | $5.00 | $4.00 | $3.00 | $1.50 | $0.38 |
| Geolocation | $5.00 | $4.00 | $3.00 | $1.50 | $0.38 |
| Time Zone | $5.00 | $4.00 | $3.00 | $1.50 | $0.38 |
| Autocomplete Requests | $2.83 | $2.27 | $1.70 | $0.85 | $0.21 |
| Place Details Essentials | $5.00 | $4.00 | $3.00 | $1.50 | $0.38 |
| Address Validation Essentials | $5.00 | $4.00 | $3.00 | $1.50 | $0.38 |
| Compute Routes Essentials | $5.00 | $4.00 | $3.00 | $1.50 | $0.38 |
| Compute Route Matrix Essentials | $5.00 | $4.00 | $3.00 | $1.50 | $0.38 |

**Unlimited / no charge SKUs:** Maps Embed, Maps SDK, Street View Metadata, Autocomplete Session Usage, Place Details (IDs Only). [1]

### Pro tier (5,000 free events/month each)

| SKU | 0–100K | 100K–500K | 500K–1M | 1M–5M | 5M+ |
|---|---|---|---|---|---|
| Dynamic Street View | $14.00 | — | — | — | $1.05 |
| Aerial View | $16.00 | $12.80 | $9.60 | $4.80 | $1.20 |
| Address Validation Pro | $17.00 | $13.60 | $10.20 | $5.10 | $1.28 |
| Place Details Pro | $17.00 | $13.60 | $10.20 | $5.10 | $1.28 |
| Text Search Pro | $32.00 | $25.60 | $19.20 | $9.60 | $2.40 |
| Nearby Search Pro | $32.00 | $25.60 | $19.20 | $9.60 | $2.40 |
| Compute Routes Pro | $10.00 | — | — | — | $0.75 |
| Compute Route Matrix Pro | $10.00 | — | — | — | $0.75 |
| Roads — Nearest Road | $10.00 | — | — | — | $0.76 |
| Roads — Route Traveled | $10.00 | — | — | — | $0.76 |
| Roads — Speed Limits | $20.00 | — | — | — | $12.00 |

(Intermediate bands for several Pro SKUs were not returned verbatim by the fetch; writer should re-pull [1] for the four missing cells before publishing. Outer bookends are verbatim.)

### Enterprise tier (1,000 free events/month each)

| SKU | 0–100K | 100K–500K | 500K–1M | 1M–5M | 5M+ |
|---|---|---|---|---|---|
| Place Details Enterprise | $20.00 | — | — | — | $1.51 |
| Text Search Enterprise | $35.00 | — | — | — | $2.63 |
| Nearby Search Enterprise | $35.00 | — | — | — | $2.63 |
| Compute Routes Enterprise | $15.00 | — | — | — | $1.14 |
| Compute Route Matrix Enterprise | $15.00 | — | — | — | $1.14 |
| Fleet Routing | $30.00 | — | — | — | $2.10 |
| Navigation Request | $25.00 | — | — | — | $2.00 |

(Same caveat: intermediate bands not verbatim from fetch — confirm from [1] at publish time.)

## Code examples / config snippets

Google's recommended spend controls (paraphrased from [2]):

1. **Budget alerts** — Cloud Console → Billing → Budgets & alerts → create budget, set thresholds (e.g. 50/90/100%). Sends email only; does **not** stop API usage.
2. **Quota caps** — Cloud Console → APIs & Services → Google Maps Platform → select API → Quotas & System Limits → set daily request cap. This **does** hard-stop requests over the cap (returns `OVER_QUERY_LIMIT`).
3. **Subscriptions** — Flat-fee alternative to pay-as-you-go for predictable monthly cost.

No code snippet from Google — these are all console workflows.

## What changed vs /documents/billing-and-pricing.md

- **Local says:** "$200 USD monthly credit applied automatically… covers all Maps Platform APIs." **Google now says:** credit was retired March 1, 2025. Replaced by per-SKU monthly free allowances (10K / 5K / 1K depending on tier). [2]
- **Local says:** $200 covers "~28,500 Dynamic Maps loads / 40,000 Directions / 10,000 Place Details." **Google now says:** these rollups no longer apply; each SKU has its own independent free cap.
- **Local says:** Routes tiers are "Compute Routes Basic / Advanced / Preferred" priced at $5 / $10 / $15. **Google now says:** "Compute Routes Essentials / Pro / Enterprise" at $5 / $10 / $15 (same price points, different names — and different free-allowance caps per tier). [3]
- **Local says:** "Basic = TRAFFIC_UNAWARE, Advanced = TRAFFIC_AWARE, Preferred = TRAFFIC_AWARE_OPTIMAL". This routing-preference mapping is legacy terminology; writer should verify whether the current Routes API still exposes the same three preferences with the same names, or whether they map to the Essentials/Pro/Enterprise SKUs differently. Likely still accurate functionally but SKU labels must change.
- **Local says:** Places SKU list has Place Details (Basic/Contact/Atmosphere), Find Place, Nearby Search, Text Search each at flat prices. **Google now says:** Places API is tiered — Place Details Essentials ($5) / Pro ($17) / Enterprise ($20); Text Search Pro ($32) / Enterprise ($35); Nearby Search Pro ($32) / Enterprise ($35). The old Basic/Contact/Atmosphere field-group model is gone; modern Places API (New) uses **field masks** to select fields, and the tier is chosen by which SKU the field mask triggers. [1]
- **Local says:** Flat per-1,000 pricing. **Google now says:** 5-band volume discount curve (0–100K, 100K–500K, 500K–1M, 1M–5M, 5M+) applies to almost every SKU. [1]
- **Local is missing:** Maps Embed (unlimited/free), Street View Metadata (free), Autocomplete Session Usage (free), Aerial View, Address Validation, Fleet Routing, Navigation Request, Roads API SKUs, Pollen/Weather/Air Quality APIs.
- **Preserve from local:** session-token optimization advice for Autocomplete (still correct and still a major cost lever); field-mask advice (now more important, since it determines which tiered SKU fires); 30-day caching note; quota-cap + budget-alert workflow (still Google's recommended pattern per [2]).

## Open questions

- Exact intermediate-band prices (100K–500K, 500K–1M, 1M–5M) for several Pro and Enterprise SKUs weren't returned in full by the fetch. Writer should pull [1] once more at publish time and fill in. The outer bookends are confirmed.
- The `/maps/billing-and-pricing/faqs` URL from the original instructions returns 404. If a formal FAQ exists, it's not at that path. Overview page carries the canonical change statement.
- The original instructions cited "Feb 28, 2025" as the cutover date. Google's own copy says **March 1, 2025**. Treat March 1 as authoritative.
- Subscription SKU pricing and terms live on separate pages (`/subscriptions`, `/subscription-terms`) — out of scope for this brief unless the writer wants to add a subscriptions section.
- India has a separate price list — flag in the rewritten file that global pricing does not apply to India.

## Recommended source_url for the updated file

`https://developers.google.com/maps/billing-and-pricing/pricing`

(It carries the SKU tables, free caps, and volume bands — the densest single citation surface. The overview page is a good secondary citation for the March 1, 2025 change statement.)
