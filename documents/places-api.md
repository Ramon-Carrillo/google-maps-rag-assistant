---
title: Places API (New)
source_url: https://developers.google.com/maps/documentation/places/web-service/overview
---

# Places API (New)

"Places API (New)" is the current, canonical name Google uses for its place data service. The overview page states the status plainly:

> "Places API (New) is the current version. Places API is now Legacy and can no longer be enabled."

The `(New)` suffix is not transitional branding — it is still used throughout Google's product pages, SKU names ("Place Details Essentials", "Nearby Search Pro", "Text Search Enterprise"), and documentation as of 2026. Treat "Places API (New)" as the product name.

## Legacy status (March 2025 cutoff)

As of the March 2025 cutoff, **new Google Cloud projects can no longer enable the legacy Places API at all**. Existing customers who enabled legacy Places before the cutoff can continue using it, but Google has not published an explicit decommission date on its deprecations page. Google's guidance is to migrate now.

This document covers only the current API. Legacy `PlacesService`, legacy `Autocomplete` widget, and `AutocompleteService` are intentionally not taught here — they cannot be enabled by new projects and the modern surfaces supersede them.

## Recommended surfaces

Three co-equal surfaces depending on context:

- **REST / HTTP** — `https://places.googleapis.com/v1/...` for server-to-server calls.
- **`Place` class** in the Maps JavaScript API — `google.maps.places.Place` for programmatic JS.
- **`PlaceAutocompleteElement`** — a web component (`<gmp-place-autocomplete>`) for autocomplete UI. It replaces the legacy `Autocomplete` widget and `AutocompleteService`.

Android and iOS ship Places SDKs with equivalent capabilities; their migration paths are out of scope for this document.

## Field masks are required

Field masks are **required** on Place Details, Nearby Search, and Text Search requests. Behavior when omitted:

- **REST**: request errors.
- **JS `fetchFields`**: returns an empty or minimal response.

Only fields named in the mask are returned and billed. This is both a feature (lower bills) and a gotcha — omit a field name and you will silently not get it back. Autocomplete requests themselves do not require a field mask; the mask applies to the subsequent Place Details fetch.

## Place class — fetching details

```javascript
const { Place } = await google.maps.importLibrary("places");

const place = new Place({ id: "ChIJN1t_tDeuEmsRUsoyG83frY4" });

await place.fetchFields({
  fields: ["displayName", "formattedAddress", "location", "rating", "photos"],
});

console.log(place.displayName);
console.log(place.formattedAddress);
console.log(place.location.lat(), place.location.lng());
```

## Text Search

```javascript
const { Place } = await google.maps.importLibrary("places");

const { places } = await Place.searchByText({
  textQuery: "pizza near Times Square",
  fields: ["displayName", "location", "rating", "formattedAddress"],
  maxResultCount: 10,
});

places.forEach((p) => console.log(p.displayName, p.rating));
```

## Nearby Search

```javascript
const { places } = await Place.searchNearby({
  fields: ["displayName", "location", "businessStatus"],
  locationRestriction: {
    center: { lat: 40.7128, lng: -74.0060 },
    radius: 1000, // meters
  },
  includedPrimaryTypes: ["restaurant"],
  maxResultCount: 20,
});
```

## PlaceAutocompleteElement — minimal working example

The modern autocomplete surface is the `<gmp-place-autocomplete>` web component. Two things the local docs community frequently gets wrong, both corrected here:

1. The event is **`gmp-select`** (not `gmp-placeselect`).
2. The event payload carries a `placePrediction`. You call `placePrediction.toPlace()` to obtain a `Place`, then `fetchFields()` — you do not read `event.place` directly.

```html
<!DOCTYPE html>
<html>
<body>
  <gmp-place-autocomplete id="pac"></gmp-place-autocomplete>
  <div id="result"></div>
  <gmp-map id="map" center="40.7128,-74.0060" zoom="12" map-id="DEMO_MAP_ID"></gmp-map>

  <script>
    async function init() {
      await google.maps.importLibrary("places");
      const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

      const pac = document.getElementById("pac");
      const map = document.getElementById("map");
      let marker;

      pac.addEventListener("gmp-select", async ({ placePrediction }) => {
        const place = placePrediction.toPlace();
        await place.fetchFields({
          fields: ["displayName", "formattedAddress", "location"],
        });

        document.getElementById("result").textContent =
          `${place.displayName} — ${place.formattedAddress}`;

        if (marker) marker.map = null;
        marker = new AdvancedMarkerElement({
          map: map.innerMap,
          position: place.location,
          title: place.displayName,
        });
      });

      pac.addEventListener("gmp-error", (e) => console.error(e));
    }
    init();
  </script>
</body>
</html>
```

