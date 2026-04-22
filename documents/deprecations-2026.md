---
title: Deprecations and Migration Guide
source_url: https://developers.google.com/maps/deprecations
---

# Deprecations and Migration Guide

Google Maps Platform follows a predictable deprecation lifecycle: an item is **announced** on the [deprecations page](https://developers.google.com/maps/deprecations), customers typically get a **12-month notice** before the **sunset/removal date**, and a **replacement** is recommended. Some items are "deprecated" in name (a newer replacement is preferred) but have **no scheduled discontinuation** — existing code continues to work.

This guide covers the **16 active deprecations** currently listed on Google's deprecations page (as of April 2026), plus the **Places API (Legacy)** service-level banner documented separately on the Places overview page.

> **Frequently confused:** The **Directions API is _not_ deprecated.** Google's deprecations page does not list it. The Routes API is the recommended successor for new projects, but Directions API remains generally available with no sunset date. Treat that transition as a "recommended migration," not a deprecation.
>
> Similarly, the **inline `styles` array** on `google.maps.Map` is _not_ on the deprecations page. Only "legacy cloud-based maps styling" was deprecated, and that was already decommissioned on March 25, 2025 (see the "Already decommissioned" section).

---

## Urgent — Sunsets in May 2026

These two Maps JavaScript API libraries have hard removal dates in May 2026. If your app uses them, migrate now.

### 1. Drawing Library → Terra Draw

- **Deprecated item:** `google.maps.drawing` (Drawing Library)
- **Replacement:** [Terra Draw](https://developers.google.com/maps/documentation/javascript/examples/map-drawing-terradraw) — an open-source drawing library with Google Maps adapter
- **Announced:** August 8, 2025
- **Sunset:** May 2026
- **Google's status language:** "will no longer be supported"
- **Migration guide:** https://developers.google.com/maps/documentation/javascript/examples/map-drawing-terradraw

### 2. Heatmap Layer → deck.gl HeatmapLayer

- **Deprecated item:** `google.maps.visualization.HeatmapLayer`
- **Replacement:** [`deck.gl` `HeatmapLayer`](https://deck.gl/docs/api-reference/aggregation-layers/heatmap-layer)
- **Announced:** May 27, 2025
- **Sunset:** May 2026
- **Google's status language:** "will no longer be supported"

---

## Maps JavaScript API (other active deprecations)

### `google.maps.Marker` → `AdvancedMarkerElement`

- **Deprecated item:** `google.maps.Marker`
- **Replacement:** `AdvancedMarkerElement` (from the `marker` library)
- **Announced:** February 2024
- **Sunset:** **Not scheduled to be discontinued** — Google explicitly states this. Existing `Marker` code continues to work.
- **Google's status language:** "not scheduled to be discontinued"; AdvancedMarkerElement is "recommended over" Marker for new code
- **Migration guide:** https://developers.google.com/maps/documentation/javascript/advanced-markers/migration

```javascript
// RECOMMENDED for new code (google.maps.Marker still works)
const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
const marker = new AdvancedMarkerElement({
  position: { lat: 40.7128, lng: -74.0060 },
  map, // Map must be constructed with a mapId
  title: "NYC",
});
```

AdvancedMarkerElement requires a `mapId` on the Map, and custom icons use HTML `content` instead of the `icon` property.

### `google.maps.event.addDomListener()` / `addDomListenerOnce()` → `addEventListener()`

- **Deprecated item:** `google.maps.event.addDomListener()` and `addDomListenerOnce()`
- **Replacement:** Standard DOM `addEventListener()`
- **Announced:** April 7, 2022
- **Sunset:** None set
- **Google's status language:** "continue to work"; "no plan to decommission"

### CSP without `googleapis.com` → CSP that includes `googleapis.com`

- **Deprecated item:** Content Security Policies that do not whitelist `googleapis.com`
- **Replacement:** Explicitly specify `googleapis.com` in your CSP
- **Announced:** March 21, 2022
- **Sunset:** Already **unsupported beginning with v3.50** (May 2023)
- **Migration guide:** https://developers.google.com/maps/documentation/javascript/content-security-policy

---

## Places API (Legacy) — service-level legacy status

> **Special case — not on the deprecations table, documented on the Places overview page:**
>
> **"Places API (New) is the current version. Places API is now Legacy and can no longer be enabled."**
>
> - **Source:** https://developers.google.com/maps/documentation/places/web-service/overview
> - **Impact:** New projects cannot enable the legacy Places API. Existing customers continue to work, but all new development should target **Places API (New)**.
> - Google's banner does not provide a numeric sunset date; it simply states the legacy service "can no longer be enabled" for new enablements.

### Places field deprecations (JavaScript)

#### Place Autocomplete `bounds` / `location` / `radius` → `locationBias` / `locationRestriction`

- **Announced:** May 2023
- **Sunset:** None set — Google requires a **12-month notice** before removal
- **Google's status language:** "will continue to work"

#### Place fields `open_now`, `utc_offset` → `isOpen()`, `utc_offset_minutes`

- **Announced:** November 20, 2019
- **Sunset:** None set
- **Google's status language:** "shouldn't be used"
- **Migration guide:** https://developers.google.com/maps/documentation/javascript/place_field_js_migration

#### Place field `permanently_closed` → `business_status`

- **Announced:** May 26, 2020
- **Sunset:** None set
- **Google's status language:** "shouldn't be used"

### Places — Android

#### Places compatibility library → Places SDK for Android

- **Announced:** March 31, 2022
- **Sunset:** None set
- **Google's status language:** "No new versions … will be released"
- **Migration guide:** https://developers.google.com/maps/documentation/places/android-sdk/client-migration

### Places — iOS

#### `GMSPlaceField` as `NS_ENUM` → `NS_OPTIONS` macro

- **Announced:** Places iOS SDK v4.0.0
- **Sunset:** Use v3.10.0 or earlier to retain old behavior
- **Migration guide:** https://developers.google.com/maps/documentation/places/ios-sdk/migrate-nsoptions

#### iOS Autocomplete `bounds` methods → `locationBias` / `locationRestriction`

- **Announced:** Places iOS SDK v3.10.0
- **Sunset:** Unsupported in **v4.0.0+**
- **Migration:** Appendix 1 of the in-page iOS migration docs

#### `GMSCoordinateBounds` in Autocomplete → `locationBias` / `locationRestriction`

- **Announced:** Places iOS SDK v3.9.0
- **Sunset:** Unsupported in **v4.0.0+**

#### `GMSPlace.openNowStatus` → `isOpen` / `isOpenAtDate`

- **Announced:** Places iOS SDK v3.0.0
- **Sunset:** Unsupported in **v4.0.0+**

---

## Maps SDK for Android

### Legacy renderer → Latest renderer

- **Announced:** March 4, 2024
- **Sunset:** April 2025 — "deprecated and scheduled for decommissioning"
- **Tracking:** https://issuetracker.google.com/issues/404999856

---

## Maps SDK for iOS

### `setMetalRendererEnabled` → Metal renderer (default)

- **Announced:** Maps iOS SDK v9.0.0
- **Sunset:** Unsupported in the **major version released in Q2 2025**
- **Google's status language:** "unsupported in the major version released in Q2 2025"

### GoogleMapsM4B SDK → Remove the dependency

- **Announced:** February 2024
- **Sunset:** Unsupported in the Q2 2025 major release

---

## Routes / Directions — not deprecated

Google's deprecations page does **not** list the Directions API, Distance Matrix API, or their JavaScript equivalents (`DirectionsService`, `DirectionsRenderer`). The Routes API is Google's recommended successor for new server-side routing work because of field masking, richer traffic modeling, toll data, polyline quality options, and two-wheeler routing — but that's a migration recommendation, **not a deprecation**.

If a question asks whether Directions API is deprecated, the accurate answer is: **no, it is not on the deprecations page.**

---

## Map styling — only the _cloud_ legacy was deprecated

Only **"Legacy cloud-based maps styling"** appeared on Google's deprecations page, and it was already decommissioned on **March 25, 2025** (see the next section). The **inline `styles` array** on `google.maps.Map` is **not** on the deprecations page. Google still supports it for maps constructed without a `mapId`, though setting both `mapId` and `styles` emits a console warning because cloud-based styles take precedence.

Cloud-based styling via Map ID remains the recommended approach for new applications (code-free updates, A/B testing, cross-platform consistency), but characterizing the inline `styles` array itself as deprecated overstates Google's position.

---

## Already decommissioned (historical, for context)

These items are already fully removed. They produce errors, no-ops, or unsupported behavior. Listed here so readers don't confuse them with active deprecations.

| Feature | Removed | Status |
|---|---|---|
| Legacy cloud-based maps styling | March 25, 2025 | "automatically migrated" |
| Obsolete place IDs | January 13, 2025 | "rejected and return error" |
| Maps SDK for Android legacy renderer (post-sunset) | April 2025 | scheduled for decommissioning |
| Maps SDK for iOS `setMetalRendererEnabled` | Q2 2025 major release | unsupported |
| GoogleMapsM4B SDK | Q2 2025 major release | unsupported |
| Local Context Library | January 2024 | "discontinued" |
| 45° Imagery auto-switch | v3.62 | "no longer automatically switch" |
| Maps SDK for iOS ≤ v2.5 | January 2023 | "decommissioned" |
| Gaming services | December 31, 2022 | "decommissioned" |
| Unsupported Place Search query combinations | March 31, 2023 | INVALID_REQUEST errors |
| Maps Module in `google.load` | October 13, 2021 | "turned off" |
| Maps JavaScript API v2 | May 26, 2021 | "no longer available" |
| Places fields `id` / `alt_id` / `scope` / `reference` | August 10, 2020 | "no longer available" |
| iOS 10 / ARMv7 32-bit support (SDK 5.0) | v5.0 | "no longer supported" |
| Fusion Tables Layer | December 3, 2019 | "turned off" |
| Places SDK old versions | July 29, 2019 | "turned off" |
| Place Add/Delete | June 30, 2018 | "turned off" |

---

## Best practices for staying current

1. **Monitor the [deprecations page](https://developers.google.com/maps/deprecations) quarterly.** New items are added mid-cycle; the May 2026 JS sunsets were announced in 2025.
2. **Watch the browser console.** Deprecated features log warnings before removal.
3. **Pin an API version deliberately.** `v: "weekly"` gets fixes fastest; `v: "quarterly"` is more stable. Test against `v: "beta"` to preview upcoming changes.
4. **Treat "not scheduled to be discontinued" items as low-urgency.** `google.maps.Marker` and `addDomListener` are deprecated in name but have no sunset — migrate opportunistically, not reactively.
5. **Distinguish deprecation from migration recommendation.** Directions API and the inline `styles` array are not deprecated; they have recommended alternatives.
6. **Subscribe to the [Google Maps Platform release notes](https://developers.google.com/maps/release-notes)** for announcements.
