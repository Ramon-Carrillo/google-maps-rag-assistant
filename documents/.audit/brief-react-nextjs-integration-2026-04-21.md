---
brief: react-nextjs-integration
fetch_date: 2026-04-22
researcher: maps-docs-researcher
target_doc: /documents/react-nextjs-integration.md
status: NEW (no existing file)
---

# Brief: React + Next.js Integration for Google Maps

## Primary sources

Google (official):
- https://developers.google.com/maps/documentation/javascript/load-maps-js-api — the canonical loader-options page; this is the recommended `source_url` for the new doc's frontmatter
- https://www.npmjs.com/package/@googlemaps/js-api-loader — `@googlemaps/js-api-loader` v2.0.2 (Oct 29 2025)
- https://github.com/googlemaps/js-api-loader — same package, source

Community wrappers (canonical in their ecosystems, allowed exception):
- https://github.com/visgl/react-google-maps — `@vis.gl/react-google-maps` v1.8.3 (Apr 9 2026), ~1.9k stars, maintained by vis.gl org (Uber-originated, Google-adjacent, MIT)
- https://visgl.github.io/react-google-maps/ — official docs
- https://github.com/JustFly1984/react-google-maps-api — `@react-google-maps/api` v3.x, ~2k stars, single maintainer (JustFly1984), SSR-friendly per README
- https://react-google-maps-api-docs.netlify.app — docs site

Note: two wrapper-library URLs (the js-api-loader npm page and the vis.gl docs site) were blocked by WebFetch permissions this session; their content was recovered via the GitHub README and the Google loader page respectively. Fetch date 2026-04-22.

## Current reality — Google's official loader landscape

Google offers **three** official loaders, in order of modernity:

1. **Dynamic Library Import (inline bootstrap)** — the obfuscated `(g=>{...})({key, v})` snippet dropped into `<script>`. Installs the global `google.maps.importLibrary()`. Google's stated benefit: "protects your page from loading the Maps JavaScript API multiple times." **This is the 2026 recommended approach** for HTML-first projects.

2. **`@googlemaps/js-api-loader` v2.x (NPM)** — the npm-packaged equivalent of the inline bootstrap. In v2 (Oct 2025) the API is `setOptions({ key, v })` + `await importLibrary('maps')`. The old `new Loader({...}).load()` class API still works but is effectively superseded. **This is the right choice for React/Next.js** (typed, tree-shakable, no script-tag juggling).

3. **Legacy direct script tag** — `<script async src="...&callback=initMap">`. Google keeps it for `<gmp-map>` custom-element use and simple static sites. Avoid in React.

### The `importLibrary` pattern

```ts
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

setOptions({ key: API_KEY, v: "weekly" });
const { Map }                  = await importLibrary("maps");
const { AdvancedMarkerElement } = await importLibrary("marker");
const { Places }               = await importLibrary("places");
```

Libraries load on-demand, so the initial JS payload is small.

## Wrapper library comparison

| | `@vis.gl/react-google-maps` | `@react-google-maps/api` |
|---|---|---|
| Version / date | v1.8.3 (Apr 2026) | v3.x (actively maintained) |
| Stars | ~1.9k | ~2k |
| Maintainer | vis.gl org (team) | JustFly1984 (solo) |
| Component for map | `<Map>` inside `<APIProvider>` | `<GoogleMap>` inside `<LoadScript>` / `useJsApiLoader` |
| Advanced Markers | first-class `<AdvancedMarker>` | supported via `MarkerF` / manual |
| SSR story | Client-only components; pair with `'use client'` | README claims "SSR friendly, works with Next.js and Remix" |
| Under the hood | Uses Google's Dynamic Library Import | Uses `@googlemaps/js-api-loader` |

**Verdict:** For new React 19 / Next.js App Router projects in 2026, **`@vis.gl/react-google-maps`** is the better default — team-maintained, built around `importLibrary` and AdvancedMarkerElement from day one, cleaner StrictMode behavior thanks to context-based provider. `@react-google-maps/api` remains viable for existing codebases and has a deeper feature inventory (DrawingManager, HeatmapLayer wrappers).

## Code examples (verified, React 19 / Next.js 15 App Router)

### A) `@vis.gl/react-google-maps` — map + AdvancedMarker in a client component

```tsx
// app/components/StoreMap.tsx
'use client';

import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

const center = { lat: 19.4326, lng: -99.1332 }; // Mexico City

export default function StoreMap() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;

  return (
    <APIProvider apiKey={apiKey} libraries={['marker']}>
      <Map
        defaultCenter={center}
        defaultZoom={12}
        mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID}
        style={{ width: '100%', height: 480 }}
        gestureHandling="cooperative"
        disableDefaultUI={false}
      >
        <AdvancedMarker position={center} title="HQ">
          <Pin background="#EA4335" borderColor="#B31412" glyphColor="#fff" />
        </AdvancedMarker>
      </Map>
    </APIProvider>
  );
}
```

