---
title: Geocoding API
source_url: https://developers.google.com/maps/documentation/geocoding
---

# Geocoding API

The **Geocoding API** is Google Maps Platform's service for translating between street addresses and geographic coordinates. The canonical product name is still "Geocoding API," and a single unified SKU covers both directions of the conversion.

## Overview

A single service with two operations, billed under one SKU:

- **Forward geocoding** — address (or plus code) to latitude/longitude plus a stable `place_id`.
- **Reverse geocoding** — latitude/longitude (or `place_id`) to a formatted address and structured address components.

Both operations bill against the same "Geocoding" SKU per request — there is no separate forward/reverse pricing.

## Pricing

- **Tier:** Essentials
- **Price:** **$5.00 per 1,000 events** in the 0–100,000 monthly events band
- **Free cap:** 10,000 events/month included in the Essentials free usage allotment
- **Default quota:** **25 QPS** out of the box

For the full volume-discount tables and cross-tier comparisons, see [`billing-and-pricing.md`](./billing-and-pricing.md). For reference, the Pro-tier Address Validation API costs **$17.00 per 1,000** in the same band — roughly 3.4x the cost of Geocoding — which matters when you pick between them (see the decision rule below).

## Forward geocoding

Convert an address string to coordinates and a Place ID.

### REST

```bash
GET https://maps.googleapis.com/maps/api/geocode/json
  ?address=1600+Amphitheatre+Parkway,+Mountain+View,+CA
  &key=YOUR_API_KEY
```

Trimmed response:

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

Unlike Routes API and Places API v1, the Geocoding REST API does **not** use an `X-Goog-FieldMask` header — responses are complete by default and you trim them client-side.

### JavaScript

```javascript
const geocoder = new google.maps.Geocoder();

geocoder
  .geocode({ address: "1600 Amphitheatre Parkway, Mountain View, CA" })
  .then(({ results }) => {
    console.log(results[0].geometry.location);
  });
```

## Reverse geocoding

Convert coordinates (or a Place ID) to a human-readable address.

### REST

```bash
GET https://maps.googleapis.com/maps/api/geocode/json
  ?latlng=40.714224,-73.961452
  &key=YOUR_API_KEY
```

Key response fields:

- `formatted_address` — e.g. `"277 Bedford Avenue, Brooklyn, NY 11211, USA"`
- `address_components[]` — each with `long_name`, `short_name`, and `types`
- `geometry.location` and `geometry.location_type` — one of `ROOFTOP`, `RANGE_INTERPOLATED`, `GEOMETRIC_CENTER`, `APPROXIMATE`
- `place_id`
- `types` — e.g. `street_address`
- `plus_code`

You can also pass `place_id=...` instead of `latlng` for a Place ID to address lookup.

### JavaScript

```javascript
geocoder
  .geocode({ location: { lat: 40.714224, lng: -73.961452 } })
  .then(({ results }) => {
    console.log(results[0].formatted_address);
  });
```

## JS Geocoder

`google.maps.Geocoder` **remains the recommended** client-side path for geocoding in the Maps JavaScript API. It has **not** been superseded by the `Place` class — the Places API solves a different problem (business details and POI search), and Google's docs treat the two as complementary. You can, for example, take a `placeId` you obtained from Places and feed it into `Geocoder` to resolve an address.

```typescript
const geocoder = new google.maps.Geocoder();

// Forward
const { results: forward } = await geocoder.geocode({
  address: "1600 Amphitheatre Parkway, Mountain View, CA",
});
console.log(forward[0].geometry.location);

// Reverse
const { results: reverse } = await geocoder.geocode({
  location: { lat: 37.423021, lng: -122.083739 },
});
console.log(reverse[0].formatted_address);
```

The Geocoding API must be enabled on the Google Cloud project. JS Geocoder calls bill against the same Geocoding SKU as REST calls.

## Status codes

Top-level `status` values returned by the Geocoding API:

- `OK` — success, at least one result returned
- `ZERO_RESULTS` — the parse succeeded but nothing matched (non-existent address, over-constrained `components` filter, or lat/lng in the ocean)
- `OVER_QUERY_LIMIT` — over the QPS or daily quota
- `OVER_DAILY_LIMIT` — API key missing or invalid, billing disabled, usage cap hit, or invalid payment method
- `REQUEST_DENIED` — request rejected (API not enabled on the project, or referrer/IP restriction mismatch)
- `INVALID_REQUEST` — `address`, `components`, or `latlng` is missing
- `UNKNOWN_ERROR` — transient server error; retry with backoff

## Decision rule: Geocoding vs Places vs Address Validation

This is the rule that matters when a developer is picking an API. The three products overlap superficially but answer different questions:

- **"Where is this address?"** → **Geocoding API**. Forward or reverse, $5/1K. Use when you have or want a canonical postal address and need coordinates, or vice versa.
- **"What place did the user mean?"** → **Places API — Text Search / Autocomplete**. Pro tier. Use for fuzzy queries like "coffee near me" or "Google HQ" — anything that's a business name, category, or POI rather than a street address.
- **"Is this address mailable?"** → **Address Validation API**. Pro tier, $17/1K. Use at checkout or shipping to confirm deliverability, fix typos, flag missing unit numbers, or standardize for a carrier.

| Use case | Pick |
|---|---|
| User types a street address; you need lat/lng or a canonical formatted address | **Geocoding API** (forward) |
| Map click or GPS fix; you need a human-readable address | **Geocoding API** (reverse) |
| User types a business name, category, or fuzzy POI | **Places API — Text Search / Autocomplete** |
| You need to confirm an address is deliverable for checkout or shipping | **Address Validation API** |
| You already have a `place_id` and want the address | **Geocoding API** with `place_id=` param |

## Place IDs

Every geocode result carries a `place_id` — an opaque string (e.g. `ChIJRxcAvRO7j4AR6hm6tys8yA8`) that is the stable identifier for a location across Google Maps Platform products.

Key properties and patterns:

- **Stable identifier.** The same `place_id` is accepted by Geocoding, Places, Routes, and other GMP services.
- **Reverse lookup.** Pass it back to Geocoding as `place_id=...` to get a fresh formatted address.
- **Hand-off to Places.** Use the same `place_id` with Places API (Place Details) to fetch business info, hours, reviews, or photos. That call bills on the Places SKU, not Geocoding.
- **Persist as a foreign key.** For RAG and agent flows, a good pattern is: geocode once, persist `place_id` + lat/lng in your own store, and re-resolve to Places only when the user needs live business metadata. This keeps Geocoding spend bounded and avoids re-paying Places prices for data you've already cached.

For downstream Places usage, see the Places API document; this file intentionally does not duplicate that surface.
