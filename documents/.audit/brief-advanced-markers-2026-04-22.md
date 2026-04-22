# Brief: AdvancedMarkerElement migration, custom content, and MarkerClusterer interop

- Topic: AdvancedMarkerElement migration, PinElement/HTMLElement content, MarkerClusterer interop
- Fetched: 2026-04-22
- Audience: content for `/documents/advanced-markers.md`
- Primary sources:
  - https://developers.google.com/maps/documentation/javascript/advanced-markers/overview
  - https://developers.google.com/maps/documentation/javascript/advanced-markers/basic-customization
  - https://developers.google.com/maps/documentation/javascript/advanced-markers/html-markers
  - https://developers.google.com/maps/documentation/javascript/advanced-markers/accessible-markers
  - https://developers.google.com/maps/documentation/javascript/advanced-markers/migration
  - https://developers.google.com/maps/documentation/javascript/reference/advanced-markers
  - https://developers.google.com/maps/documentation/javascript/reference/marker#CollisionBehavior
  - https://github.com/googlemaps/js-markerclusterer (README)

---

## 1. Migration basics

### 1.1 Requirements to use `AdvancedMarkerElement`

Three mandatory prerequisites (per the migration guide):

1. **Import the `"marker"` library.** With the async loader:
   ```js
   const { Map } = await google.maps.importLibrary("maps");
   const { AdvancedMarkerElement, PinElement } =
     await google.maps.importLibrary("marker");
   ```
   Legacy script tag: add `&libraries=marker` to the loader URL.
2. **Pass a `mapId` when creating the map.** Advanced markers are a vector-map/cloud-styling feature; they will not render without a map ID. `DEMO_MAP_ID` is acceptable for local dev.
   ```js
   const map = new Map(document.getElementById("map"), {
     center: { lat: 37.42, lng: -122.1 },
     zoom: 14,
     mapId: "DEMO_MAP_ID",
   });
   ```
3. **Replace `google.maps.Marker` with `google.maps.marker.AdvancedMarkerElement`.**

### 1.2 Minimal working example

```js
async function initMap() {
  const { Map } = await google.maps.importLibrary("maps");
  const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

  const map = new Map(document.getElementById("map"), {
    center: { lat: 37.4239163, lng: -122.0947209 },
    zoom: 14,
    mapId: "DEMO_MAP_ID",
  });

  const marker = new AdvancedMarkerElement({
    map,
    position: { lat: 37.4239163, lng: -122.0947209 },
    title: "Googleplex",
  });
}
initMap();
```

### 1.3 Drop-in replacements for common `Marker` patterns

| Legacy `Marker`               | `AdvancedMarkerElement` equivalent |
| ----------------------------- | ---------------------------------- |
| `marker.setMap(null)`         | `marker.map = null;`               |
| `marker.setMap(map)`          | `marker.map = map;`                |
| `marker.setPosition(latLng)`  | `marker.position = latLng;`        |
| `marker.setIcon(url)`         | Replace `marker.content` with a `PinElement` (glyph icon) or custom `HTMLElement`/`<img>` |
| `marker.addListener('click', fn)` | `marker.addListener('click', fn)` still works; prefer `marker.addEventListener('gmp-click', fn)` after setting `marker.gmpClickable = true` |

> The `content` property holds the DOM element backing the visual. It defaults to a `PinElement` when not provided. Setting `marker.content = someElement` swaps the visual in place; there is no `setContent()` method.

---

## 2. Custom content

### 2.1 `PinElement` — styled default pin

Use `PinElement` when you want the stock balloon shape with different colors or a glyph. Knobs:

| Property      | Purpose                                     |
| ------------- | ------------------------------------------- |
| `background`  | Pin fill color (any CSS color)              |
| `borderColor` | Pin outline color                           |
| `glyphColor`  | Inner glyph/text color                      |
| `glyphText`   | Text (single character works best) or `''` to hide |
| `glyph`       | Alternative glyph: `string`, `URL`, or an `HTMLElement` |
| `scale`       | Size multiplier (default `1`)               |

```js
const pin = new PinElement({
  background: "#FBBC04",
  borderColor: "#137333",
  glyphColor: "white",
  glyphText: "T",
  scale: 1.2,
});

const marker = new AdvancedMarkerElement({
  map,
  position: { lat: 37.42, lng: -122.1 },
  content: pin.element, // pass the DOM element
});
```

> Gotcha: `content` expects an `HTMLElement`, not the `PinElement` wrapper. Pass `pin.element`. (Some samples in Google docs assign the `PinElement` directly and it works because of its `Symbol.toPrimitive`/element coercion — but `pin.element` is the unambiguous form.)

