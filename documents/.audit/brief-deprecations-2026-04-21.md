---
title: Research Brief — Google Maps Platform Deprecations (April 2026)
agent: maps-docs-researcher
fetch_date: 2026-04-22
primary_source: https://developers.google.com/maps/deprecations
secondary_sources:
  - https://developers.google.com/maps/documentation/places/web-service/overview
---

# Brief: Google Maps Platform Deprecations — Current State (April 2026)

## Scope & Method

Fetched Google's canonical deprecations page (`/maps/deprecations`) on 2026-04-22 and cross-checked the Places Web Service overview for the "Places API is now Legacy" banner. Only Google-sourced text is quoted below. Anything not on Google's page is explicitly excluded.

## Headline Numbers

- **16 active deprecations** currently listed on the deprecations page.
- **14 completed/decommissioned** items also listed (informational — already gone).
- **1 additional legacy-status item** surfaced on the Places overview page but not enumerated in the deprecations table: the Places API itself.

## Top 5 Most Urgent (nearest sunset)

1. **Drawing Library** → Terra Draw — sunset **May 2026** (announced Aug 8, 2025)
2. **Heatmap Layer** → deck.gl `HeatmapLayer` — sunset **May 2026** (announced May 27, 2025)
3. **Maps SDK for Android legacy renderer** — already past sunset (**April 2025**); "scheduled for decommissioning"
4. **Maps SDK for iOS `setMetalRendererEnabled`** — "unsupported" as of **Q2 2025** major release
5. **GoogleMapsM4B SDK (iOS)** — unsupported as of **Q2 2025**

The two May 2026 JS library sunsets are the hottest developer-facing items and were the most recently *added* to the deprecations list (announced mid-2025).

---

## Structured Table — Active Deprecations

Category key: **JS** = Maps JavaScript API, **Places** = Places (any platform), **Android**, **iOS**, **Gen** = general.

| # | Category | Deprecated Feature (Google's text) | Replacement (Google's text) | Announced | Sunset | Migration URL | Google's Status Language |
|---|----------|-------------------------------------|------------------------------|-----------|--------|---------------|---------------------------|
| 1 | JS | Drawing Library | "Terra Draw" | Aug 8, 2025 | May 2026 | /maps/documentation/javascript/examples/map-drawing-terradraw | "will no longer be supported" |
| 2 | JS | Heatmap Layer | "deck.gl HeatmapLayer" | May 27, 2025 | May 2026 | https://deck.gl/docs/api-reference/aggregation-layers/heatmap-layer | "will no longer be supported" |
| 3 | JS | `google.maps.Marker` | "AdvancedMarkerElement" | Feb 2024 | None scheduled | /maps/documentation/javascript/advanced-markers/migration | "not scheduled to be discontinued"; "recommended over" |
| 4 | JS | `google.maps.event.addDomListener()` / `addDomListenerOnce()` | Standard `addEventListener()` | Apr 7, 2022 | None set | — | "continue to work"; "no plan to decommission" |
| 5 | JS | CSP without `googleapis.com` | Specify `googleapis.com` in CSP | Mar 21, 2022 | May 2023 (v3.50) | /maps/documentation/javascript/content-security-policy | "unsupported beginning with v3.50" |
| 6 | Places (JS) | Place Autocomplete `bounds` / `location` / `radius` | "`locationBias` and `locationRestriction`" | May 2023 | 12-month notice required before removal | — | "will continue to work" |
| 7 | Places (JS) | Place fields `open_now`, `utc_offset` | "`isOpen()`" / "`utc_offset_minutes`" | Nov 20, 2019 | None set | /maps/documentation/javascript/place_field_js_migration | "shouldn't be used" |
| 8 | Places (Gen) | Place field `permanently_closed` | "`business_status`" | May 26, 2020 | None set | — | "shouldn't be used" |
| 9 | Android | Maps SDK for Android legacy renderer | Latest renderer | Mar 4, 2024 | Apr 2025 | https://issuetracker.google.com/issues/404999856 | "deprecated and scheduled for decommissioning" |
| 10 | Android | Places compatibility library | Places SDK for Android | Mar 31, 2022 | None set | /maps/documentation/places/android-sdk/client-migration | "No new versions … will be released" |
| 11 | iOS | `setMetalRendererEnabled` | Metal renderer (default) | v9.0.0 | Q2 2025 | — | "unsupported in the major version released in Q2 2025" |
| 12 | iOS | GoogleMapsM4B SDK | Remove dependency | Feb 2024 | Q2 2025 | — | "will be unsupported" |
| 13 | iOS (Places) | `GMSPlaceField` as `NS_ENUM` | `NS_OPTIONS` macro | v4.0.0 | — | /maps/documentation/places/ios-sdk/migrate-nsoptions | "use v3.10.0 or earlier" |
| 14 | iOS (Places) | Places iOS Autocomplete `bounds` methods | "`locationBias` / `locationRestriction`" | v3.10.0 | v4.0.0 | Appendix 1 in-page | "unsupported in v4.0.0+" |
| 15 | iOS (Places) | `GMSCoordinateBounds` in Autocomplete | "`locationBias` / `locationRestriction`" | v3.9.0 | v4.0.0 | Appendix 1 in-page | "unsupported in v4.0.0+" |
| 16 | iOS (Places) | `GMSPlace.openNowStatus` | "`isOpen` / `isOpenAtDate`" | v3.0.0 | v4.0.0 | — | "unsupported in v4.0.0+" |

