---
title: Routes API and Directions
source_url: https://developers.google.com/maps/documentation/routes/overview
---

# Routes API and Directions

The Routes API computes routes between locations. It replaces the legacy Directions API with better performance, more routing options, and support for field masks. It's available as a REST API and through the Maps JavaScript API's `DirectionsService`.

## Routes API (REST)

### Compute Routes

The primary endpoint for calculating a route:

```
POST https://routes.googleapis.com/directions/v2:computeRoutes
```

Request body:

```json
{
  "origin": {
    "location": {
      "latLng": { "latitude": 40.7128, "longitude": -74.0060 }
    }
  },
  "destination": {
    "location": {
      "latLng": { "latitude": 34.0522, "longitude": -118.2437 }
    }
  },
  "travelMode": "DRIVE",
  "routingPreference": "TRAFFIC_AWARE",
  "computeAlternativeRoutes": true,
  "languageCode": "en-US"
}
```

Required headers:
- `X-Goog-Api-Key: YOUR_API_KEY`
- `X-Goog-FieldMask: routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline`

The field mask is critical — it controls both what's returned and what you're billed for.

## Travel Modes

- `DRIVE` — Car routing with real-time traffic
- `WALK` — Pedestrian routing
- `BICYCLE` — Cycling routes
- `TRANSIT` — Public transportation (bus, train, subway)
- `TWO_WHEELER` — Motorcycle/scooter routing (select regions)

## Routing Preferences

- `TRAFFIC_UNAWARE` — Fastest route without traffic data (cheapest)
- `TRAFFIC_AWARE` — Considers current traffic conditions
- `TRAFFIC_AWARE_OPTIMAL` — Most accurate traffic routing (most expensive)

## Waypoints

Add intermediate stops to a route:

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

Setting `optimizeWaypointOrder: true` reorders waypoints for the most efficient route.

## Route Matrix

Compute travel times between multiple origins and destinations:

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

## JavaScript API — DirectionsService

For client-side routing within the Maps JavaScript API:

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

## Displaying Route Steps

Render turn-by-turn directions:

```javascript
const steps = result.routes[0].legs[0].steps;
const stepsContainer = document.getElementById("directions-panel");

steps.forEach((step, i) => {
  const div = document.createElement("div");
  div.innerHTML = `<strong>Step ${i + 1}:</strong> ${step.instructions} (${step.distance.text})`;
  stepsContainer.appendChild(div);
});
```

## Geocoding API

Convert addresses to coordinates and vice versa:

### Forward Geocoding

```javascript
const geocoder = new google.maps.Geocoder();

geocoder.geocode({ address: "1600 Amphitheatre Parkway, Mountain View, CA" }, (results, status) => {
  if (status === "OK") {
    const location = results[0].geometry.location;
    console.log(location.lat(), location.lng());
    map.setCenter(location);
  }
});
```

### Reverse Geocoding

```javascript
geocoder.geocode({ location: { lat: 40.714224, lng: -73.961452 } }, (results, status) => {
  if (status === "OK" && results[0]) {
    console.log(results[0].formatted_address);
  }
});
```

## Common Errors

- `ZERO_RESULTS` — No route found between origin and destination
- `NOT_FOUND` — One of the locations could not be geocoded
- `MAX_WAYPOINTS_EXCEEDED` — More than 25 waypoints (free tier limit)
- `OVER_QUERY_LIMIT` — Too many requests; implement exponential backoff
