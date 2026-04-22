---
title: Places API (New) and Autocomplete
source_url: https://developers.google.com/maps/documentation/places/web-service/overview
---

# Places API (New) and Autocomplete

The Places API (New) is the current version of Google's place data service. It replaces the legacy Places API with improved field masking, session tokens, and richer place data. The Places API is available both as a web service (HTTP) and through the Maps JavaScript API.

## Key Concepts

- **Place ID** — A unique identifier for a place (e.g., `ChIJN1t_tDeuEmsRUsoyG83frY4`). Place IDs are stable but can occasionally change.
- **Field Mask** — You must specify which fields you want in the response. Only requested fields are returned and billed. This is a key cost optimization.
- **Session Tokens** — Group autocomplete requests and the subsequent place details request into a single billing session.

## Place Class (JavaScript API)

The `Place` class is the modern JavaScript interface:

```javascript
const { Place } = await google.maps.importLibrary("places");

const place = new Place({ id: "ChIJN1t_tDeuEmsRUsoyG83frY4" });

await place.fetchFields({
  fields: ["displayName", "formattedAddress", "location", "rating", "photos"],
});

console.log(place.displayName);
console.log(place.formattedAddress);
console.log(place.location.lat(), place.location.lng());
```

## Text Search

Search for places using a text query:

```javascript
const { Place } = await google.maps.importLibrary("places");

const request = {
  textQuery: "pizza near Times Square",
  fields: ["displayName", "location", "rating", "formattedAddress"],
  maxResultCount: 10,
};

const { places } = await Place.searchByText(request);

places.forEach((place) => {
  console.log(place.displayName, place.rating);
});
```

## Nearby Search

Find places within a specified area:

```javascript
const request = {
  fields: ["displayName", "location", "businessStatus"],
  locationRestriction: {
    center: { lat: 40.7128, lng: -74.0060 },
    radius: 1000, // meters
  },
  includedPrimaryTypes: ["restaurant"],
  maxResultCount: 20,
};

const { places } = await Place.searchNearby(request);
```

## Autocomplete

The Place Autocomplete widget provides real-time suggestions as a user types:

```javascript
const { Autocomplete } = await google.maps.importLibrary("places");

const autocomplete = new Autocomplete(
  document.getElementById("search-input"),
  {
    types: ["geocode", "establishment"],
    componentRestrictions: { country: "us" },
    fields: ["place_id", "geometry", "formatted_address", "name"],
  }
);

autocomplete.addListener("place_changed", () => {
  const place = autocomplete.getPlace();
  if (!place.geometry) {
    console.log("No geometry for this place");
    return;
  }
  map.setCenter(place.geometry.location);
  map.setZoom(15);
});
```

### PlaceAutocompleteElement (New)

The newer web component version:

```javascript
const placeAutocomplete = new google.maps.places.PlaceAutocompleteElement({
  componentRestrictions: { country: "us" },
});

document.getElementById("search-container").appendChild(placeAutocomplete);

placeAutocomplete.addEventListener("gmp-placeselect", async (event) => {
  const place = event.place;
  await place.fetchFields({ fields: ["displayName", "location", "formattedAddress"] });
  console.log(place.displayName);
});
```

## Session Tokens

Session tokens group autocomplete keystrokes and a final place details request into one billed session. Without them, each keystroke is billed separately:

```javascript
const sessionToken = new google.maps.places.AutocompleteSessionToken();

// Use with AutocompleteService
const service = new google.maps.places.AutocompleteService();
service.getPlacePredictions(
  { input: "pizza", sessionToken },
  (predictions) => { /* ... */ }
);

// The session token is consumed when you fetch place details
```

## Place Photos

Retrieve photos for a place:

```javascript
const place = new Place({ id: placeId });
await place.fetchFields({ fields: ["photos"] });

if (place.photos && place.photos.length > 0) {
  const photoUrl = place.photos[0].getURI({ maxWidth: 400, maxHeight: 300 });
  document.getElementById("photo").src = photoUrl;
}
```

## Migration from Legacy Places API

The legacy `PlacesService` is being replaced by the `Place` class:

| Legacy | New |
|--------|-----|
| `PlacesService.getDetails()` | `Place.fetchFields()` |
| `PlacesService.findPlaceFromQuery()` | `Place.searchByText()` |
| `PlacesService.nearbySearch()` | `Place.searchNearby()` |
| `PlacesService.textSearch()` | `Place.searchByText()` |

Key differences:
- New API uses field masking (only pay for fields you request)
- Returns `Place` objects directly instead of callbacks
- Supports promises natively
- Better TypeScript support
