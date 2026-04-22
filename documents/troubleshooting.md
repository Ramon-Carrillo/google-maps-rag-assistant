---
title: Common Errors and Troubleshooting
source_url: https://developers.google.com/maps/documentation/javascript/error-messages
---

# Common Errors and Troubleshooting

This document covers the most frequent errors developers encounter when working with the Google Maps Platform, along with solutions.

## Map Loading Errors

### RefererNotAllowedMapError

**Symptom**: Map loads as a dark/grey box with a watermark. Console shows `RefererNotAllowedMapError`.

**Cause**: The HTTP referrer of your page doesn't match the website restrictions configured for your API key.

**Fix**:
1. Go to Google Cloud Console > Credentials
2. Click on your API key
3. Under "Website restrictions", add your domain:
   - For local development: `http://localhost:*` and `http://localhost:3000/*`
   - For production: `https://yourdomain.com/*`
4. Wait 5 minutes for changes to propagate

**Common mistakes**:
- Forgetting to add `localhost` for development
- Using `http://` when the site uses `https://`
- Missing the trailing `/*` wildcard
- Adding the domain without the protocol

### ApiNotActivatedMapError

**Symptom**: Console shows `ApiNotActivatedMapError`.

**Cause**: The required API is not enabled in your Google Cloud project.

**Fix**:
1. Go to Google Cloud Console > APIs & Services > Library
2. Search for the API (e.g., "Maps JavaScript API")
3. Click "Enable"
4. Wait a few minutes for activation

### BillingNotEnabledMapError

**Symptom**: Map doesn't load. Console shows `BillingNotEnabledMapError`.

**Cause**: No billing account is linked to the project.

**Fix**:
1. Go to Google Cloud Console > Billing
2. Link a billing account to the project
3. Ensure the payment method is valid

### InvalidKeyMapError

**Symptom**: Console shows `InvalidKeyMapError`.

**Cause**: The API key is invalid, deleted, or not associated with the current project.

**Fix**:
- Verify the API key exists in Cloud Console > Credentials
- Check for typos or extra whitespace in the key
- Ensure the key belongs to the correct project

## JavaScript Errors

### "google is not defined"

**Cause**: The Maps JavaScript API script hasn't loaded yet when your code tries to use it.

**Fix**: Ensure your code runs after the API loads:

```javascript
// Option 1: Use the callback parameter
function initMap() {
  // Your code here — runs after API loads
}

// Option 2: Use async/await with importLibrary
async function initMap() {
  const { Map } = await google.maps.importLibrary("maps");
  // Safe to use Map here
}

// Option 3: Use @googlemaps/js-api-loader
import { Loader } from "@googlemaps/js-api-loader";
const loader = new Loader({ apiKey: "YOUR_KEY", version: "weekly" });
const { Map } = await loader.importLibrary("maps");
```

### "Map container element not found"

**Cause**: The DOM element for the map doesn't exist when `new Map()` is called.

**Fix**: Ensure the element exists before initializing the map. In React/Next.js, use a ref and initialize in `useEffect`:

```javascript
useEffect(() => {
  if (mapRef.current) {
    new google.maps.Map(mapRef.current, { center, zoom });
  }
}, []);
```

### CORS Errors with Places/Routes API

**Cause**: Making direct HTTP requests to Google Maps web service APIs from the browser.

**Fix**: Web service APIs (Places API HTTP, Routes API HTTP, Geocoding HTTP) are designed for server-side use. From the browser:
- Use the Maps JavaScript API's built-in services (`PlacesService`, `DirectionsService`)
- Or proxy requests through your own backend

```javascript
// Wrong — direct browser call to web service API
fetch("https://maps.googleapis.com/maps/api/place/details/json?place_id=xxx&key=KEY");

// Right — use the JavaScript API service
const { Place } = await google.maps.importLibrary("places");
const place = new Place({ id: placeId });
await place.fetchFields({ fields: ["displayName"] });
```

## Quota and Rate Limit Errors

### OverQueryLimit / OVER_QUERY_LIMIT

**Cause**: Exceeded the queries-per-second (QPS) or daily quota limit.

**Fix**:
1. Implement exponential backoff for retry logic
2. Batch requests where possible
3. Check your quota in Cloud Console > APIs & Services > Quotas
4. Request a quota increase if needed

```javascript
async function geocodeWithRetry(address, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await geocoder.geocode({ address });
      return result;
    } catch (error) {
      if (error.code === "OVER_QUERY_LIMIT" && i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        continue;
      }
      throw error;
    }
  }
}
```

### REQUEST_DENIED

**Cause**: The API key doesn't have permission for this API, or IP/referrer restrictions are blocking the request.

**Fix**:
1. Enable the required API in Cloud Console
2. Check API key restrictions match your request origin
3. For server-side calls, check IP address restrictions

## React / Next.js Specific Issues

### Map Re-renders on Every State Change

**Cause**: The map is being recreated on every component render.

**Fix**: Initialize the map once using `useRef` and `useEffect`:

```javascript
const mapRef = useRef(null);
const mapInstanceRef = useRef(null);

useEffect(() => {
  if (mapRef.current && !mapInstanceRef.current) {
    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center: { lat: 0, lng: 0 },
      zoom: 2,
    });
  }
}, []);
```

### Memory Leaks from Event Listeners

**Cause**: Not cleaning up map event listeners when a component unmounts.

**Fix**: Remove listeners in the cleanup function:

```javascript
useEffect(() => {
  const listener = map.addListener("click", handleClick);
  return () => {
    google.maps.event.removeListener(listener);
  };
}, [map]);
```

### Next.js SSR Issues

**Cause**: Maps JavaScript API requires `window`, which doesn't exist during server-side rendering.

**Fix**: Use dynamic imports with `ssr: false`:

```javascript
import dynamic from "next/dynamic";

const MapComponent = dynamic(() => import("./MapComponent"), {
  ssr: false,
  loading: () => <div>Loading map...</div>,
});
```

## Debugging Tips

1. **Check the browser console** — Most Maps errors appear as console warnings with descriptive error codes
2. **Use the Maps Inspector** — Chrome DevTools > Network tab, filter by `maps.googleapis.com`
3. **Verify API key** — Test with `https://maps.googleapis.com/maps/api/js?key=YOUR_KEY` directly in the browser
4. **Check the Google Cloud Console** — APIs & Services > Dashboard shows error rates and recent errors
5. **Enable all APIs you need** — Each API must be individually enabled (Maps JS API, Places API, Geocoding API, etc.)