### B) Google's `@googlemaps/js-api-loader` directly in an App Router client component

```tsx
// app/components/RawMap.tsx
'use client';

import { useEffect, useRef } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

// setOptions must run exactly once per page. Calling it at module scope on the
// client is safe; guard against SSR execution with typeof window.
if (typeof window !== 'undefined') {
  setOptions({ key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!, v: 'weekly' });
}

export default function RawMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([
        importLibrary('maps') as Promise<google.maps.MapsLibrary>,
        importLibrary('marker') as Promise<google.maps.MarkerLibrary>,
      ]);
      if (cancelled || !containerRef.current) return;

      const map = new Map(containerRef.current, {
        center: { lat: 19.4326, lng: -99.1332 },
        zoom: 12,
        mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID,
      });
      mapRef.current = map;

      new AdvancedMarkerElement({ map, position: map.getCenter()!, title: 'HQ' });
    })();

    return () => {
      cancelled = true;
      // Maps has no official destroy(); null out refs and drop the container.
      mapRef.current = null;
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: 480 }} />;
}
```

## Common failure modes + fixes ("loader hell")

### 1. `Loader must not be called again with different options`
**Cause:** Two code paths instantiate `new Loader({...})` (the v1 API) with different `apiKey`, `version`, or `libraries` arrays — most often because a component mounts twice (StrictMode, route revisit) or multiple components each construct their own Loader. The v1 Loader is a singleton and rejects mismatched options.
**Official fix:** Upgrade to `@googlemaps/js-api-loader` **v2** and use `setOptions` + `importLibrary`. `setOptions` warns on a second call but does not throw, and `importLibrary` is idempotent. If you must stay on v1, create **one** shared Loader instance in a module and import it everywhere.

### 2. React StrictMode double-invoke injects the script twice
**Cause:** StrictMode intentionally double-mounts components in dev; a naive `useEffect` that appends a `<script>` tag or calls `new Loader().load()` runs twice.
**Fix:** Never inject the script tag yourself in an effect. Either (a) use the inline bootstrap snippet in `app/layout.tsx` via `next/script` with `strategy="beforeInteractive"`, or (b) use `@googlemaps/js-api-loader` v2 — `importLibrary` dedupes internally. The `@vis.gl/react-google-maps` `APIProvider` is also StrictMode-safe because it uses the dedup-by-design bootstrap under the hood.

### 3. `ReferenceError: google is not defined` during Next.js App Router SSR
**Cause:** A Server Component (or a Client Component imported into a Server boundary at module top) references `google.maps.*` at module scope. The `google` global does not exist on the server.
**Fix:** Mark any file that touches `google.*` or the Maps DOM with `'use client'`. Guard module-scope loader calls with `if (typeof window !== 'undefined')`. For dynamic-only loading, use `next/dynamic` with `ssr: false`:

```tsx
const StoreMap = dynamic(() => import('./StoreMap'), { ssr: false });
```

### Bonus gotchas to flag in the doc

- **useEffect cleanup:** `google.maps.Map` has no `.destroy()`. On unmount, clear markers (`marker.map = null`), remove listeners (`google.maps.event.clearInstanceListeners(map)`), and drop your refs. The DOM node itself is removed by React.
- **Env vars:** Must be prefixed `NEXT_PUBLIC_` to be available in client components (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`). Server-only env vars are stripped from the bundle.
- **Vercel preview deploys + API key restrictions:** HTTP-referrer key restrictions fail for `*.vercel.app` preview URLs. Either (a) add `*.vercel.app/*` to the allowed referrers (broad — OK for preview keys), (b) use a separate unrestricted key gated to a preview-only Vercel env, or (c) put maps behind a same-origin proxy. Never ship an unrestricted production key.
- **React 18/19 concurrent rendering:** Map instances are imperative singletons living outside React's tree — if a Suspense boundary above your map re-suspends, the map DOM is discarded. Keep the map container in a stable subtree, or lift map state to a ref/store that survives remounts.

## Recommended frontmatter for the new doc

```yaml
---
title: Using Google Maps with React and Next.js
source_url: https://developers.google.com/maps/documentation/javascript/load-maps-js-api
---
```

Secondary citations to surface in the doc body (label clearly as community wrapper sources, not Google):
- https://github.com/visgl/react-google-maps
- https://www.npmjs.com/package/@googlemaps/js-api-loader
