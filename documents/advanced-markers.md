---
title: AdvancedMarkerElement Migration and Usage
source_url: https://developers.google.com/maps/documentation/javascript/advanced-markers/overview
---

# AdvancedMarkerElement Migration and Usage

`google.maps.marker.AdvancedMarkerElement` is the current marker primitive for the Maps JavaScript API. It replaces the legacy `google.maps.Marker` class, which is deprecated — see [`deprecations-2026.md`](./deprecations-2026.md) for the deprecation timeline and broader replacement context. See also [`maps-js-api-overview.md`](./maps-js-api-overview.md) for base loader and map setup.

## Why migrate

`AdvancedMarkerElement` is a real `HTMLElement`, so it participates in normal DOM layout, supports any HTML/CSS as content, exposes keyboard accessibility, and integrates with collision behavior and cloud-styled vector maps. The legacy `google.maps.Marker` constructor is deprecated and will stop receiving new features; see [`deprecations-2026.md`](./deprecations-2026.md).

## Five migration gotchas

These account for the overwhelming majority of "my markers disappeared" reports:

1. **Missing `mapId`** — advanced markers are a vector-map feature. If your `Map` is constructed without a `mapId`, markers instantiate successfully, throw no errors, and silently do not render. Use `mapId: "DEMO_MAP_ID"` in development; use a real Cloud-configured map ID in production.
2. **Missing `"marker"` library import** — `AdvancedMarkerElement is undefined`. You must `await google.maps.importLibrary("marker")` (or include `&libraries=marker` on the script URL).
3. **Legacy setters are gone.** `setMap`, `setPosition`, `setIcon`, `setLabel`, and `setVisible` are not methods on `AdvancedMarkerElement`. They are property assignments now: `marker.map = null`, `marker.position = { lat, lng }`, `marker.content = element`. There is no `setVisible` — hide by assigning `marker.map = null`, show by assigning `marker.map = mapInstance`.
4. **Clickability is opt-in.** The `gmp-click` event only fires when `marker.gmpClickable = true`. `gmpClickable` is also what makes the marker keyboard-activatable. Without it, neither mouse keyboard-activation nor `gmp-click` listeners will fire.
5. **React / Next.js** — load the loader client-side only (inside `useEffect` or a `'use client'` component), clean up with `marker.map = null` in the effect teardown, and render React children inside `marker.content` via `ReactDOM.createPortal` (or use `@vis.gl/react-google-maps`, whose `<AdvancedMarker>` handles the portal for you). See [`react-nextjs-integration.md`](./react-nextjs-integration.md) for broader patterns.

## Drop-in replacements

| Legacy `Marker` pattern | `AdvancedMarkerElement` equivalent |
| --- | --- |
| `marker.setMap(map)` | `marker.map = map;` |
| `marker.setMap(null)` | `marker.map = null;` |
| `marker.setPosition({ lat, lng })` | `marker.position = { lat, lng };` |
| `marker.setIcon(urlOrIcon)` | `marker.content = element;` (a `PinElement.element` or a custom `HTMLElement`) |
| `marker.setVisible(false)` | `marker.map = null;` (re-show with `marker.map = mapInstance;`) |
| `google.maps.event.addListener(marker, 'click', fn)` | `marker.gmpClickable = true; marker.addEventListener('gmp-click', fn);` |

> `marker.content` takes an `HTMLElement`. There is no `setContent()` method — assignments swap the backing DOM node in place.

### Minimal example

```js
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
```

## Custom content — PinElement

`PinElement` gives you the stock balloon silhouette with re-colorable fill, border, and glyph. Use it when you want the default look with brand colors or a single-character glyph.

| Property | Purpose |
| --- | --- |
| `background` | Pin fill color (any CSS color) |
| `borderColor` | Pin outline color |
| `glyphColor` | Inner glyph/text color |
| `glyphText` | Short text (a single character works best); `''` hides the glyph |
| `glyph` | Alternative glyph — a `string`, `URL`, or `HTMLElement` |
| `scale` | Size multiplier; default `1`. Bump above `1` to meet WCAG AAA size targets |

```js
const { AdvancedMarkerElement, PinElement } =
  await google.maps.importLibrary("marker");

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
  content: pin.element, // pass the DOM element, not the PinElement wrapper
});
```

Pass `pin.element` to `content`. Some samples assign the `PinElement` directly — it appears to work due to element coercion, but `pin.element` is the unambiguous form and avoids subtle ownership bugs.

## Custom content — HTMLElement markers

Use a raw `HTMLElement` when you need a shape the `PinElement` cannot produce: price tags, avatars, brand pills, photo thumbnails, floating labels.

```js
const priceTag = document.createElement("div");
priceTag.className = "price-tag";
priceTag.textContent = "$2.5M";

const marker = new AdvancedMarkerElement({
  map,
  position: { lat: 37.42, lng: -122.1 },
  content: priceTag,
  gmpClickable: true,
  title: "1234 Example St — $2.5M", // read by screen readers, shown on hover
});
```

Style with normal CSS. The marker's anchor defaults to the bottom-center of your element; override with `marker.anchorLeft` / `marker.anchorTop` (CSS length-percentage values).

**Accessibility rules for HTMLElement markers:**

- Set `marker.gmpClickable = true` to make the marker focusable, keyboard-activatable, and emit `gmp-click`.
- Keyboard model: **Tab** focuses the first marker on the map; **arrow keys** cycle between markers; **Enter** / **Space** activates.
- `marker.title` is exposed to assistive tech and rendered as a native tooltip.
- A default focus ring is drawn around focused markers — do not suppress it with `outline: none` in your custom element's CSS.
- Keep the interactive surface large enough to tap comfortably (WCAG AA target size).