### 2.2 HTMLElement markers

Use a raw DOM element when you need custom shapes (price tags, avatars, brand pills):

```js
const priceTag = document.createElement("div");
priceTag.className = "price-tag";
priceTag.textContent = "$2.5M";

const marker = new AdvancedMarkerElement({
  map,
  position: { lat: 37.42, lng: -122.1 },
  content: priceTag,
});
```

Style with normal CSS. Anchor point defaults to the bottom-center of the element; override via `marker.anchorLeft` / `marker.anchorTop` (CSS length-percentage values).

**Accessibility (from the accessible-markers guide):**

- Set `marker.gmpClickable = true` to make markers keyboard-reachable and mouse-clickable.
- Keyboard model, once clickable: **Tab** focuses the first marker; **arrow keys** cycle between markers on the same map; **Enter**/**Space** activates.
- `marker.title` is read by screen readers and shown on hover.
- Focus returns to the marker after an associated InfoWindow closes.
- Default `PinElement` meets WCAG AA minimum size; bump `scale` for AAA.
- Prefer `marker.addEventListener('gmp-click', (e) => { ... })` over `addListener('click', ...)` for the clickable path — it dispatches for both mouse and keyboard activation.

---

## 3. Interop with other common libraries

### 3.1 MarkerClusterer + AdvancedMarkerElement (the CRUCIAL section)

**Verdict:** The official [`@googlemaps/markerclusterer`](https://github.com/googlemaps/js-markerclusterer) library **does support `AdvancedMarkerElement`**. Its internal `Marker` type is a union of `google.maps.Marker | google.maps.marker.AdvancedMarkerElement`, so you can pass advanced markers directly into `new MarkerClusterer({ markers })`. The library's built-in `DefaultRenderer`, however, **renders cluster bubbles as legacy `google.maps.Marker` instances** — which still works, but:

- You will get deprecation console warnings from the cluster bubble itself (not from your own markers).
- To render cluster bubbles as `AdvancedMarkerElement` too, supply a **custom renderer** whose `render()` returns an `AdvancedMarkerElement`.

**Minimal working example — advanced markers with the default renderer:**

```js
import { MarkerClusterer } from "@googlemaps/markerclusterer";

const { Map } = await google.maps.importLibrary("maps");
const { AdvancedMarkerElement, PinElement } =
  await google.maps.importLibrary("marker");

const map = new Map(document.getElementById("map"), {
  center: { lat: 37.42, lng: -122.1 },
  zoom: 10,
  mapId: "DEMO_MAP_ID", // REQUIRED — clustering does not rescue a missing mapId
});

const locations = [
  { lat: 37.42, lng: -122.1 },
  { lat: 37.43, lng: -122.12 },
  /* ... */
];

const markers = locations.map((position) => {
  return new AdvancedMarkerElement({ position });
  // NOTE: do NOT pass `map:` here — the clusterer manages map assignment
});

new MarkerClusterer({ map, markers });
```

**Gotchas:**

1. **Do not set `marker.map` yourself** when handing markers to the clusterer. `MarkerClusterer` toggles `marker.map` on each cluster/uncluster transition; pre-assigning `map` causes markers to flicker or double-render.
2. **`mapId` is still required on the Map.** The clusterer does not supply one.
3. **Cluster-click handler:** `onClusterClick` signature is `(event, cluster, map) => void`; the default behavior zooms to the cluster bounds. Override only if you need custom UX.
4. **`addMarker` / `removeMarker`:** prefer `clusterer.addMarker(marker)` / `clusterer.removeMarker(marker)` over mutating `marker.map` manually.
5. **TypeScript:** types ship with the package; install `@types/google.maps` as a dev dep.

**Custom renderer that returns an `AdvancedMarkerElement` for cluster bubbles:**

```js
import { MarkerClusterer } from "@googlemaps/markerclusterer";

const renderer = {
  render: ({ count, position }, stats, map) => {
    const div = document.createElement("div");
    div.className = "cluster-bubble";
    div.textContent = String(count);
    return new google.maps.marker.AdvancedMarkerElement({
      position,
      content: div,
      // zIndex-ish: bias toward denser clusters on top
      zIndex: 1000 + count,
    });
  },
};

