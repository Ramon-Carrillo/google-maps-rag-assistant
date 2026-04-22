---
title: Address Validation API
source_url: https://developers.google.com/maps/documentation/address-validation
---

# Address Validation API

## Overview

The Address Validation API validates addresses for **correctness** — a distinct job from Geocoding, which converts addresses into coordinates. Validation performs three things Geocoding does not: it **corrects** misspelled or partial components, **completes** missing components (e.g., inferring ZIP+4 or a subpremise), and **formats** the result into a standardized postal form. It returns a deliverability verdict, per-component confirmation levels, and — for US/PR addresses — USPS CASS data.

The canonical use case is **checkout**: a shopper submits a shipping or billing address, and before you charge the card and hand the order to a carrier, you want to know whether the address is real, complete, and deliverable. Geocoding will happily return coordinates for a partially-matched address; Address Validation will tell you that the address is unconfirmed and give you a structured signal for how to respond in the UI.

> **Warning — server-side only.** The Address Validation API key is **not safely exposable in browser JavaScript**. Unlike the Maps JS API key, it does not have an equivalent referrer/CORS-based protection model. Call `v1:validateAddress` from your server (Route Handler, edge function, backend service) only. Never ship this key to the client.

## Pricing

At the 0–100K monthly call band:

| SKU | Price per 1,000 calls |
|---|---|
| Address Validation Pro | **$17.00** |
| Address Validation Enterprise | **$25.00** |

The Enterprise differentiator is **USPS CASS™** certification for US/PR addresses, enabled by setting `enableUspsCass: true` on the request. Enterprise populates the `uspsData` response block (DPV confirmation, carrier route, delivery point). Pro returns the verdict, address, geocode, and metadata but not the USPS-certified delivery fields. CASS is **US and Puerto Rico only**; setting `enableUspsCass: true` for other regions is meaningless.

For volume-tier discounts above 100K calls, see [`billing-and-pricing.md`](./billing-and-pricing.md).

## Coverage

Address Validation supports **35 countries/regions** — it is **not US-only**:

- **Americas:** Argentina, Brazil, Canada, Chile, Colombia, Mexico, Puerto Rico, United States
- **Europe:** Austria, Belgium, Bulgaria, Croatia, Czechia, Denmark, Estonia, Finland, France, Germany, Hungary, Ireland, Italy, Latvia, Lithuania, Luxembourg, Netherlands, Norway, Poland, Portugal, Slovakia, Slovenia, Spain, Sweden, Switzerland, United Kingdom
- **Asia-Pacific:** Australia, India (preview), Japan (preview), Malaysia, New Zealand, Singapore

Dependent territories with unique CLDR codes — notably **US Virgin Islands (VI)** — are **not supported**, even though their parent country is. India and Japan are in preview; treat their results as best-effort.

## Request format

**Endpoint:**

```
POST https://addressvalidation.googleapis.com/v1:validateAddress?key=API_KEY
Content-Type: application/json
```

**Minimal request body:**

```json
{
  "address": {
    "regionCode": "US",
    "addressLines": ["1600 Amphitheatre Pkwy", "Mountain View, CA, 94043"]
  },
  "enableUspsCass": true
}
```

- `address.addressLines` — **required**; must contain at least one entry.
- `address.regionCode` — strongly recommended (ISO 3166-1 alpha-2).
- `enableUspsCass` — optional; only meaningful for US/PR. Triggers the Enterprise SKU.

## Response interpretation

This is the section developers actually code against. The API returns a `result.verdict` block whose fields drive your UX branching.

**`verdict.possibleNextAction`** — Google's explicit UX recommendation:

- `"ACCEPT"` — use the address as-is.
- `"CONFIRM"` — show the corrected/inferred address to the user and ask them to confirm.
- `"CONFIRM_ADD_SUBPREMISES"` — an apartment/unit is missing; prompt the user to add it.
- `"FIX"` — the address cannot be validated; ask the user to re-enter.

**`verdict.validationGranularity`** — how deep validation succeeded:

- `"SUB_PREMISE"`
- `"PREMISE"`
- `"PREMISE_PROXIMITY"`
- `"BLOCK"`
- `"ROUTE"`
- `"OTHER"`

**`verdict.addressComplete`** — boolean; `true` means no missing or unresolved components.

**`verdict.hasUnconfirmedComponents`** — boolean; `true` if at least one component could not be verified.

**`verdict.hasInferredComponents`** — boolean; `true` if the API filled in something the user did not provide.

**`addressComponents[].confirmationLevel`** — per-component verdict:

