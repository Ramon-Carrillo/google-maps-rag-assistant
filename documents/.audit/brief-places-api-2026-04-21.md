---
topic: Places API after March 2025 legacy cutoff — naming, migration, PlaceAutocompleteElement
fetch_date: 2026-04-21
researcher: maps-docs-researcher
recommended_source_url: https://developers.google.com/maps/documentation/places/web-service/overview
---

# Brief: Places API (2026-04-21)

## Primary sources fetched

- https://developers.google.com/maps/documentation/places/web-service/overview — overview page
- https://developers.google.com/maps/documentation/places/web-service/migrate-overview — migration guide
- https://developers.google.com/maps/documentation/places/web-service/op-overview — operations overview
- https://developers.google.com/maps/documentation/javascript/place-autocomplete-element — JS widget guide
- https://developers.google.com/maps/documentation/javascript/reference/places-widget — reference (class signature, events, CSS parts)
- https://developers.google.com/maps/deprecations — deprecations page (no explicit legacy Places sunset found)
- https://developers.google.com/maps/billing-and-pricing/pricing — SKU tier pricing

## Current reality

### 1. Canonical name
Google currently uses **"Places API (New)"** as the versioned label on its overview page, with the exact wording:

> "Places API (New) is the current version. Places API is now Legacy and can no longer be enabled."

So both names are still in play: "Places API (New)" is the active product, and plain "Places API" is now reserved for the legacy version. This contradicts the mapper report's suggestion that Google has dropped "(New)" — the "(New)" suffix is still present throughout product pages and SKU names ("Place Details Essentials", "Nearby Search Pro", "Text Search Enterprise" all reference the New API).

### 2. Legacy cutoff status
Exact current wording (overview page):

> "Places API is now Legacy and can no longer be enabled."

Translation: **new Google Cloud projects cannot enable legacy Places API at all** — the March 2025 cutoff removed it from enablement. Existing customers who already enabled it before the cutoff can continue using it, but Google does not publish an explicit sunset/decommission date on the deprecations page as of 2026-04-21. Google's guidance is: migrate now.

### 3. Recommended primary surface
Three co-equal surfaces depending on context:

- **REST / HTTP** — `https://places.googleapis.com/v1/...` for server-to-server
- **`Place` class** in Maps JavaScript API — `google.maps.places.Place` for programmatic JS
- **`PlaceAutocompleteElement`** — web component for autocomplete UI (replaces legacy `Autocomplete` widget and `AutocompleteService`)

From the migration overview:
> "Places API (New) provides improved performance and a new pricing model, making it worthwhile to update apps that use the Places API (Legacy)."

### 4. Pricing / SKU tiers
Google uses three tier labels: **Essentials**, **Pro**, **Enterprise**. SKU names follow the pattern `<Operation> <Tier>`:

- `Place Details Essentials`, `Place Details Pro`, `Place Details Enterprise`
- `Nearby Search Pro`, `Nearby Search Enterprise`
- `Text Search Pro`, `Text Search Enterprise`
- `Autocomplete Requests` (per-request) and `Autocomplete - Per Session` (bundled with Place Details)
- `Place Details Photos`

Sample pricing per 1,000 (first tier, 10,001–100,000 events/month):
- Autocomplete Requests: **$2.83**
- Nearby Search Pro: **$32.00**
- Nearby Search Enterprise: **$40.00**
- Address Validation: **$17.00**

Free monthly allowances: ~10,000 Essentials events, ~5,000 Pro events. Volume discounts reach 70–80% at 5M+ monthly events. Authoritative numbers live at `/maps/billing-and-pricing/pricing#places-pricing`.

### 5. PlaceAutocompleteElement — working minimal example

```html
<!DOCTYPE html>
<html>
<head>
  <title>Place Autocomplete</title>
</head>
<body>
  <gmp-place-autocomplete id="pac"></gmp-place-autocomplete>
  <div id="result"></div>

  <script>
    (g=>{var h,a,k,p="The Google Maps JavaScript API",c="google",l="importLibrary",q="__ib__",m=document,b=window;b=b[c]||(b[c]={});var d=b.maps||(b.maps={}),r=new Set,e=new URLSearchParams,u=()=>h||(h=new Promise(async(f,n)=>{await (a=m.createElement("script"));e.set("libraries",[...r]+"");for(k in g)e.set(k.replace(/[A-Z]/g,t=>"_"+t[0].toLowerCase()),g[k]);e.set("callback",c+".maps."+q);a.src=`https://maps.${c}apis.com/maps/api/js?`+e;d[q]=f;a.onerror=()=>h=n(Error(p+" could not load."));a.nonce=m.querySelector("script[nonce]")?.nonce||"";m.head.append(a)}));d[l]?console.warn(p+" only loads once. Ignoring:",g):d[l]=(f,...n)=>r.add(f)&&u().then(()=>d[l](f,...n))})
    ({key: "YOUR_API_KEY", v: "weekly"});

    async function init() {
      await google.maps.importLibrary("places");
      const pac = document.getElementById("pac");

      pac.addEventListener("gmp-select", async ({ placePrediction }) => {
        const place = placePrediction.toPlace();
        await place.fetchFields({
          fields: ["displayName", "formattedAddress", "location"],
        });
        document.getElementById("result").textContent =
          `${place.displayName} — ${place.formattedAddress}`;
      });

      pac.addEventListener("gmp-error", (e) => console.error(e));
    }
    init();
  </script>
