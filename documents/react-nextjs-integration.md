---
title: Google Maps in React and Next.js
source_url: https://developers.google.com/maps/documentation/javascript/load-maps-js-api
---

# Google Maps in React and Next.js

Google does not publish a canonical React or Next.js integration guide for the Maps JavaScript API. This document fills that gap: it covers the current loader options, which wrapper library to pick for new projects, working App Router examples, and the three failure modes that account for most "loader hell" GitHub issues in 2026.

For base API concepts (map initialization, libraries, options), see `maps-js-api-overview.md`.

## Loading the Maps JavaScript API

Google ships three official loaders. Pick based on project type, not preference.

### 1. Dynamic Library Import (inline bootstrap) — recommended for HTML-first pages

Google's 2026 recommendation is the obfuscated bootstrap snippet that installs `google.maps.importLibrary()` as a global. Its stated benefit: "protects your page from loading the Maps JavaScript API multiple times." Use it from Next.js by injecting it via `next/script` with `strategy="beforeInteractive"` in `app/layout.tsx`.

### 2. `@googlemaps/js-api-loader` v2 — recommended for React/Next.js

The npm-packaged equivalent of the bootstrap. As of v2 (Oct 2025), the API is `setOptions({ key, v })` plus `await importLibrary('maps')`. Both calls are idempotent by design — `setOptions` warns (does not throw) on duplicate calls, and `importLibrary` dedupes script injection. This is the right default for typed, tree-shakable React code.

```ts
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

setOptions({ key: API_KEY, v: 'weekly' });
const { Map } = await importLibrary('maps');
const { AdvancedMarkerElement } = await importLibrary('marker');
```

### 3. Legacy `<script>` tag / v1 `new Loader({...}).load()` — superseded

The v1 class-based Loader API still works but is superseded. The direct `<script async src="...&callback=initMap">` pattern is kept for `<gmp-map>` custom-element use and simple static sites. Do not use either in new React code.

## Choosing a React wrapper library

Two wrappers dominate. For new React 19 / Next.js 15 App Router projects, use **`@vis.gl/react-google-maps`**.

| | `@vis.gl/react-google-maps` | `@react-google-maps/api` |
|---|---|---|
| Version / date | v1.8.3 (Apr 2026) | v3.x (active) |
| Stars | ~1.9k | ~2k |
| Maintainer | vis.gl org (team) | JustFly1984 (solo) |
| Map component | `<Map>` inside `<APIProvider>` | `<GoogleMap>` inside `<LoadScript>` / `useJsApiLoader` |
| Advanced Markers | first-class `<AdvancedMarker>` | via `MarkerF` or manual |
| Under the hood | Google's Dynamic Library Import | `@googlemaps/js-api-loader` |

**Recommendation: `@vis.gl/react-google-maps`.** Team-maintained, built around `importLibrary` and `AdvancedMarkerElement` from day one, and StrictMode-safe because its `APIProvider` sits on the dedup-by-design bootstrap. `@react-google-maps/api` remains viable for existing codebases and has a deeper inventory of legacy-feature wrappers (DrawingManager, HeatmapLayer), but start new work on vis.gl.

Sources: https://github.com/visgl/react-google-maps, https://www.npmjs.com/package/@googlemaps/js-api-loader (community wrapper, not Google).

## Minimal working examples

### A. `@vis.gl/react-google-maps` in a Next.js 15 App Router client component

```tsx
// app/components/StoreMap.tsx
'use client';

import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

const center = { lat: 19.4326, lng: -99.1332 };

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
      >
        <AdvancedMarker position={center} title="HQ">
          <Pin background="#EA4335" borderColor="#B31412" glyphColor="#fff" />
        </AdvancedMarker>
      </Map>
    </APIProvider>
  );
}
```

### B. `@googlemaps/js-api-loader` v2 directly in an App Router client component

```tsx
// app/components/RawMap.tsx
'use client';

import { useEffect, useRef } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

// setOptions should run exactly once per page. Module-scope is fine on the
// client; guard against SSR execution with typeof window.
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
      mapRef.current = null;
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: 480 }} />;
}
```

## Common failure modes and fixes

### 1. `Loader must not be called again with different options`

**Cause.** Two code paths instantiate `new Loader({...})` (the v1 API) with different `apiKey`, `version`, or `libraries` arrays — often because a component mounts twice (StrictMode, route revisit) or multiple components each construct their own Loader. The v1 Loader is a singleton and rejects mismatched options.

**Fix.** Upgrade to `@googlemaps/js-api-loader` **v2** and use `setOptions` + `importLibrary`. `setOptions` warns on a second call but does not throw, and `importLibrary` is idempotent. If you must stay on v1, create **one** shared Loader instance in a module and import it from every call site.

### 2. React StrictMode double-invoke injects the script twice

**Cause.** StrictMode intentionally double-mounts components in development; a naive `useEffect` that appends a `<script>` tag or calls `new Loader().load()` runs twice.

**Fix.** Never inject the script tag yourself inside an effect. Either (a) use the inline bootstrap snippet in `app/layout.tsx` via `next/script` with `strategy="beforeInteractive"`, or (b) use `@googlemaps/js-api-loader` v2 — `importLibrary` dedupes internally. `@vis.gl/react-google-maps`'s `APIProvider` is also StrictMode-safe for the same reason.

### 3. `ReferenceError: google is not defined` during App Router SSR

**Cause.** A Server Component (or a Client Component imported into a Server boundary with `google.maps.*` referenced at module scope) touches the `google` global, which does not exist on the server.

**Fix.** Mark any file that references `google.*` or the Maps DOM with `'use client'`. Guard module-scope loader calls with `if (typeof window !== 'undefined')`. For components that should never render on the server, use `next/dynamic` with `ssr: false`:

```tsx
import dynamic from 'next/dynamic';
const StoreMap = dynamic(() => import('./StoreMap'), { ssr: false });
```

## Production gotchas

- **useEffect cleanup.** `google.maps.Map` has no `.destroy()`. On unmount, clear listeners with `google.maps.event.clearInstanceListeners(map)`, drop each marker by setting `marker.map = null`, and null out your refs. React removes the DOM node; the instance is GC'd once nothing holds it.

- **Environment variables.** Client code can only read env vars prefixed `NEXT_PUBLIC_`. Use `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` and `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`. Server-only variables are stripped from the client bundle, so an unprefixed key is invisible to the browser.

- **Vercel preview deploys and referrer restrictions.** HTTP-referrer key restrictions fail on `*.vercel.app` preview URLs because every preview gets a unique hostname. Options: (a) add `*.vercel.app/*` to the allowed referrers on a preview-only key (acceptable breadth for a preview key, never for production), (b) use a separate unrestricted key gated to a preview-only Vercel environment variable, or (c) proxy Maps through your own origin. Do not ship an unrestricted production key.

- **Concurrent rendering.** Map instances are imperative singletons living outside React's tree. If a Suspense boundary above the map re-suspends, the map DOM is discarded and recreated. Keep the map container in a stable subtree, or lift map state into a ref or store that survives remounts.

## Related docs

- `maps-js-api-overview.md` — base Maps JavaScript API concepts, library imports, map options.
- `deprecations-2026.md` — `google.maps.Marker` deprecation and the move to `AdvancedMarkerElement`.
- `troubleshooting.md` — general API-key and billing error messages.
