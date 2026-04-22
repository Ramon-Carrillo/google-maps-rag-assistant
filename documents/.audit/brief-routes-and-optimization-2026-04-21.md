---
title: Research Brief — Routes API and Route Optimization API
fetch_date: 2026-04-21
researcher: maps-docs-researcher
scope: Two distinct Google Maps Platform products currently conflated in local routes-api.md
sources:
  - https://developers.google.com/maps/documentation/routes
  - https://developers.google.com/maps/documentation/routes/overview
  - https://developers.google.com/maps/documentation/routes/compute_route_directions
  - https://developers.google.com/maps/documentation/route-optimization
  - https://developers.google.com/maps/documentation/route-optimization/overview
  - https://developers.google.com/maps/billing-and-pricing/pricing
  - https://developers.google.com/maps/deprecations
---

# Research Brief — Routes API and Route Optimization API

The writer should split the existing `routes-api.md` into **two files**:
1. `routes-api.md` — REST routing (Compute Routes + Route Matrix)
2. `route-optimization.md` — Fleet/vehicle tour optimization

Geocoding content currently embedded in `routes-api.md` should be removed; a separate researcher is handling `geocoding.md`.

---

## 1. Routes API

### 1.1 Canonical name
The product page at `developers.google.com/maps/documentation/routes` uses the H1 **"Routes API"**. The overview page for the primary method is titled **"Compute Routes Overview"**. "Routes API" remains the current, canonical product name.

### 1.2 Endpoints

Two REST endpoints, both under `routes.googleapis.com`:

| Purpose | Method + URL |
|---|---|
| Single route between two places | `POST https://routes.googleapis.com/directions/v2:computeRoutes` |
| Many-to-many travel times/distances | `POST https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix` |

Both require the headers:
- `Content-Type: application/json`
- `X-Goog-Api-Key: YOUR_API_KEY`
- `X-Goog-FieldMask: <comma-separated field paths>`

The field mask is load-bearing: it controls both the response shape **and** the SKU tier billed (Essentials/Pro/Enterprise depend on which fields you request).

### 1.3 SKUs and pricing (per 1,000 requests, fetched 2026-04-21)

Routes API is billed under tiered SKUs. Each of Compute Routes and Compute Route Matrix has Essentials, Pro, and Enterprise variants. Pricing is identical across the two endpoints:

**Compute Routes — Essentials** (free cap 10,000/mo)
- 0–100K: $5.00 · 100K–500K: $4.00 · 500K–1M: $3.00 · 1M–5M: $1.50 · 5M+: $0.38

**Compute Routes — Pro** (free cap 5,000/mo)
- 0–100K: $10.00 · 100K–500K: $8.00 · 500K–1M: $6.00 · 1M–5M: $3.00 · 5M+: $0.75

**Compute Routes — Enterprise** (free cap 1,000/mo)
- 0–100K: $15.00 · 100K–500K: $12.00 · 500K–1M: $9.00 · 1M–5M: $4.50 · 5M+: $1.14

**Compute Route Matrix — Essentials / Pro / Enterprise** — same numbers as Compute Routes above.

Which tier you hit is determined by the field mask:
- Essentials: basic distance/duration/polyline fields
- Pro: adds traffic-aware routing, travel advisories, etc.
- Enterprise: adds the richest fields (e.g. fuel-efficient routing, detailed leg/step data)

For the exact field-to-tier mapping, the writer should link to `developers.google.com/maps/billing-and-pricing/pricing` rather than copy the list — it changes.

### 1.4 Legacy Directions API status

The public deprecations page (`developers.google.com/maps/deprecations`) does **not currently list Directions API or Distance Matrix API as deprecated or retired** as of the 2026-04-21 fetch. Google positions Routes API as the recommended successor: the Routes product landing page prominently links **"Migrate from Directions or Distance Matrix APIs"** and a **"Why migrate to the Routes API?"** rationale page. Writer guidance: describe Directions API as **"legacy — still available but superseded by Routes API; Google recommends new integrations use Routes API"**. Do not claim a sunset date unless Google publishes one.

### 1.5 Minimal working example — Compute Routes

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

Travel modes: `DRIVE`, `WALK`, `BICYCLE`, `TRANSIT`, `TWO_WHEELER`.
Routing preferences: `TRAFFIC_UNAWARE` (cheapest), `TRAFFIC_AWARE`, `TRAFFIC_AWARE_OPTIMAL`.

### 1.6 When to pick Routes API over Directions API

Pick **Routes API** for any new build: it offers field masks (pay only for fields you request), better traffic models, two-wheeler routing, toll/fuel-aware options, and is the product Google is actively investing in. Directions API remains for legacy integrations but is not being extended.

---

## 2. Route Optimization API

### 2.1 Distinct product — confirmed
The Route Optimization API has its own product section on `developers.google.com/maps/documentation/route-optimization`. Google's own landing text:

