# Brief: Address Validation API

**Fetch date:** 2026-04-22
**Sources:** Google Maps Platform official docs only
**Purpose:** Drive `/documents/address-validation.md` — close P1 RAG corpus gap for checkout/address use cases.

---

## 1. What Address Validation does (vs Geocoding)

Google states the distinction directly:

> "The Geocoding API **converts** addresses into latitude and longitude coordinates. The Address Validation API validates addresses for **correctness.**"
> — https://developers.google.com/maps/documentation/address-validation/overview

Address Validation performs three functions Geocoding does not: **correcting** misspelled/partial components, **completing** missing components (e.g., inferring ZIP+4 or subpremise), and **formatting** to a standardized postal form. It returns a verdict of whether the address is deliverable, plus component-level confirmation levels, plus USPS CASS data for US/PR addresses. Geocoding will happily return coordinates for a partially-matched address; Validation will tell you that address is unconfirmed.

---

## 2. Pricing — Pro vs Enterprise

At the 0–100K monthly call band (source: https://developers.google.com/maps/billing-and-pricing/pricing):

| SKU | Price per 1,000 calls |
|---|---|
| Address Validation Pro | **$17.00** |
| Address Validation Enterprise | **$25.00** |

**Enterprise adds** USPS CASS™ certification for US/PR addresses (`enableUspsCass: true`), which populates the `uspsData` response block with DPV confirmation, carrier route, and delivery point data. Pro returns the verdict + address + geocode + metadata but not the USPS-certified delivery fields. The pricing page lists the SKUs but does not enumerate the Pro/Enterprise feature delta on that page — the feature split is established by the `enableUspsCass` parameter documented on the request reference.

---

## 3. Coverage

Per the coverage docs, Address Validation supports **35 countries/regions** — it is **not US-only**:

- **Americas:** Argentina, Brazil, Canada, Chile, Colombia, Mexico, Puerto Rico, United States
- **Europe:** Austria, Belgium, Bulgaria, Croatia, Czechia, Denmark, Estonia, Finland, France, Germany, Hungary, Ireland, Italy, Latvia, Lithuania, Luxembourg, Netherlands, Norway, Poland, Portugal, Slovakia, Slovenia, Spain, Sweden, Switzerland, United Kingdom
- **Asia-Pacific:** Australia, India (preview), Japan (preview), Malaysia, New Zealand, Singapore

Google notes: "Address Validation API support is not extended to dependent territories with unique CLDR codes, such as US Virgin Islands (VI)." CASS is US/PR only.

---

## 4. Minimal REST example

**Endpoint** (source: requests-validate-address):

```
POST https://addressvalidation.googleapis.com/v1:validateAddress?key=API_KEY
Content-Type: application/json
```

**Request body:**

```json
{
  "address": {
    "regionCode": "US",
    "addressLines": ["1600 Amphitheatre Pkwy", "Mountain View, CA, 94043"]
  },
  "enableUspsCass": true
}
```

`addressLines` is required and must contain at least one entry. `regionCode` is strongly recommended. `enableUspsCass` is optional and only meaningful for US/PR.

**Sample response shape (verdict block):**

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
    "geocode": { "location": { "latitude": 37.42, "longitude": -122.08 }, "placeId": "..." },
    "metadata": { "business": true, "poBox": false, "residential": false },
    "uspsData": {
      "dpvConfirmation": "Y",
      "standardizedAddress": { "firstAddressLine": "1600 AMPHITHEATRE PKWY" }
    }
  },
  "responseId": "..."
}
```

---

## 5. Verdict interpretation — the enums devs code against

Source: understand-response + build-validation-logic.

**`verdict.possibleNextAction`** (Google's explicit recommendation):

- `ACCEPT` — use the address as-is
- `CONFIRM` — show user the corrected/inferred address, ask them to confirm
- `CONFIRM_ADD_SUBPREMISES` — missing apartment/unit; ask user to add
- `FIX` — address cannot be validated; ask user to re-enter

**`verdict.validationGranularity`** (how deep validation succeeded):

- `SUB_PREMISE`
- `PREMISE`
- `PREMISE_PROXIMITY`
- `BLOCK`
- `ROUTE`
- `OTHER`

**`verdict.addressComplete`** — boolean; `true` means no missing/unresolved components.

**`verdict.hasUnconfirmedComponents`** — boolean; `true` means at least one component the API could not verify.

**`verdict.hasInferredComponents`** — boolean; `true` means the API filled in something the user did not provide.

**`addressComponents[].confirmationLevel`:**

- `CONFIRMED` — verified against reference data
- `UNCONFIRMED_BUT_PLAUSIBLE` — not verified but reasonable
- `UNCONFIRMED_AND_SUSPICIOUS` — not verified and looks wrong

**`uspsData.dpvConfirmation`** (US only):

- `Y` — address matched in USPS DB
- `S` — primary number matched, secondary (unit) expected but not matched
- `N` — issue with the address
- empty — not available

**Accept rule of thumb:** `possibleNextAction == "ACCEPT"` AND `addressComplete == true` AND `validationGranularity` is `PREMISE` or `SUB_PREMISE`. Anything else → branch to confirm/fix UX.

---

## 6. Checkout integration pattern

Google's recommended flow (synthesized from overview + build-validation-logic):

1. User fills address fields and submits.
2. Call `v1:validateAddress` server-side (protect the key).
3. Branch on `possibleNextAction`:
   - `ACCEPT` → proceed to payment.
   - `CONFIRM` → render a modal: "Did you mean [formattedAddress]?" with Use Suggested / Keep Mine.
   - `CONFIRM_ADD_SUBPREMISES` → highlight the unit/apt field as required.
   - `FIX` → inline error; surface the `UNCONFIRMED_AND_SUSPICIOUS` components.
4. Store the `responseId` and the accepted address for order records.

**Validate-on-submit is the documented pattern** — not on-blur. Per-field blur validation burns quota (each call costs $17–$25/1K) and the API is designed for whole-address input. Use **Places Autocomplete** during typing (prediction, cheap) and **Address Validation** once on submit (verification, paid).

---

## 7. Decision rule: Validation vs Geocoding vs Autocomplete

| Scenario | Use |
|---|---|
| User is typing an address, show suggestions | **Places Autocomplete** |
| User submitted a final address, confirm it's real and deliverable | **Address Validation** |
| You have a stored/known-good address and just need lat/lng | **Geocoding** |
| US shipping, need USPS-certified standardization | **Address Validation Enterprise** (`enableUspsCass: true`) |
| Bulk geocode a CSV of customer addresses for analytics | **Geocoding** (cheaper, coordinate-focused) |

Rule: **Autocomplete during input, Validation at submit, Geocoding for coordinate-only jobs.**

---

## 8. Pitfalls

- **Not available everywhere.** 35 countries only; India and Japan are in preview. Do not assume coverage outside the supported list.
- **CASS is US/PR only.** Sending `enableUspsCass: true` for other regions is meaningless.
- **Dependent territories like US Virgin Islands (VI) are not supported.**
- **Unusually-formatted addresses** (rural, military APO/FPO, new construction) often come back with `hasUnconfirmedComponents: true` even when correct — design the UX so the user can override with a "keep as entered" option after `CONFIRM`.
- **Cost at scale.** At $17/1K, 100K checkouts/month = $1,700. Validate-on-submit once, not on every keystroke or blur.
- **Server-side only.** Do not ship the API key in browser JS — unlike Maps JS, this key is not domain-restrictable the same way.
- **Quota.** Standard Google Maps Platform per-minute and per-day limits apply; check Cloud Console quotas before launch spikes.

---

## Sources consulted

- https://developers.google.com/maps/documentation/address-validation/overview
- https://developers.google.com/maps/documentation/address-validation/requests-validate-address
- https://developers.google.com/maps/documentation/address-validation/understand-response
- https://developers.google.com/maps/documentation/address-validation/build-validation-logic
- https://developers.google.com/maps/documentation/address-validation/coverage
- https://developers.google.com/maps/billing-and-pricing/pricing

The `/migrate-from-usps` URL returned 404 on 2026-04-22 — the USPS-replacement angle is covered via `enableUspsCass` in the request reference instead.
