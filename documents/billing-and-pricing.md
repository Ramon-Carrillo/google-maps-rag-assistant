---
title: Google Maps Platform Billing and Pricing
source_url: https://developers.google.com/maps/billing-and-pricing/pricing
---

# Google Maps Platform Billing and Pricing

Google Maps Platform uses a pay-as-you-go pricing model. Every Google Cloud account with Maps APIs enabled receives a $200 USD monthly credit applied automatically. For most small-to-medium applications, this credit covers all usage.

## The $200 Monthly Credit

- Applied automatically each month — no action required
- Covers all Maps Platform APIs (Maps, Routes, Places)
- Resets on the first of each month
- Cannot be accumulated or rolled over
- Applies per billing account, not per project

At typical usage levels, the $200 credit covers approximately:
- 28,500 Dynamic Maps loads
- 40,000 Directions API calls
- 10,000 Place Details calls

## SKU-Based Pricing

Each API call is billed as a specific SKU (Stock Keeping Unit). The cost depends on the API, the request type, and the fields requested.

### Maps JavaScript API

| SKU | Price per 1,000 requests |
|-----|-------------------------|
| Dynamic Maps | $7.00 |
| Dynamic Street View | $7.00 |
| Static Maps | $2.00 |
| Static Street View | $2.00 |

A "Dynamic Maps" load is counted each time a map is initialized with the Maps JavaScript API.

### Places API

| SKU | Price per 1,000 requests |
|-----|-------------------------|
| Autocomplete (per session) | $2.83 |
| Autocomplete without session token (per request) | $2.83 |
| Place Details (Basic) | $5.00 |
| Place Details (Contact) | $3.00 |
| Place Details (Atmosphere) | $5.00 |
| Find Place | $5.00 |
| Nearby Search | $5.00 |
| Text Search | $5.00 |
| Place Photo | $7.00 |

**Critical cost optimization**: Use session tokens with Autocomplete. Without session tokens, each keystroke is billed as a separate Autocomplete request. With session tokens, the entire autocomplete session plus the subsequent Place Details call is billed as a single session.

### Routes API

| SKU | Price per 1,000 requests |
|-----|-------------------------|
| Routes: Compute Routes Basic | $5.00 |
| Routes: Compute Routes Advanced | $10.00 |
| Routes: Compute Routes Preferred (traffic) | $15.00 |
| Route Matrix Basic | $5.00 |
| Route Matrix Advanced | $10.00 |

The tier depends on the routing preference:
- Basic = `TRAFFIC_UNAWARE`
- Advanced = `TRAFFIC_AWARE`
- Preferred = `TRAFFIC_AWARE_OPTIMAL`

### Geocoding API

| SKU | Price per 1,000 requests |
|-----|-------------------------|
| Geocoding | $5.00 |
| Reverse Geocoding | $5.00 |

## Cost Optimization Strategies

### 1. Use Field Masks

For Places API (New) and Routes API, always specify the minimum fields needed:

```javascript
// Bad — fetches everything, costs more
await place.fetchFields({ fields: ["*"] });

// Good — only fetch what you need
await place.fetchFields({ fields: ["displayName", "location"] });
```

### 2. Use Session Tokens for Autocomplete

```javascript
const token = new google.maps.places.AutocompleteSessionToken();
// Attach to all autocomplete requests in the same user session
```

### 3. Cache Results

Cache geocoding and place details results on your server. Google's Terms of Service allow caching for up to 30 days (check current ToS for exact limits).

### 4. Set Quota Limits

In the Google Cloud Console, set daily quota limits per API to prevent unexpected charges:

1. Go to APIs & Services > Google Maps Platform
2. Select the API
3. Go to Quotas & System Limits
4. Set a daily request limit

### 5. Use Budget Alerts

Set up billing alerts in Cloud Console:
1. Go to Billing > Budgets & Alerts
2. Create a budget (e.g., $200/month to match the free credit)
3. Set alert thresholds at 50%, 90%, and 100%

## Billing Account Requirements

- A valid billing account must be linked to your Google Cloud project
- Credit card or bank account required (even if usage stays within the $200 credit)
- APIs will stop working if the billing account is suspended or the payment method fails
- A project without a billing account will show `BillingNotEnabledMapError`

## Monitoring Usage

View real-time usage and costs in the Cloud Console:

1. Go to Google Maps Platform > Metrics
2. View request counts, error rates, and latency per API
3. Use the billing dashboard to see current month charges vs. the $200 credit