> "The Route Optimization API assigns tasks and routes to a vehicle fleet, optimizing against the objectives and constraints that you supply for your transportation goals."

The overview page H1 is **"What is the Route Optimization API"**. In Google's docs navigation, "Routes API" and "Route Optimization API" appear as **separate siblings** under the Routes product family — they are not the same product.

### 2.2 What it does
Solves the **vehicle routing problem (VRP)**: given N vehicles with capacities/shifts/start-end locations and M shipments/tasks with time windows, produce an optimized assignment and ordered tour per vehicle. This is an optimization/solver product, not a point-A-to-point-B directions product.

### 2.3 Endpoints (methods)

| Method | Use |
|---|---|
| `optimizeTours` | Synchronous — returns an optimized route with visits and metrics (JSON or gRPC proto) |
| `batchOptimizeTours` | Long-running operation; returns an operation resource name you poll |

Both are exposed as REST and gRPC. Client libraries exist for Java, Python, Node, Go, etc. (`googleapis/google-cloud-*` repos).

### 2.4 SKUs and pricing (per 1,000 requests, fetched 2026-04-21)

Route Optimization has its **own two SKUs**, separate from Routes API:

**SingleVehicleRouting (Pro)** — one vehicle per request, free cap 5,000/mo
- 0–100K: $10.00 · 100K–500K: $4.00 · 500K–1M: $2.00 · 1M–5M: $0.80 · 5M+: $0.70

**FleetRouting (Enterprise)** — multi-vehicle fleet optimization, free cap 1,000/mo
- 0–100K: $30.00 · 100K–500K: $14.00 · 500K–1M: $6.00 · 1M–5M: $2.40 · 5M+: $2.10

Note the price gap: FleetRouting is ~3× SingleVehicleRouting at low volume — the multi-vehicle solver is the premium capability.

### 2.5 SingleVehicleRouting vs FleetRouting — when to use each

- **SingleVehicleRouting**: requests constrained to one vehicle. Use for single-driver route sequencing (e.g. one courier's day of stops, optimize-waypoints-on-steroids). Cheaper tier.
- **FleetRouting**: requests with multiple vehicles. Use when the solver must decide *which* driver gets *which* shipment in addition to stop order (delivery fleets, field-service dispatch, logistics).

The SKU is determined by the shape of the request (one vehicle vs many), not by calling different endpoints.

### 2.6 Minimal example — optimizeTours (shape)

The request body sent to `optimizeTours` is a `ShipmentModel` wrapped in an `OptimizeToursRequest`. Minimal shape:

```json
{
  "model": {
    "shipments": [
      {
        "deliveries": [
          {
            "arrivalLocation": { "latitude": 37.789, "longitude": -122.402 },
            "duration": "150s"
          }
        ]
      }
    ],
    "vehicles": [
      {
        "startLocation": { "latitude": 37.773, "longitude": -122.413 },
        "endLocation":   { "latitude": 37.773, "longitude": -122.413 },
        "costPerHour": 40
      }
    ],
    "globalStartTime": "2026-04-22T08:00:00Z",
    "globalEndTime":   "2026-04-22T18:00:00Z"
  }
}
```

Call via the generated client library (recommended) or REST:
`POST https://routeoptimization.googleapis.com/v1/projects/PROJECT_ID:optimizeTours`

Response contains `routes[]`, each with an ordered `visits[]` array and aggregate `metrics` (travel time, distance, cost). Writer should link readers to the Google client libraries page rather than hand-rolling auth, because this endpoint requires Google Cloud project-scoped credentials (not just an API key header like Routes API).

---

## 3. When to choose which

**One-sentence rule:** Use **Routes API** when you need the best path between known origins and destinations; use **Route Optimization API** when you need the solver to decide **which stops go on which vehicle and in what order**, given constraints like capacity, time windows, and shift hours.

| Signal | Product |
|---|---|
| "What's the ETA from A to B?" | Routes API — Compute Routes |
| "Travel time grid between N origins and M destinations" | Routes API — Compute Route Matrix |
| "Order these 20 stops optimally for one driver" | Route Optimization — SingleVehicleRouting |
| "Assign 200 deliveries to 15 drivers across the day" | Route Optimization — FleetRouting |

---

## 4. Notes for the writer

- Remove the `## Geocoding API` section (lines ~149–175 of current `routes-api.md`). A separate researcher owns `geocoding.md`.
- The existing `## JavaScript API — DirectionsService` section belongs in `routes-api.md` (client-side companion to Routes) — keep it but note it uses the legacy `DirectionsService` class name for historical reasons.
- The `MAX_WAYPOINTS_EXCEEDED — More than 25 waypoints (free tier limit)` line is stale phrasing; Routes API's `intermediates` limit is documented per-endpoint — recommend dropping the "free tier limit" gloss.
- Do not copy full pricing tables into production docs without a "verify on pricing page" caveat — Google adjusts these.
