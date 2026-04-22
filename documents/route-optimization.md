---
title: Route Optimization API
source_url: https://developers.google.com/maps/documentation/route-optimization/overview
---

# Route Optimization API

> **Decision rule:** Use the [Routes API](./routes-api.md) when origins and destinations are known. Use the Route Optimization API when the solver must decide which stops go on which vehicle in what order.

The **Route Optimization API** is a distinct Google Maps Platform product — **not** the same as the Routes API. In Google's docs navigation, "Routes API" and "Route Optimization API" are separate siblings under the Routes product family.

From Google's own landing page:

> "The Route Optimization API assigns tasks and routes to a vehicle fleet, optimizing against the objectives and constraints that you supply for your transportation goals."

## Problem domain — Vehicle Routing Problem (VRP)

Route Optimization solves the **vehicle routing problem**: given N vehicles (with capacities, shift windows, start/end locations) and M shipments/tasks (with time windows and service durations), produce an optimized assignment and an ordered tour per vehicle.

This is an optimization/solver product, not a point-A-to-point-B directions product. Typical inputs include:

- Vehicle capacities, costs, and shift hours
- Shipment pickup/delivery locations with time windows
- Global start/end times for the planning horizon
- Cost objectives (per hour, per kilometer, per visit)

## Methods

Both methods are exposed as REST and gRPC; client libraries exist for Java, Python, Node, Go, and more (`googleapis/google-cloud-*`).

| Method | Use |
|---|---|
| `optimizeTours` | **Synchronous** — returns an optimized plan with visits and metrics |
| `batchOptimizeTours` | **Long-running operation** — returns an operation resource name you poll |

REST endpoint example:

```
POST https://routeoptimization.googleapis.com/v1/projects/PROJECT_ID:optimizeTours
```

## SKUs and pricing

Route Optimization has its **own two SKUs**, separate from Routes API. At the 0–100K band (per 1,000 requests):

| SKU | Tier | Price / 1K (0–100K) | Use |
|---|---|---|---|
| SingleVehicleRouting | Pro | **$10.00** | One vehicle per request — sequence stops for a single driver |
| FleetRouting | Enterprise | **$30.00** | Multi-vehicle fleet — solver assigns shipments to vehicles |

The SKU is determined by the **shape of the request** (one vehicle vs. many), not by calling different endpoints. FleetRouting is roughly 3x the price of SingleVehicleRouting at low volume — the multi-vehicle solver is the premium capability. Verify current pricing at <https://developers.google.com/maps/billing-and-pricing/pricing>.

## Authentication

Unlike the Routes API, Route Optimization **does not accept a plain `X-Goog-Api-Key` header**. It requires Google Cloud project-scoped credentials (service account or Application Default Credentials). In practice, use the generated Google Cloud client libraries rather than hand-rolling auth:

- Python: `google-cloud-optimization`
- Node: `@googlemaps/routeoptimization`
- Java: `com.google.maps.routeoptimization`
- Go: `cloud.google.com/go/maps/routeoptimization`

## Minimal working example — optimizeTours

The request body is a `ShipmentModel` wrapped in an `OptimizeToursRequest`:

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

POST to:

```
https://routeoptimization.googleapis.com/v1/projects/PROJECT_ID:optimizeTours
```

The response contains `routes[]` — one entry per vehicle, each with an ordered `visits[]` array — plus aggregate `metrics` (travel time, distance, cost).

## When to choose it

Choose Route Optimization **when the solver must decide which stops go on which vehicle in what order**, given constraints like capacity, time windows, and shift hours.

| Signal | Product |
|---|---|
| "What's the ETA from A to B?" | [Routes API](./routes-api.md) — Compute Routes |
| "Travel time grid between N origins and M destinations" | [Routes API](./routes-api.md) — Compute Route Matrix |
| "Order these 20 stops optimally for one driver" | Route Optimization — SingleVehicleRouting |
| "Assign 200 deliveries across 15 drivers for the day" | Route Optimization — FleetRouting |