### Out-of-Table (documented separately on the Places overview page)

| Feature | Replacement | Status Banner (verbatim) |
|---------|-------------|--------------------------|
| Places API (web service) | Places API (New) | **"Places API (New) is the current version. Places API is now Legacy and can no longer be enabled."** |

Google does not give a numeric sunset date for Places-Legacy on that banner — just that it "can no longer be enabled" (interpretation: closed to new projects; existing customers continue to work). The project prompt references March 2025 as the enablement-closure date; that specific date was not surfaced in the fetched banner text, so treat it as not-Google-verifiable from this fetch.

---

## Completed / Decommissioned (for context, NOT active)

These are already removed. Include only if the writer wants a historical "already gone" sidebar.

| Feature | Removed | Status |
|---------|---------|--------|
| 45° Imagery auto-switch | v3.62 | "no longer automatically switch" |
| Local Context Library | Jan 2024 | "discontinued" |
| Legacy cloud-based maps styling | Mar 25, 2025 | "automatically migrated" |
| Obsolete place IDs | Jan 13, 2025 | "rejected and return error" |
| Gaming services | Dec 31, 2022 | "decommissioned" |
| Maps Module in `google.load` | Oct 13, 2021 | "turned off" |
| Maps SDK for iOS ≤ v2.5 | Jan 2023 | "decommissioned" |
| Maps JavaScript API v2 | May 26, 2021 | "no longer available" |
| Places fields `id`/`alt_id`/`scope`/`reference` | Aug 10, 2020 | "no longer available" |
| iOS 10 / ARMv7 32-bit support (SDK 5.0) | v5.0 | "no longer supported" |
| Fusion Tables Layer | Dec 3, 2019 | "turned off" |
| Places SDK old versions | Jul 29, 2019 | "turned off" |
| Place Add/Delete | Jun 30, 2018 | "turned off" |
| Unsupported Place Search query combos | Mar 31, 2023 | "INVALID_REQUEST errors" |

---

## Category Grouping for the Writer

**Maps JavaScript API (5 active):** Drawing Library, Heatmap Layer, `google.maps.Marker`, `addDomListener`/`addDomListenerOnce`, CSP-without-googleapis.com.

