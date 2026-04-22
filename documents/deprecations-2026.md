---
title: Deprecations and Migration Guide
source_url: https://developers.google.com/maps/deprecations
---

# Deprecations and Migration Guide

Google Maps Platform regularly deprecates older APIs and features in favor of improved replacements. This document covers active deprecations and migration paths relevant in 2026.

## google.maps.Marker → AdvancedMarkerElement

**Status**: `google.maps.Marker` is deprecated. Use `AdvancedMarkerElement` instead.

**Why**: AdvancedMarkerElement offers better performance, accessibility, custom HTML content support, and collision handling.

**Migration**:

```javascript
// OLD (deprecated)
const marker = new google.maps.Marker({
  position: { lat: 40.7128, lng: -74.0060 },
  map,
  title: "NYC",
  icon: "custom-icon.png",
});

// NEW (recommended)
const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
const marker = new AdvancedMarkerElement({
  position: { lat: 40.7128, lng: -74.0060 },
  map,
  title: "NYC",
});
```

**Requirements for AdvancedMarkerElement**:
- Must use a `mapId` in the Map constructor
- Import the `marker` library explicitly
- Custom icons use HTML `content` property instead of `icon`

### Custom Icons Migration

```javascript
// OLD
new google.maps.Marker({
  icon: {
    url: "icon.png",
    scaledSize: new google.maps.Size(32, 32),
  },
});

// NEW
const img = document.createElement("img");
img.src = "icon.png";
img.width = 32;
img.height = 32;

new AdvancedMarkerElement({
  content: img,
  map,
  position,
});
```

## Legacy Places API → Places API (New)

**Status**: The legacy Places API (`PlacesService`) is being replaced by the `Place` class and new endpoints.

**Key changes**:
- Callback-based API → Promise-based API
- No field masking → Required field masking (cost optimization)
- `PlacesService` → `Place` class
- `getDetails()` → `fetchFields()`

**Migration example**:

```javascript
// OLD (legacy)
const service = new google.maps.places.PlacesService(map);
service.getDetails(
  { placeId: "ChIJ...", fields: ["name", "geometry"] },
  (place, status) => {
    if (status === google.maps.places.PlacesServiceStatus.OK) {
      console.log(place.name);
    }
  }
);

// NEW (recommended)
const { Place } = await google.maps.importLibrary("places");
const place = new Place({ id: "ChIJ..." });
await place.fetchFields({ fields: ["displayName", "location"] });
console.log(place.displayName);
```

## Directions API → Routes API

**Status**: The legacy Directions API continues to work but the Routes API is the recommended replacement for server-side routing.

**Key improvements in Routes API**:
- Field masking support (pay only for what you use)
- Better traffic modeling
- Polyline quality options
- Toll information
- Two-wheeler routing

**Note**: The JavaScript API's `DirectionsService` and `DirectionsRenderer` remain the recommended approach for client-side route display.

## Map Styling: Legacy JSON → Cloud-Based Styling

**Status**: Legacy `styles` array in the Map constructor is deprecated.

**Migration**:

```javascript
// OLD — inline styles array (deprecated)
const map = new google.maps.Map(element, {
  center: { lat: 0, lng: 0 },
  zoom: 2,
  styles: [
    { featureType: "water", stylers: [{ color: "#004358" }] },
    { featureType: "poi", stylers: [{ visibility: "off" }] },
  ],
});

// NEW — Cloud-based styling via Map ID
const map = new google.maps.Map(element, {
  center: { lat: 0, lng: 0 },
  zoom: 2,
  mapId: "YOUR_MAP_ID", // Style configured in Cloud Console
});
```

**Benefits of Cloud-based styling**:
- Update styles without code changes
- A/B test different styles
- Same style across platforms (web, Android, iOS)
- Better performance (styles applied server-side)

## Elevation API Changes

The Elevation API remains available but has new per-request pricing. Consider whether you truly need elevation data and cache results aggressively.

## Best Practices for Staying Current

1. **Subscribe to the Google Maps Platform blog** for deprecation announcements
2. **Check the deprecation schedule** quarterly
3. **Use the latest API version** (`v: "weekly"` or `v: "quarterly"`)
4. **Test with `v: "beta"`** to preview upcoming changes
5. **Monitor console warnings** — deprecated features log warnings before removal
6. **Review the migration guides** on Google's developer documentation when upgrading
