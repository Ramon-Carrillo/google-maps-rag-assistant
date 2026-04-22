---
title: Routes API
source_url: https://developers.google.com/maps/documentation/routes/overview
---

# Routes API

<!-- Note: Geocoding content further down will be extracted to geocoding.md in a later batch. Do not rely on it living here long-term. -->

The **Routes API** is Google Maps Platform's current REST product for computing routes and travel-time matrices between known origins and destinations. It supersedes the legacy Directions API and Distance Matrix API.

> **Decision rule:** Use the Routes API when origins and destinations are known. Use the [Route Optimization API](./route-optimization.md) when the solver must decide which stops go on which vehicle in what order.

## Endpoints

Two REST endpoints, both served from `routes.googleapis.com`:

| Purpose | Method + URL |
|---|---|
| Single route between two places | `POST https://routes.googleapis.com/directions/v2:computeRoutes` |
| Many-to-many travel times/distances | `POST https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix` |

## Required headers

- `Content-Type: application/json`
- `X-Goog-Api-Key: YOUR_API_KEY`
- `X-Goog-FieldMask: <comma-separated field paths>`

The field mask is load-bearing: it controls both the response shape **and** the SKU tier billed. Request only the fields you actually consume.

## SKUs and pricing

Routes API is billed under tiered SKUs. Both `computeRoutes` and `computeRouteMatrix` have Essentials, Pro, and Enterprise variants at the same prices. At the 0–100K band (per 1,000 requests):

| Tier | Price / 1K (0–100K) | Typical fields |
|---|---|---|
| Essentials | **$5.00** | basic distance, duration, polyline |
| Pro | **$10.00** | traffic-aware routing, travel advisories |
| Enterprise | **$15.00** | fuel-efficient routing, detailed leg/step data |

The field you request determines the tier — not the endpoint. For the current field-to-tier mapping see <https://developers.google.com/maps/billing-and-pricing/pricing>; Google adjusts these periodically.

## Minimal working example — Compute Routes

```http
POST https://routes.googleapis.com/directions/v2:computeRoutes
Content-Type: application/json
X-Goog-Api-Key: YOUR_API_KEY
X-Goog-FieldMask: routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline
```

```json
{
  "origin": {
    "location": {
      "latLng": { "latitude": 37.419734, "longitude": -122.0827784 }
    }
  },
  "destination": {
    "location": {
      "latLng": { "latitude": 37.417670, "longitude": -122.079595 }
    }
  },
  "travelMode": "DRIVE"
}
```

**Travel modes:** `DRIVE`, `WALK`, `BICYCLE`, `TRANSIT`, `TWO_WHEELER`.
**Routing preferences:** `TRAFFIC_UNAWARE` (cheapest), `TRAFFIC_AWARE`, `TRAFFIC_AWARE_OPTIMAL`.

## Waypoints

Add intermediate stops with `intermediates`, and set `optimizeWaypointOrder: true` to let the API reorder them for the shortest route:

```json
{
  "origin": { "address": "New York, NY" },
  "destination": { "address": "Los Angeles, CA" },
  "intermediates": [
    { "address": "Chicago, IL" },
    { "address": "Denver, CO" }
  ],
  "travelMode": "DRIVE",
  "optimizeWaypointOrder": true
}
```

Per-endpoint `intermediates` limits are documented on each method page.

## Route Matrix

Compute travel times across a grid of origins and destinations:

```
POST https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix
```

```json
{
  "origins": [
    { "waypoint": { "address": "New York, NY" } },
    { "waypoint": { "address": "Boston, MA" } }
  ],
  "destinations": [
    { "waypoint": { "address": "Philadelphia, PA" } },
    { "waypoint": { "address": "Washington, DC" } }
  ],
  "travelMode": "DRIVE",
  "routingPreference": "TRAFFIC_AWARE"
}
```

## Comparison to the legacy Directions API

As of 2026-04-21, the Directions API and Distance Matrix API are **not listed as deprecated or retired** on Google's deprecations page. However, Google actively positions Routes API as their successor — the Routes product landing page prominently links a "Migrate from Directions or Distance Matrix APIs" guide and a "Why migrate to the Routes API?" rationale page.

Treat Directions API as **legacy — still available but superseded**. New integrations should use Routes API for: field masks (pay only for fields you request), better traffic models, two-wheeler routing, toll/fuel-aware options, and continued investment. No sunset date has been published.

## JavaScript API — DirectionsService

For client-side routing inside the Maps JavaScript API, the `DirectionsService` class remains available. The name is preserved for historical reasons (pre-Routes API), but it's the client-side companion to Routes:

```javascript
const directionsService = new google.maps.DirectionsService();
const directionsRenderer = new google.maps.DirectionsRenderer();

directionsRenderer.setMap(map);

const request = {
  origin: "New York, NY",
  destination: "Boston, MA",
  travelMode: google.maps.TravelMode.DRIVING,
  provideRouteAlternatives: true,
};

directionsService.route(request, (result, status) => {
  if (status === google.maps.DirectionsStatus.OK) {
    directionsRenderer.setDirections(result);

    const route = result.routes[0];
    const leg = route.legs[0];
    console.log(`Distance: ${leg.distance.text}`);
    console.log(`Duration: ${leg.duration.text}`);
  } else {
    console.error("Directions request failed:", status);
  }
});
```

### Displaying route steps

```javascript
const steps = result.routes[0].legs[0].steps;
const stepsContainer = document.getElementById("directions-panel");

steps.forEach((step, i) => {
  const div = document.createElement("div");
  div.innerHTML = `<strong>Step ${i + 1}:</strong> ${step.instructions} (${step.distance.text})`;
  stepsContainer.appendChild(div);
});
```

## Common errors

- `ZERO_RESULTS` — No route found between origin and destination
- `NOT_FOUND` — One of the locations could not be geocoded
- `MAX_WAYPOINTS_EXCEEDED` — Too many intermediate waypoints; see the per-endpoint limit on the method's reference page
- `OVER_QUERY_LIMIT` — Too many requests; implement exponential backoff

## See also

- [Route Optimization API](./route-optimization.md) — for fleet/vehicle tour optimization (the solver use case).