- `"CONFIRMED"` — verified against reference data.
- `"UNCONFIRMED_BUT_PLAUSIBLE"` — not verified but reasonable.
- `"UNCONFIRMED_AND_SUSPICIOUS"` — not verified and looks wrong.

**`uspsData.dpvConfirmation`** (US/PR only):

- `"Y"` — address matched in USPS DB.
- `"S"` — primary number matched, secondary (unit) expected but not matched.
- `"N"` — issue with the address.
- empty — not available.

**Full example response:**

```json
{
  "result": {
    "verdict": {
      "inputGranularity": "PREMISE",
      "validationGranularity": "PREMISE",
      "geocodeGranularity": "PREMISE",
      "addressComplete": true,
      "possibleNextAction": "ACCEPT"
    },
    "address": {
      "formattedAddress": "1600 Amphitheatre Pkwy, Mountain View, CA 94043-1351, USA",
      "addressComponents": [
        {
          "componentName": { "text": "1600", "languageCode": "en" },
          "componentType": "street_number",
          "confirmationLevel": "CONFIRMED"
        }
      ]
    },
    "geocode": {
      "location": { "latitude": 37.42, "longitude": -122.08 },
      "placeId": "..."
    },
    "metadata": { "business": true, "poBox": false, "residential": false },
    "uspsData": {
      "dpvConfirmation": "Y",
      "standardizedAddress": { "firstAddressLine": "1600 AMPHITHEATRE PKWY" }
    }
  },
  "responseId": "..."
}
```

**Accept rule of thumb:** `possibleNextAction === "ACCEPT"` AND `addressComplete === true` AND `validationGranularity` is `"PREMISE"` or `"SUB_PREMISE"`. Anything else → branch to a confirm-or-fix UX.

## Integration pattern: validate-on-submit

The documented checkout flow:

1. User fills the address fields and submits the form.
2. Your server (never the browser) calls `POST v1:validateAddress`.
3. Branch on `result.verdict.possibleNextAction`:
   - `"ACCEPT"` → proceed to payment.
   - `"CONFIRM"` → render a modal: "Did you mean [formattedAddress]?" with **Use suggested** / **Keep mine** buttons.
   - `"CONFIRM_ADD_SUBPREMISES"` → highlight the apt/unit field as required and re-prompt.
   - `"FIX"` → inline error; surface any `UNCONFIRMED_AND_SUSPICIOUS` components so the user knows what looks wrong.
4. Store `responseId` and the accepted address on the order record for audit.

Validate **once, at submit**. Do not validate on blur or on every keystroke — per-call pricing makes that wasteful, and the API is designed around a complete address payload, not per-field probes.

## Decision rule: Validation vs Geocoding vs Autocomplete

| Scenario | Use |
|---|---|
| User is typing, show suggestions | **Places Autocomplete** — see [`places-api.md`](./places-api.md) |
| User submitted a final address, confirm it's real and deliverable | **Address Validation** (this API) |
| You have a stored/known-good address and just need lat/lng | **Geocoding** — see [`geocoding.md`](./geocoding.md) |
| US shipping, need USPS-certified standardization | **Address Validation Enterprise** (`enableUspsCass: true`) |
| Bulk geocode a CSV of customer addresses for analytics | **Geocoding** (cheaper, coordinate-focused) |

**Rule:** Autocomplete during input, Validation at submit, Geocoding for coordinate-only jobs. Never validate-on-blur.

## Common pitfalls

- **Server-side only.** The Address Validation key cannot be safely exposed in browser JavaScript. Call it from a Route Handler, edge function, or backend service. Do not ship it to the client.
- **Not available everywhere.** 35 countries only; India and Japan are in preview. Do not assume coverage outside the supported list.
- **CASS is US/PR only.** Sending `enableUspsCass: true` for other regions does nothing useful and still incurs the Enterprise price.
- **Dependent territories are excluded** — notably US Virgin Islands (VI) — even where the parent country is supported.
- **Unusually-formatted addresses** (rural, military APO/FPO, new construction) often return `hasUnconfirmedComponents: true` even when correct. Design the `CONFIRM` branch so the user can override with a "keep as entered" option.
- **Cost at scale.** At $17/1K Pro, 100K checkouts/month = $1,700. Validate-on-submit once, never on keystroke or blur.
- **Malformed input.** `addressLines` must contain at least one entry. Empty arrays return a `400 INVALID_ARGUMENT`.
- **Quota.** Standard Google Maps Platform per-minute and per-day limits apply; review Cloud Console quotas before launch spikes.