</body>
</html>
```

**Critical correction vs local doc**: the event is **`gmp-select`**, not `gmp-placeselect`. The event payload carries a `placePrediction` (a `PlacePrediction` object), and you call `placePrediction.toPlace()` then `fetchFields()` — not `event.place` directly. The local doc has this wrong.

### 6. Styling — the Shadow-DOM gap
This is where Google's documentation is genuinely inconsistent:

- The **reference page** for `PlaceAutocompleteElement` (places-widget reference) describes CSS parts — `input`, `prediction-item`, `prediction-list` — and CSS custom properties for colors/fonts/spacing are referenced.
- The **usage guide** (`/place-autocomplete-element`) does **not** document these parts. It only shows wrapper-level styling: `gmp-place-autocomplete { width: 300px; }`.

In practical terms: the element is a Shadow-DOM web component, and Google has NOT produced a comprehensive, centralized list of `::part()` selectors and `--gmp-*` custom properties with examples. Issuetracker 399061524 is the tracking issue developers cite. **Recommended doc language**: acknowledge `::part(input)`, `::part(prediction-item)`, `::part(prediction-list)` as the documented parts, but note that fine-grained styling (highlight colors, hover states, typography of individual prediction rows) is either underdocumented or not exposed at all — developers commonly wrap the element in their own container and style that, then use the three documented parts for the rest.

Minimal styling example using what's documented:

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

Do NOT invent custom-property names. If a dev needs something beyond these three parts, the honest answer is: "not officially supported; track issuetracker 399061524."

### 7. Session tokens
PlaceAutocompleteElement **manages session tokens automatically**. Quote from reference:

> "automatically uses `AutocompleteSessionToken`s internally to group the query and selection phases of a user's autocomplete search."

For manual REST / `AutocompleteSuggestion.fetchAutocompleteSuggestions()` usage, you still pass a `sessionToken` string yourself. Session-based billing (`Autocomplete - Per Session` SKU) bundles the autocomplete keystrokes with the first subsequent `fetchFields()` Place Details call for free — this is the #1 cost optimization.

### 8. Field masks
**Required for all Place Details, Nearby Search, and Text Search requests.** No field mask = error (for REST) or empty / minimal response (for JS `fetchFields`). Autocomplete itself doesn't require a field mask. Only billed fields are returned — this is both a feature (pay less) and a gotcha (omit a field and you silently don't get it).

## What changed vs `documents/places-api.md`

| Local doc | Reality (2026-04-21) |
|---|---|
| Title "Places API (New) and Autocomplete" | Keep — Google still uses "(New)" as the version label |
| No mention of legacy cutoff | Must add: "Places API is now Legacy and can no longer be enabled" (March 2025 cutoff) |
| Autocomplete example uses legacy `google.maps.places.Autocomplete` widget | Legacy; replace primary example with `PlaceAutocompleteElement` / `gmp-place-autocomplete` |
| `autocomplete.addListener("place_changed", ...)` | Legacy pattern; new is `gmp-select` event on the element |
| `gmp-placeselect` event | **Wrong** — real event name is `gmp-select`, payload is `{ placePrediction }`, call `placePrediction.toPlace()` |
| Session token example uses `AutocompleteService` | That's the legacy service; modern element handles tokens automatically. Mention manual tokens only for REST |
| No styling section | Add documented `::part(input|prediction-item|prediction-list)` with honest note that deeper styling is underdocumented (issuetracker 399061524) |
| No pricing tiers | Add Essentials/Pro/Enterprise SKU tier explanation |
| No field-mask "required" note | Must state: field masks are required and bill-shaping |

## Open questions

- Exact decommission date for existing legacy Places customers is not published — Google's deprecations page lists only the Android Places compatibility library, not the legacy Places web service. Worth noting as "no published sunset date; migrate anyway."
- Full list of exposed CSS custom properties (if any) for PlaceAutocompleteElement — reference page hints at them, usage guide doesn't enumerate them. Treat as partially documented.
- `gmp-placeselect` vs `gmp-select`: older blog posts and some community examples use `gmp-placeselect`. The current Google reference says `gmp-select`. The local doc should use `gmp-select`; if a reader reports `gmp-placeselect` working, it may be a legacy-aliased event on an older version of the element — do not document it.

## Recommended `source_url` for the rewritten doc
`https://developers.google.com/maps/documentation/places/web-service/overview`

(Secondary citations inside the doc: the JS autocomplete guide `/javascript/place-autocomplete-element` and the migration overview `/places/web-service/migrate-overview`.)