Note the example uses `AdvancedMarkerElement` — `google.maps.Marker` is deprecated and should not be used in new code.

## Styling — what Shadow Parts are exposed

`PlaceAutocompleteElement` is a Shadow-DOM web component. Google's reference page documents exactly three CSS parts:

- `::part(input)` — the text input inside the element
- `::part(prediction-item)` — an individual prediction row
- `::part(prediction-list)` — the container holding the prediction rows

```css
gmp-place-autocomplete::part(input) {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #ccc;
  font-size: 14px;
}
gmp-place-autocomplete::part(prediction-list) {
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
gmp-place-autocomplete::part(prediction-item):hover {
  background: #f3f4f6;
}
```

**Honest gap**: fine-grained styling — match-highlight color, per-row icon/typography, focus-ring customization — is either underdocumented or not exposed at all. The community tracks this as Google issuetracker 399061524. If a developer needs styling beyond the three documented parts, wrap the element in a container you control and style that container; do not rely on undocumented selectors or invented `--gmp-*` custom properties.

Google's usage guide also supports wrapper-level sizing:

```css
gmp-place-autocomplete { width: 300px; }
```

## Session tokens

Session tokens group autocomplete keystrokes and the subsequent Place Details call into a single billed session, which is the single biggest autocomplete cost optimization.

- **`PlaceAutocompleteElement`** manages session tokens automatically. Per the reference, it "automatically uses `AutocompleteSessionToken`s internally to group the query and selection phases of a user's autocomplete search." You don't need to create or pass one.
- **Manual REST or `AutocompleteSuggestion.fetchAutocompleteSuggestions()`** requires you to generate a session token (UUID) and pass it on each autocomplete request, then on the Place Details request that completes the session.

The "Autocomplete - Per Session" SKU bundles the autocomplete keystrokes with the first subsequent `fetchFields()` Place Details call for free. Skipping session tokens in manual flows means each keystroke is billed as a standalone autocomplete request.

## Place Photos

```javascript
const place = new Place({ id: placeId });
await place.fetchFields({ fields: ["photos"] });

if (place.photos?.length) {
  const photoUrl = place.photos[0].getURI({ maxWidth: 400, maxHeight: 300 });
  document.getElementById("photo").src = photoUrl;
}
```

## Pricing tiers (brief)

Places API (New) uses three SKU tiers: **Essentials**, **Pro**, **Enterprise**. SKU names follow the pattern `<Operation> <Tier>`:

- `Place Details Essentials` / `Pro` / `Enterprise`
- `Nearby Search Pro` / `Enterprise`
- `Text Search Pro` / `Enterprise`
- `Autocomplete Requests` (per-request) and `Autocomplete - Per Session` (bundled)
- `Place Details Photos`

Each operation maps to a tier based on which fields you request in the field mask — basic fields route to Essentials, richer fields (reviews, atmosphere data, etc.) route to Pro or Enterprise. Free monthly allowances and volume discounts apply.

For full pricing tables, free-tier allowances, and volume-tier discounts, see `billing-and-pricing.md`.

## Migration quick reference

| Legacy | Current |
|---|---|
| `PlacesService.getDetails()` | `Place.fetchFields()` |
| `PlacesService.findPlaceFromQuery()` | `Place.searchByText()` |
| `PlacesService.nearbySearch()` | `Place.searchNearby()` |
| `PlacesService.textSearch()` | `Place.searchByText()` |
| `new google.maps.places.Autocomplete(input, ...)` widget | `<gmp-place-autocomplete>` element |
| `autocomplete.addListener("place_changed", ...)` | `element.addEventListener("gmp-select", ...)` |
| `autocomplete.getPlace()` | `placePrediction.toPlace()` from the `gmp-select` event payload |
| `AutocompleteService.getPlacePredictions()` | `AutocompleteSuggestion.fetchAutocompleteSuggestions()` (or use the element) |
| Manual `AutocompleteSessionToken` with the element | Not needed — element manages tokens automatically |

Secondary references used throughout this document:
- JS autocomplete guide: https://developers.google.com/maps/documentation/javascript/place-autocomplete-element
- Migration overview: https://developers.google.com/maps/documentation/places/web-service/migrate-overview