## Clustering with MarkerClusterer

The official [`@googlemaps/markerclusterer`](https://github.com/googlemaps/js-markerclusterer) library supports `AdvancedMarkerElement`. Its internal `Marker` type is a union — `google.maps.Marker | google.maps.marker.AdvancedMarkerElement` — so you can pass advanced markers directly into `new MarkerClusterer({ map, markers })` and the clusterer branches on the runtime type when calling `setMap` / reading `position`.

**Crucial gotcha:** the library's built-in `DefaultRenderer` still emits a legacy `google.maps.Marker` for the **cluster bubble** (the numbered circle shown when markers are collapsed together). Your individual markers are advanced — the cluster bubble is not. You will see deprecation warnings in the console coming from the cluster bubble, even though none of the code you wrote uses the legacy class. The fix is to supply a custom `renderer`.

### Minimal example — advanced markers with the default renderer

```js
import { MarkerClusterer } from "@googlemaps/markerclusterer";

const { Map } = await google.maps.importLibrary("maps");
const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

const map = new Map(document.getElementById("map"), {
  center: { lat: 37.42, lng: -122.1 },
  zoom: 10,
  mapId: "DEMO_MAP_ID", // required — the clusterer does not supply one
});

const locations = [
  { lat: 37.42, lng: -122.1 },
  { lat: 37.43, lng: -122.12 },
  // ...
];

const markers = locations.map(
  (position) => new AdvancedMarkerElement({ position }),
  // NOTE: do NOT pass `map:` here — the clusterer manages map assignment
);

new MarkerClusterer({ map, markers });
```

### Custom renderer that returns an AdvancedMarkerElement for cluster bubbles

The example below is based on `@googlemaps/markerclusterer` type signatures (the published README does not show an `AdvancedMarkerElement` renderer verbatim):

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
      zIndex: 1000 + count, // denser clusters float above sparser ones
    });
  },
};

new MarkerClusterer({ map, markers, renderer });
```

### Clusterer gotchas

1. **Do not pre-assign `marker.map`** when handing markers to the clusterer. `MarkerClusterer` toggles `marker.map` on every cluster/uncluster transition; pre-setting it causes flicker and double-rendering.
2. **`mapId` is still required on the `Map`.** The clusterer does not inject one, and without it your advanced markers silently do not render — clustered or not.
3. **Use `clusterer.addMarker(marker)` / `clusterer.removeMarker(marker)`** rather than toggling `marker.map` yourself after the clusterer has taken ownership.
4. **TypeScript** — types ship with the package; add `@types/google.maps` as a dev dependency.

## InfoWindow with AdvancedMarkers

The `InfoWindow` flow is slightly different from the legacy `Marker` flow: position the `InfoWindow` by passing the marker as the `anchor` in the open options, and drive the open/close from a `gmp-click` listener.

```js
const infoWindow = new google.maps.InfoWindow();

marker.gmpClickable = true;
marker.addEventListener("gmp-click", () => {
  infoWindow.setContent(`<div>${marker.title}</div>`);
  infoWindow.open({ map, anchor: marker });
});
```

Notes:

- Pass the options object (`{ map, anchor }`); do not call `.open()` on the marker.
- The InfoWindow tail anchors to the marker's bottom-center by default, or to `anchorLeft` / `anchorTop` if you overrode them.
- When the user closes the InfoWindow, focus returns to the marker — important for keyboard users.

## Accessibility and collision

**Accessibility** — covered above under HTMLElement markers. The short version: set `gmpClickable = true`, set a meaningful `title`, do not suppress the focus ring, and keep the tap target large.

**Collision behavior** is opt-in and controlled per marker via `collisionBehavior`. Advanced markers do **not** auto-collide or auto-hide; the default is `REQUIRED` (always display regardless of overlap). This is a deliberate design choice — the library leaves collision strategy to the app.

Values on `google.maps.CollisionBehavior`:

- **`REQUIRED`** (default) — always display.
- **`OPTIONAL_AND_HIDES_LOWER_PRIORITY`** — display only if no overlap; ties break by `zIndex`, then by lower vertical screen position.
- **`REQUIRED_AND_HIDES_OPTIONAL`** — always display and additionally hide overlapping `OPTIONAL_AND_HIDES_LOWER_PRIORITY` markers and map labels.

```js
new AdvancedMarkerElement({
  map,
  position,
  collisionBehavior: google.maps.CollisionBehavior.REQUIRED_AND_HIDES_OPTIONAL,
  zIndex: 5,
});
```

Collision behavior only functions on vector maps — which is the only mode that supports advanced markers anyway (i.e. with a `mapId`).

## React / Next.js — advanced-marker-specific notes

Two things are specific to `AdvancedMarkerElement` in React/Next.js and belong here rather than in the general integration guide: (a) because marker instances are real DOM nodes that Google relocates into its own overlay layer, React-owned children placed inside `marker.content` can be lost during reconciliation — render them into a detached `div` via `ReactDOM.createPortal` and pass that `div` as `content`, or use `@vis.gl/react-google-maps`'s `<AdvancedMarker>` wrapper which handles the portal for you; and (b) Strict Mode double-invocation will create and destroy markers twice in development, so effect teardown **must** assign `marker.map = null` and remove any `gmp-click` listeners, otherwise orphan markers accumulate. For loader placement, client-boundary rules, and broader HMR guidance, see [`react-nextjs-integration.md`](./react-nextjs-integration.md).