**Places (all platforms, 8 active + 1 banner):**
- JS: Autocomplete `bounds/location/radius`; fields `open_now`/`utc_offset`; field `permanently_closed`.
- Android: Places compatibility library.
- iOS: `GMSPlaceField` NS_ENUM; iOS Autocomplete `bounds` methods; `GMSCoordinateBounds`; `openNowStatus`.
- Service-level: **Places API → Places API (New)** — legacy, no new enablement.

**Maps SDK for Android (1 active):** legacy renderer.

**Maps SDK for iOS (2 active):** `setMetalRendererEnabled`, GoogleMapsM4B.

**Routes / Directions:** **Nothing currently on the deprecations page.** Do NOT state that Directions API is deprecated — Google's page does not list it. The local `deprecations-2026.md` section "Directions API → Routes API" should be reframed as "recommended migration, not a deprecation."

**Map Styling:** The legacy JSON `styles` array is **not** on the active deprecations page; the page's styling entry ("Legacy cloud-based maps styling") is already in the *completed* bucket (removed March 25, 2025). The writer should mark the `styles`-array discussion in the existing local doc carefully — Google still supports inline `styles` for maps without a `mapId`, but it emits a console warning when `mapId` is set.

---

## What's Already Fully Removed vs. Still Deprecated-but-Available

- **Fully removed** (produces errors or no-ops): all 14 items in the "Completed" table above. Most notable for 2025: obsolete Place IDs (Jan 13, 2025) and legacy cloud styling (Mar 25, 2025).
- **Deprecated but available** (Google's exact wording):
  - "will continue to work" — Place Autocomplete `bounds/location/radius`.
  - "continue to work"; "no plan to decommission" — `addDomListener`.
  - "not scheduled to be discontinued" — `google.maps.Marker`.
  - "will no longer be supported" (pending) — Drawing Library, Heatmap Layer (both May 2026).
  - "shouldn't be used" — `open_now`, `utc_offset`, `permanently_closed`.

## Migration-Pressure Recency (what's hot right now)

The two items added in **2025** are the freshest and have hard May 2026 sunsets:
1. **Drawing Library → Terra Draw** (announced Aug 8, 2025).
2. **Heatmap Layer → deck.gl HeatmapLayer** (announced May 27, 2025).

These should lead the deprecations doc rewrite. Every other active deprecation was announced in 2024 or earlier.

## Gaps vs. Local Doc (`documents/deprecations-2026.md`)

Missing entirely from the local file:
- Drawing Library → Terra Draw (May 2026 sunset)
- Heatmap Layer → deck.gl (May 2026 sunset)
- `addDomListener` / `addDomListenerOnce` → `addEventListener`
- Places Autocomplete `bounds`/`location`/`radius` → `locationBias`/`locationRestriction`
- CSP without `googleapis.com`
- Maps SDK for Android legacy renderer
- Maps SDK for iOS `setMetalRendererEnabled`, GoogleMapsM4B
- All four iOS Places deprecations (NS_ENUM, bounds methods, GMSCoordinateBounds, openNowStatus)
- Android Places compatibility library
- The Places-Legacy banner ("can no longer be enabled")
- `permanently_closed`, `open_now`, `utc_offset` field deprecations

Incorrect framing in the local file:
- "Directions API → Routes API" is described as a deprecation; **Google's deprecations page does not list Directions API as deprecated**. Reframe as "recommended migration."
- "Legacy JSON styles → Cloud-Based Styling" is framed as deprecated; Google lists legacy *cloud-based* styling as already decommissioned (Mar 25, 2025). The inline `styles` array itself isn't on the deprecations page. Reframe.

## Discipline Notes

- All dates above are verbatim from the Google deprecations page fetched 2026-04-22.
- Where Google used version numbers instead of calendar dates (e.g., "v4.0.0", "Q2 2025"), I preserved that phrasing rather than guessing a month.
- The Places-Legacy banner was pulled from the Places web-service overview page, not the deprecations page; the writer should cite both URLs.