new MarkerClusterer({ map, markers, renderer });
```

### 3.2 Collision behavior between AdvancedMarkers

Set `collisionBehavior` on the marker. Exact enum values (from `google.maps.CollisionBehavior`):

- **`REQUIRED`** — always display the marker regardless of collision. **Default.**
- **`OPTIONAL_AND_HIDES_LOWER_PRIORITY`** — display only if no overlap; when two such markers would overlap, higher `zIndex` wins (ties break by lower vertical screen position).
- **`REQUIRED_AND_HIDES_OPTIONAL`** — always display this marker, and hide any `OPTIONAL_AND_HIDES_LOWER_PRIORITY` markers (and map labels) that overlap it.

```js
new AdvancedMarkerElement({
  map,
  position,
  collisionBehavior: google.maps.CollisionBehavior.REQUIRED_AND_HIDES_OPTIONAL,
  zIndex: 5,
});
```

> Collision behavior only functions on vector maps (which is the only mode that supports advanced markers anyway, i.e. with a `mapId`).

### 3.3 InfoWindow + AdvancedMarker

Small but important difference from the `Marker` flow: you **cannot** pass the marker directly as the anchor in all cases; `InfoWindow.open()` accepts an `anchor` that is an `AdvancedMarkerElement`, and you should listen for the marker's click via `gmp-click`:

```js
const infoWindow = new google.maps.InfoWindow();

marker.gmpClickable = true;
marker.addEventListener("gmp-click", () => {
  infoWindow.setContent(`<div>${marker.title}</div>`);
  infoWindow.open({ map, anchor: marker });
});
```

Notes:

- Pass the open options object (`{ map, anchor }`), not positional args.
- After the user closes the InfoWindow, focus returns to the marker (accessibility).
- The InfoWindow's tail positions relative to the marker's anchor point (bottom-center by default, or `anchorLeft`/`anchorTop` if overridden).

---

## 4. Gotchas

1. **No `mapId` → markers silently don't render.** The map loads, your markers instantiate, no errors are thrown, but nothing appears on screen. Always verify `mapId` is set (use `DEMO_MAP_ID` in dev).
2. **No `libraries=marker` (or missing `importLibrary("marker")`) → `AdvancedMarkerElement is undefined`.**
3. **Passing a `PinElement` where an `HTMLElement` is expected.** Use `pin.element` for `marker.content`.
4. **Legacy setters don't exist.** `setMap`, `setPosition`, `setIcon`, `setLabel`, `setVisible` are all property assignments now (`marker.map`, `marker.position`, `marker.content`, etc.). There is no `setVisible`; remove from map with `marker.map = null`.
5. **Click events:** `addEventListener('gmp-click', …)` requires `gmpClickable = true`. Without it, only legacy `addListener('click', …)` fires (and keyboard activation won't work).
6. **React / Next.js specifics:**
   - **Dynamic import the loader on the client only.** `@googlemaps/js-api-loader` or `importLibrary` touches `window`/`document`; import inside `useEffect` or a `'use client'` component. In Next.js App Router, put map components in client components only.
   - **`AdvancedMarkerElement` instances are real DOM elements**, so you should create and destroy them in effects — not in render. Always clean up in the effect's return function: `return () => { marker.map = null; };`.
   - **Do not reuse the API script across HMR reloads blindly;** `importLibrary` is idempotent, but constructing a new `Map` into the same container without clearing its children will stack DOM. Use a ref and null it on unmount.
   - **Avoid React-owned children inside `marker.content`.** Because Google moves the node into its own overlay layer, React can lose track of it. Either (a) render the marker content via `ReactDOM.createPortal` into a detached `div`, then pass that `div` as `content`, or (b) use a wrapper library (`@vis.gl/react-google-maps`) whose `<AdvancedMarker>` component handles the portal for you.
   - **Strict Mode double-invocation** will create and destroy markers twice in dev; make sure cleanup sets `marker.map = null` and removes listeners.

---

## Open questions / notes

- The Google-hosted `migration` page URL in the official docs redirects; the live path at time of fetch is `/maps/documentation/javascript/advanced-markers/migration` (the older `/migration-guide/advanced-markers-migration` path returns 404).
- The `@googlemaps/markerclusterer` README does not explicitly document AdvancedMarkerElement support, but the TypeScript types (`src/marker-utils.ts` on `main`) export a union `Marker = google.maps.Marker | google.maps.marker.AdvancedMarkerElement` and the internal `setMap`/`getPosition` helpers branch on which class they received. Verified by inspecting the types shipped in the published npm package.
- Could not directly fetch the raw README from `raw.githubusercontent.com` or individual issue pages during this research pass (WebFetch denied for those hosts); recommend a follow-up pass with `gh` CLI if the custom-renderer AdvancedMarker example needs verbatim citation from an upstream example.
