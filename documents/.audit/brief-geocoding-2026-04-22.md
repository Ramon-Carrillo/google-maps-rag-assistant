# Brief: Geocoding API

- **Fetch date:** 2026-04-22
- **Scope:** Standalone `geocoding.md` — content currently misfiled inside `routes-api.md` will be removed; treat as greenfield.
- **Recommended `source_url`:** `https://developers.google.com/maps/documentation/geocoding/overview`

## Primary sources (Google only)

- https://developers.google.com/maps/documentation/geocoding
- https://developers.google.com/maps/documentation/geocoding/overview
- https://developers.google.com/maps/documentation/geocoding/requests-geocoding
- https://developers.google.com/maps/documentation/geocoding/requests-reverse-geocoding
- https://developers.google.com/maps/documentation/javascript/geocoding
- https://developers.google.com/maps/billing-and-pricing/pricing

## Current reality (as of 2026-04-22)

### 1. Canonical name and scope
- **Official name:** "Geocoding API." Still the current canonical product name.
- **Versioning:** Version 4 is **generally available**; v3 documentation remains maintained and is the basis of the widely deployed REST endpoint (`/maps/api/geocode/json`).
- **Scope:** A single unified service covering:
  - **Forward geocoding** — address (or plus code) → lat/lng + Place ID
  - **Reverse geocoding** — lat/lng (or Place ID) → formatted address + components
- **SKU structure:** No separate forward/reverse SKUs. Both operations bill against a single "Geocoding" SKU per request.

### 2. Pricing (0–100K band)
- **Tier:** **Essentials**
- **Price:** **$5.00 per 1,000 events** in the 0–100,000 monthly events band
- **Free cap:** 10,000 events/month included in the Essentials free usage allotment
- **For comparison (Pro tier, same band):** Address Validation is **$17.00 per 1,000** — ~3.4x the cost of Geocoding

### 3. Forward geocoding — minimal REST example

Endpoint:
```
https://maps.googleapis.com/maps/api/geocode/json
```

Request:
```
GET https://maps.googleapis.com/maps/api/geocode/json
  ?address=1600+Amphitheatre+Parkway,+Mountain+View,+CA
  &key=YOUR_API_KEY
```

Response (trimmed):
```json
{
  "results": [
    {
      "formatted_address": "1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA",
      "geometry": {
        "location": { "lat": 37.4222804, "lng": -122.0843428 }
      },
      "place_id": "ChIJRxcAvRO7j4AR6hm6tys8yA8"
    }
  ],
  "status": "OK"
}
```

Note: unlike Routes/Places v1, the Geocoding REST API does **not** use a `X-Goog-FieldMask` header. Responses are complete by default; trim client-side.

### 4. Reverse geocoding — minimal REST example

Request:
```
GET https://maps.googleapis.com/maps/api/geocode/json
  ?latlng=40.714224,-73.961452
  &key=YOUR_API_KEY
```

Key response fields:
- `formatted_address` — e.g. `"277 Bedford Avenue, Brooklyn, NY 11211, USA"`
- `address_components[]` — each with `long_name`, `short_name`, `types`
- `geometry.location` / `geometry.location_type` (`ROOFTOP`, `RANGE_INTERPOLATED`, `GEOMETRIC_CENTER`, `APPROXIMATE`)
- `place_id`
- `types` (e.g. `street_address`)
- `plus_code`

You can also pass `place_id=...` instead of `latlng` for Place ID → address lookups.

### 5. JavaScript usage (Maps JS Geocoder)

`google.maps.Geocoder` **remains the recommended** client-side path for geocoding in the Maps JavaScript API. It has **not** been superseded by the `Place` class — Places API solves a different problem (business details / POI search), and Google's docs treat them as complementary (you can feed a Places `placeId` into `Geocoder` to resolve an address).

```javascript
const geocoder = new google.maps.Geocoder();

// Forward
geocoder.geocode({ address: "1600 Amphitheatre Parkway, Mountain View, CA" })
  .then(({ results }) => console.log(results[0].geometry.location));

// Reverse
geocoder.geocode({ location: { lat: 37.423021, lng: -122.083739 } })
  .then(({ results }) => console.log(results[0].formatted_address));
```

The Geocoding API must be enabled in the Google Cloud project; JS Geocoder calls bill against the same Geocoding SKU.

### 6. Decision rule — Geocoding vs Places Text Search vs Address Validation

| Use case | Pick |
|---|---|
| User types a **street address**; you need lat/lng or a canonical formatted address | **Geocoding API** (forward) — $5 / 1K |
| Map click or GPS fix; you need a human-readable address | **Geocoding API** (reverse) — $5 / 1K |
| User types a **business name, category, or fuzzy POI** ("coffee near me", "Google HQ") | **Places API — Text Search / Autocomplete** (Pro tier) |
| You need to confirm an address is **deliverable/mailable**, fix typos, flag missing unit numbers, or validate for checkout/shipping | **Address Validation API** (Pro, $17 / 1K) |
| You already have a `place_id` and want the address | **Geocoding API** with `place_id=` param |

Rule of thumb: **Geocoding answers "where is this address on the map?"**; **Places answers "what's there / which place did the user mean?"**; **Address Validation answers "is this address real and mailable?"**

### 7. Common errors (top-level `status` values)

- `OK` — success, at least one result
- `ZERO_RESULTS` — parse succeeded, no match (non-existent address, over-constrained `components` filter, or lat/lng in the ocean)
- `OVER_QUERY_LIMIT` — over QPS/daily quota
- `OVER_DAILY_LIMIT` — API key missing/invalid, billing disabled, usage cap hit, or invalid payment method
- `REQUEST_DENIED` — request rejected (typically API not enabled on the project, or referrer/IP restriction mismatch)
- `INVALID_REQUEST` — `address`, `components`, or `latlng` missing
- `UNKNOWN_ERROR` — transient server error; retry with backoff

Default quota: **25 QPS** out of the box.

### 8. Place IDs in geocoding results

Every geocode result carries a `place_id` (opaque string, e.g. `ChIJRxcAvRO7j4AR6hm6tys8yA8`). Key properties:

- **Stable identifier** for a location across Google Maps Platform products.
- **Reverse lookup:** pass it back to Geocoding as `place_id=...` to get a fresh formatted address.
- **Hand-off to Places:** use the same `place_id` with Places API (Place Details) to fetch business info, hours, reviews, photos — billed on the Places SKU, not Geocoding.
- **Good pattern for RAG/agent flows:** geocode once, persist `place_id` + lat/lng, re-resolve only when the user needs live Places metadata.

(See Places API brief for downstream usage; do not duplicate that surface here.)

## Writer notes

- File target: `documents/geocoding.md`.
- Remove Geocoding content from `routes-api.md` once this file exists (mapper flagged).
- Recommended `source_url` frontmatter value: `https://developers.google.com/maps/documentation/geocoding/overview`.
- Cross-link: `places-api.md` (Place IDs, Text Search alternative), `address-validation.md` (validation decision rule), `billing-and-pricing.md` (Essentials tier confirmation).
