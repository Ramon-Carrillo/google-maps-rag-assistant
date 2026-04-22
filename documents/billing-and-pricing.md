---
title: Google Maps Platform Billing and Pricing
source_url: https://developers.google.com/maps/billing-and-pricing/pricing
---

# Google Maps Platform Billing and Pricing

Google Maps Platform uses a pay-as-you-go pricing model with per-SKU monthly free allowances and an automatic five-step volume discount curve. A flat-fee subscription model is also available for teams that prefer a predictable monthly bill.

> **Note:** Google retired the $200 monthly credit on March 1, 2025 and replaced it with per-SKU free tiers. If your code, dashboards, or internal docs still reference a "$200 credit," they are out of date. See the Pricing model section below.

## Pricing model

Two billing models coexist:

- **Pay-as-you-go** (default): per-event billing, with free monthly allowances applied first and volume discounts applied automatically above 100K events.
- **Subscriptions**: a fixed monthly fee for a preset number of calls. Useful when you want a hard ceiling on spend or predictable line-item costs.

Every SKU now belongs to one of three price categories — **Essentials**, **Pro**, or **Enterprise** — and the category determines both the monthly free allowance and the shape of the volume-discount curve.

> Global pricing does not apply in India. India has its own price list at `/maps/billing-and-pricing/pricing-india`.

## SKU tiers: Essentials, Pro, Enterprise

| Tier | What it means | Free events / month (per SKU) |
|---|---|---|
| **Essentials** | Core, high-volume SKUs: base maps, geocoding, routing without traffic, basic autocomplete. | 10,000 |
| **Pro** | Richer data or traffic-aware responses: Places Pro details, Text/Nearby Search Pro, Routes Pro, Aerial View. | 5,000 |
| **Enterprise** | Advanced-data and logistics SKUs: Places Enterprise, Routes Enterprise, Fleet Routing, Navigation. | 1,000 |

Tier assignment is fixed per SKU by Google. You do not pick the tier — it is determined by which API, endpoint, or (for Places) which fields you request. Field masks are therefore a first-order cost lever: the set of fields you ask for decides which SKU tier fires.

## Free allowance

- Each SKU gets its own monthly free allowance based on its tier (10K / 5K / 1K).
- Free usage **resets on the first day of each month at midnight Pacific Time**.
- Unused free usage does not roll over.
- Allowances apply per billing account (not per project) and per SKU (not per API family).

### Unlimited / no-charge SKUs

These SKUs are free with no per-1,000 rate:

- **Maps Embed** (Embed and Embed Advanced were merged into this single SKU)
- **Maps SDK** (Mobile Native Static Maps and Mobile Native Dynamic Maps merged here)
- **Street View Metadata**
- **Autocomplete Session Usage** (the session itself — the per-request Autocomplete Requests SKU is still billable)
- **Place Details (IDs Only)**

## Volume discounts

Once a SKU's free allowance is consumed, billed events fall into five monthly bands. Each band drops the per-1,000 rate:

| Band | Monthly billable events |
|---|---|
| 1 | 0 – 100,000 |
| 2 | 100,000 – 500,000 |
| 3 | 500,000 – 1,000,000 |
| 4 | 1,000,000 – 5,000,000 |
| 5 | 5,000,000+ |

### Worked example — Dynamic Maps (Essentials)

| Band | Price per 1,000 |
|---|---|
| 0 – 100K | $7.00 |
| 100K – 500K | $5.60 |
| 500K – 1M | $4.20 |
| 1M – 5M | $2.10 |
| 5M+ | $0.53 |

Additional discretionary enterprise discounts may apply above 10,000,000 monthly billable events on at least one paid core-services SKU. Contact Google sales.

## Per-API pricing

All prices are USD per 1,000 requests, applied after the free allowance is consumed. See the canonical table at the `source_url` for any SKU not listed below or for intermediate bands not shown here.

### Essentials tier (10,000 free / month / SKU)

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

### Pro tier (5,000 free / month / SKU)

| SKU | 0–100K | 5M+ |
|---|---|---|
| Dynamic Street View | $14.00 | $1.05 |
| Aerial View | $16.00 | $1.20 |
| Address Validation Pro | $17.00 | $1.28 |
| Place Details Pro | $17.00 | $1.28 |
| Text Search Pro | $32.00 | $2.40 |
| Nearby Search Pro | $32.00 | $2.40 |
| Compute Routes Pro | $10.00 | $0.75 |
| Compute Route Matrix Pro | $10.00 | $0.75 |
| Roads — Nearest Road | $10.00 | $0.76 |
| Roads — Route Traveled | $10.00 | $0.76 |
| Roads — Speed Limits | $20.00 | $12.00 |

Intermediate bands (100K–500K, 500K–1M, 1M–5M) are not reproduced here for every Pro SKU. See the current pricing table at <https://developers.google.com/maps/billing-and-pricing/pricing>.

### Enterprise tier (1,000 free / month / SKU)

| SKU | 0–100K | 5M+ |
|---|---|---|
| Place Details Enterprise | $20.00 | $1.51 |
| Text Search Enterprise | $35.00 | $2.63 |
| Nearby Search Enterprise | $35.00 | $2.63 |
| Compute Routes Enterprise | $15.00 | $1.14 |
| Compute Route Matrix Enterprise | $15.00 | $1.14 |
| Fleet Routing | $30.00 | $2.10 |
| Navigation Request | $25.00 | $2.00 |

