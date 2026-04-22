---
title: Maps JavaScript API Overview
source_url: https://developers.google.com/maps/documentation/javascript/overview
---

# Maps JavaScript API Overview

The Maps JavaScript API lets you embed interactive Google Maps into web pages. It supports custom markers, info windows, drawing overlays, and event handling. The API is loaded via a script tag or the `@googlemaps/js-api-loader` npm package.

## Loading the API

The recommended way to load the Maps JavaScript API is using the dynamic library import with the `importLibrary()` method:

```html
<script>
  (g=>{var h,a,k,p="The Google Maps JavaScript API",c="google",l="importLibrary",q="__ib__",m=document,b=window;b=b[c]||(b[c]={});var d=b.maps||(b.maps={}),r=new Set,e=new URLSearchParams,u=()=>h||(h=new Promise(async(f,n)=>{await (a=m.createElement("script"));e.set("libraries",[...r]+"");for(k in g)e.set(k.replace(/[A-Z]/g,t=>"_"+t[0].toLowerCase()),g[k]);e.set("callback",c+".maps."+q);a.src=`https://maps.${c}apis.com/maps/api/js?`+e;d[q]=f;a.onerror=()=>h=n(Error(p+" could not load."));a.nonce=m.querySelector("script[nonce]")?.nonce||"";m.head.append(a)}));d[l]?console.warn(p+" only loads once."):d[l]=(f,...n)=>r.add(f)&&u().then(()=>d[l](f,...n))})({
    key: "YOUR_API_KEY",
    v: "weekly",
  });
</script>
```

You then import specific libraries as needed:

```javascript
const { Map } = await google.maps.importLibrary("maps");
const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
```

## Initializing a Map

A map requires a container element and initialization options including center coordinates and zoom level:

```javascript
async function initMap() {
  const { Map } = await google.maps.importLibrary("maps");

  const map = new Map(document.getElementById("map"), {
    center: { lat: 40.7128, lng: -74.0060 },
    zoom: 12,
    mapId: "YOUR_MAP_ID", // Required for AdvancedMarkerElement
  });
}
```

The `mapId` parameter is required when using AdvancedMarkerElement (the modern replacement for the legacy Marker class). Map IDs are created in the Google Cloud Console under Maps Management.

## Map Options

Key configuration options for the Map constructor:

- `center` (LatLngLiteral) — Initial center coordinates
- `zoom` (number) — Initial zoom level (0 = world, 20 = building level)
- `mapId` (string) — Links to a Cloud-based map style
- `mapTypeId` — roadmap, satellite, hybrid, or terrain
- `disableDefaultUI` (boolean) — Hides all default controls
- `zoomControl`, `mapTypeControl`, `streetViewControl`, `fullscreenControl` — Individual control toggles
- `gestureHandling` — "cooperative", "greedy", "none", or "auto"
- `restriction` — Limits the viewport to specified bounds

## AdvancedMarkerElement (Recommended)

The `AdvancedMarkerElement` class replaces the deprecated `google.maps.Marker`. It supports custom HTML content, better performance, and accessibility:

```javascript
const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

const marker = new AdvancedMarkerElement({
  map,
  position: { lat: 40.7128, lng: -74.0060 },
  title: "New York City",
});
```

To use custom HTML content instead of the default pin:

```javascript
const content = document.createElement("div");
content.innerHTML = '<span style="font-size: 2rem;">📍</span>';

const marker = new AdvancedMarkerElement({
  map,
  position: { lat: 40.7128, lng: -74.0060 },
  content,
});
```

## Info Windows

Info windows display content in a popup above the map:

```javascript
const infoWindow = new google.maps.InfoWindow({
  content: "<h3>Hello World</h3><p>This is an info window.</p>",
});

marker.addListener("click", () => {
  infoWindow.open({ anchor: marker, map });
});
```

## Event Handling

Maps and markers fire events you can listen to:

```javascript
map.addListener("click", (event) => {
  console.log("Clicked at:", event.latLng.lat(), event.latLng.lng());
});

map.addListener("zoom_changed", () => {
  console.log("Zoom:", map.getZoom());
});

map.addListener("bounds_changed", () => {
  const bounds = map.getBounds();
  // Load data within current viewport
});
```

## Cloud-Based Map Styling

Instead of the legacy `styles` array, use Cloud-based map styling via Map IDs:

1. Go to Google Cloud Console > Google Maps Platform > Map Management
2. Create a Map ID
3. Create or assign a Map Style with custom colors, features, and POI visibility
4. Pass the Map ID to your Map constructor

This approach lets you update map styles without code changes.

## Performance Tips

- **Lazy load the API** — Don't load the Maps script until the user navigates to a page that needs it
- **Use marker clustering** — For 100+ markers, use `@googlemaps/markerclusterer` to group nearby markers
- **Viewport-based loading** — Only fetch and display data within the current map bounds
- **Defer non-critical libraries** — Import only the libraries you need (`maps`, `marker`, `places`, etc.)