Intermediate bands for Enterprise SKUs: see current pricing table at <https://developers.google.com/maps/billing-and-pricing/pricing>.

### Routes SKU rename (important)

The older Routes labels **Compute Routes Basic / Advanced / Preferred** no longer exist. They were renamed to:

| Old name | New name | 0–100K price |
|---|---|---|
| Compute Routes Basic | Compute Routes **Essentials** | $5.00 / 1K |
| Compute Routes Advanced | Compute Routes **Pro** | $10.00 / 1K |
| Compute Routes Preferred | Compute Routes **Enterprise** | $15.00 / 1K |

The same rename applies to Compute Route Matrix (Basic/Advanced/Preferred → Essentials/Pro/Enterprise). Price points match, but each tier now carries its own free allowance (10K / 5K / 1K) and its own volume curve. If your code or docs still reference `Basic`/`Advanced`/`Preferred` by name, update them.

### Places API tiering

Places API SKUs are split across all three tiers, and the tier fired by a request is driven by the **field mask**:

- `Place Details Essentials` ($5/1K) — IDs and basic location fields.
- `Place Details Pro` ($17/1K) — contact and address details.
- `Place Details Enterprise` ($20/1K) — atmosphere, reviews, opening hours.
- `Text Search` and `Nearby Search` — Pro ($32/1K) and Enterprise ($35/1K) only.

Requesting an Enterprise-tier field in a field mask promotes the entire request to the Enterprise SKU. Keep field masks minimal.

## Cost controls

Google's recommended pattern has three layers. Budget alerts warn you; quota caps hard-stop traffic; subscriptions bound the bill up front.

### 1. Budget alerts (notification only)

Cloud Console → **Billing → Budgets & alerts → Create budget**. Set thresholds at 50%, 90%, 100%. Budget alerts email the billing admin but **do not stop API usage** — they are a notification mechanism only.

### 2. Quota caps (hard stop)

Cloud Console → **APIs & Services → Google Maps Platform → [select API] → Quotas & System Limits**. Set a daily request cap. Requests over the cap fail with:

```json
{
  "status": "OVER_QUERY_LIMIT",
  "error_message": "You have exceeded your daily request quota for this API."
}
```

This is the only native mechanism that actually prevents cost overruns from runaway traffic.

### 3. Subscriptions (predictable ceiling)

If pay-as-you-go is too volatile, switch to a **Subscription** — a fixed monthly fee for a set number of calls. Useful for finance teams that need a single forecastable line item. See `/maps/billing-and-pricing/subscriptions`.

### Session tokens for Autocomplete

Always attach a session token to Autocomplete requests. Without one, every keystroke is billed as a separate Autocomplete Requests event. With a token, the entire autocomplete session plus the final Place Details call is billed as one session:

```javascript
const token = new google.maps.places.AutocompleteSessionToken();
// Attach `token` to every autocomplete request for this user,
// then pass the same token to the final Place Details fetch.
```

### Field masks

For Places API (New) and Routes API, specify the minimum fields you need. The field mask selects the SKU tier:

```javascript
// Bad — may promote this request to Place Details Enterprise
await place.fetchFields({ fields: ["*"] });

// Good — stays on Place Details Essentials
await place.fetchFields({ fields: ["displayName", "location"] });
```

### Caching

Per Google's Terms of Service, geocoding and certain place data may be cached for up to 30 days (check the current ToS for exact fields and limits). Cache aggressively on your server for user-stable queries.

## Common pitfalls

- **Assuming the $200 credit still exists.** It was retired on March 1, 2025. Budgets and forecasts built around the $200 ceiling will understate spend at any non-trivial volume.
- **Treating free allowances as a single pool.** Each SKU has its own allowance — 10K Dynamic Maps loads do not come out of the same bucket as 10K Geocoding calls. You can consume every tier's free allowance simultaneously.
- **Searching for "Compute Routes Preferred" and not finding it.** The SKU is now **Compute Routes Enterprise**. Same for Advanced → Pro and Basic → Essentials.
- **Over-broad Places field masks.** Requesting `*` or atmosphere fields promotes the call to Place Details Enterprise ($20/1K). A minimal mask keeps you on Essentials ($5/1K) — a 4x cost difference.
- **Budget alerts mistaken for quota caps.** Budget alerts only send email. Only Quotas & System Limits actually stop traffic.
- **Forgetting that `Autocomplete Session Usage` is free, but `Autocomplete Requests` is not.** The session wrapper is free; the keystroke-level requests inside it are still billable if you skip session tokens.
- **Applying global prices to Indian traffic.** India has its own separate price list.

## Billing account requirements

- A valid billing account must be linked to your Google Cloud project.
- A credit card or bank account is required even if your usage stays inside the free allowances.
- APIs stop working if the billing account is suspended or the payment method fails.
- A project without a billing account surfaces `BillingNotEnabledMapError` in the Maps JavaScript API.

## Monitoring usage

Cloud Console → **Google Maps Platform → Metrics**:

1. Request counts, error rates, and latency per API and per SKU.
2. Billing dashboard: current-month charges broken out by SKU, with free-allowance usage shown separately.
3. Reports are the correct place to verify which tier your Places / Routes calls are actually hitting — if a request you expected to bill as Essentials is showing up under Pro or Enterprise, your field mask is too broad.
