---
title: API Key Auth and Restrictions
source_url: https://developers.google.com/maps/api-security-best-practices
---

# API Key Auth and Restrictions

This doc covers authentication choices for Google Maps Platform, how restrictions actually work, and the multi-origin patterns that cause the most support tickets (localhost + staging + prod, Vercel preview deploys, per-platform key separation). For error-code specifics, see [`troubleshooting.md`](./troubleshooting.md) — this doc links rather than duplicates.

**TL;DR**

- API keys are the right answer for ~95% of Maps Platform use.
- A key carries **exactly one** application-restriction type. Multi-platform apps require multiple keys by design.
- Minimum recommended split: one dev/staging key, one prod key. Typical full split: web + Android + iOS + server = four keys.
- A restricted key is safe to ship in client-side JS. An unrestricted key is not.

---

## Key types — API keys, OAuth, service accounts

| Type | When to use | Notes |
|---|---|---|
| **API key** | Default for Maps JavaScript API, Places, Geocoding, Directions, Distance Matrix, Elevation, Static Maps. The only option for Maps JS (client-side). | All Maps Platform products require an API key for authentication and billing. |
| **OAuth 2.0** | Server-to-server calls on the subset of endpoints that support it. Rare in Maps Platform today. | Google recommends OAuth where supported, but most Maps endpoints are API-key-only. |
| **Service accounts** | Fleet Engine, Route Optimization, and other products whose client libraries require elevated server-to-server auth. | **Never expose service account keys in client-side applications.** |

**Verdict:** unless you're doing Fleet Engine / Route Optimization, you want an API key.

---

## Application restrictions (one per key)

> **Critical:** a single API key can carry exactly **one** application-restriction type. You cannot combine HTTP referrers + Android + iOS + IP on one key. Multi-platform apps MUST use multiple keys.

The four options:

### 1. HTTP referrers (web)

- Used for Maps JavaScript API and any browser-originated request.
- Referrer strings must include the full protocol + hostname (+ optional port). Examples Google documents:
  - `https://example.com` — specific origin
  - `https://*.example.com` — subdomain wildcard
- Protocol has to match: an `https://` restriction will reject an `http://` page and vice versa.
- **Wildcard grammar gaps:** Google's Maps-specific pages do not comprehensively document port wildcards, path wildcards, or TLD wildcards. If you need patterns like `http://localhost:*` or path-level wildcards, verify empirically and see Google's docs — exact wildcard grammar for ports/paths is not comprehensively documented.

### 2. IP addresses (server-side)

- For servers calling REST endpoints (Geocoding, Directions, Distance Matrix, Places web service).
- Accepts individual IPs and CIDR ranges.
- Impractical for mobile apps — dynamic IPs make this unenforceable.

### 3. Android apps

- Restrict by **package name + SHA-1 signing-certificate fingerprint** pair. Both required per entry.
- Use separate entries for debug vs release SHA-1s.

### 4. iOS apps

- Restrict by **bundle identifier**.

---

## API restrictions (per-service enablement)

Application restrictions and API restrictions are **separate controls**. Application restrictions say *who can use the key*; API restrictions say *which Google APIs the key can call*.

- Each Maps service is a distinct API in Cloud Console: "Maps JavaScript API", "Places API", "Places API (New)", "Geocoding API", "Directions API", "Distance Matrix API", "Elevation API", "Routes API".
- **A key restricted to Maps JS but used to call Geocoding will fail.** The map itself loads fine; the Geocoding call returns `REQUEST_DENIED` or surfaces as a silent failure in the JS SDK.
- Common real-world failure: you create a new key "for the map", authorize it for Maps JavaScript API only, and the app also calls Geocoding / Directions / Distance Matrix / Elevation via the JS SDK's client-side services. Each of those is a separate API that must be added to the key's allowlist.
- Places SDK Android/iOS: authorize "Places API" or "Places API (New)" depending on the SDK version you target.

Also distinct from API restrictions: **project-level API enablement** in Cloud Console → APIs & Services → Library. If the API isn't enabled on the project at all, you get `ApiNotActivatedMapError` — see [`troubleshooting.md`](./troubleshooting.md#apinotactivatedmaperror).

---

## Multi-origin scenarios

This is the section developers actually come here for.

### The "old key works, new key breaks" diagnostic

Almost always one of these, ranked by frequency:

1. **The old key was unrestricted.** Legacy keys created years ago often have no application restrictions at all, so they "work everywhere." The new key has referrer restrictions that are missing `localhost`, `127.0.0.1`, a LAN IP, or a staging subdomain.
2. **Narrower API restrictions on the new key.** Old key was authorized for every Maps API; new key is scoped to just "Maps JavaScript API" but the app also calls Geocoding or Directions. The map loads, subsequent service calls fail.
3. **Propagation delay.** Freshly edited restrictions can take a few minutes to apply. If you just saved the key, wait and retry before deeper debugging.
4. **New key lives in a different Cloud project** where the APIs aren't enabled, or billing isn't active. Surfaces as `ApiNotActivatedMapError` or `REQUEST_DENIED`.

**Diagnostic steps:**

1. Open both keys side by side in Cloud Console → Credentials. List what the **old** key actually restricts (application restrictions? API restrictions? any at all?).
2. List what the **new** key restricts.
3. Diff the two. The gap is your bug.
4. As a temporary confirmation, remove all restrictions from the new key. If it works unrestricted, the restriction config is the issue — re-add restrictions incrementally.
5. Confirm both keys belong to the same project, and that the target project has all required APIs enabled and billing active.

### Vercel preview deploys

> **Not Google guidance — derived pattern.** Google does not publish official guidance on Vercel or any preview-deploy system as of 2026-04-22. The patterns below are synthesized from Google's general principles (wildcard referrer syntax, per-environment key separation).

Vercel preview URLs look like `https://<project>-<hash>-<team>.vercel.app` — you can't enumerate them in advance. Two workable approaches:

**Option A (simple, less secure)** — broad preview-only key:

- Restrict to `https://*.vercel.app`.
- Valid syntax, but exposes the key to every Vercel-hosted site on the public internet.
- Acceptable **only** for a rate-limited preview key isolated from prod quota, with no spending cap and a trivial daily quota.
- Never use this pattern for your prod key.

**Option B (recommended)** — custom preview domains:

- Configure Vercel preview deploys to serve under `*.preview.yourdomain.com` (Vercel supports wildcard preview domains on paid plans).
- Restrict a single dev/preview key to `https://*.preview.yourdomain.com` + `http://localhost:*` + any staging subdomain.
- Prod key stays locked to `https://yourdomain.com` + `https://www.yourdomain.com` only.

Either way: **separate key from prod**, separate quota, separate blast radius.

### Multiple dev domains (localhost + staging + prod)

A single key can list multiple referrer entries. But the right split is almost always **two keys**:

- **DEV key** — permissive referrer list (`http://localhost:*`, `http://127.0.0.1:*`, LAN IPs, `https://staging.example.com`). Low daily quota. No spending cap.
- **PROD key** — locked to `https://example.com` + `https://www.example.com` only. Full quota, full spending cap.

Rationale: a leaked dev key shouldn't grant prod quota or abuse potential. Rotate them independently.

### Per-platform setups

Application-restriction types are mutually exclusive, so per-platform separation is forced by the mechanics, not just best practice:

| Platform | Restriction type | Env var convention |
|---|---|---|
| Web (Maps JS) | HTTP referrers | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` / `VITE_GOOGLE_MAPS_API_KEY` |
| Android | Package name + SHA-1 | Stored in app build config |
| iOS | Bundle ID | Stored in Info.plist / xcconfig |
| Server (REST) | IP / CIDR | `GOOGLE_MAPS_SERVER_KEY` (NEVER `NEXT_PUBLIC_`) |

Compromise of one platform's key does not compromise the others. Google allows up to 300 API keys per project — there's no quota incentive to consolidate.

---

## Failure modes — error → cause table

Quick triage. Full fix steps live in [`troubleshooting.md`](./troubleshooting.md).

| Error | Most likely cause |
|---|---|
| `RefererNotAllowedMapError` | Current page URL not in the key's referrer allowlist, OR a strict `Referrer-Policy: no-referrer` header is stripping the `Referer` so Google sees nothing. |
| `ApiNotActivatedMapError` | The API is not enabled on the Cloud project. This is **project-level enablement**, not the key's API-restriction list. |
| `InvalidKeyMapError` | Malformed key, deleted key, or key from a different project than the loader is pointed at. |
| `MissingKeyMapError` | The `key=` parameter is absent from the loader script URL. |
| Intermittent CORS-looking failures on Maps JS | Usually `Referrer-Policy` edge cases — header stripped in some contexts (iframes, extensions, `no-referrer` meta), so Google rejects with `RefererNotAllowedMapError`. The browser itself isn't doing CORS on Maps tiles. |
| `REQUEST_DENIED` from REST endpoint | Billing not enabled on the project, OR the key's API-restriction list is blocking this specific service. |
| `OVER_QUERY_LIMIT` | Quota, not restrictions — see [`troubleshooting.md`](./troubleshooting.md#overquerylimit--over_query_limit). |

See [`troubleshooting.md`](./troubleshooting.md) for the full error table with step-by-step fixes.

---

## Key rotation without downtime

Never swap keys in a single deploy. Stagger the migration:

1. **Create** the new key with identical application + API restrictions to the old key.
2. **Deploy** your apps reading the new key. Old key is still valid.
3. **Monitor** both keys in Cloud Console → APIs & Services → Metrics. Watch traffic shift from old to new.
4. **Wait at least 24 hours** (longer for mobile, where users update at their own pace — monitor until old-key traffic is effectively zero).
5. **Delete** the old key.

Before rotating: first try to *restrict* the existing key. Only rotate if restriction isn't possible or active abuse is confirmed.

---

## Storing keys in env vars — is it safe?

Short answer: **a restricted Maps JS key is safe to ship in client-side JS. An unrestricted one is not.**

- Maps JS keys are **inherently public** — they're in the client bundle, visible in DevTools, extractable by anyone. The security model is not secrecy; it's the restrictions (HTTP referrers + API allowlist).
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `VITE_GOOGLE_MAPS_API_KEY`, and equivalent framework conventions are **fine** — provided the key has strict referrer + API restrictions.
- **Server-side keys must never use a public-prefix env var.** Use `GOOGLE_MAPS_SERVER_KEY` (no `NEXT_PUBLIC_`, no `VITE_`) and IP-restrict it.
- Static Maps API is a special case: apply both website and API restrictions, and use server-side **digital signatures** in addition — the signing secret must stay on the server.

What "public" means here: restrictions *are* the security boundary. A key with a `https://yourdomain.com` referrer restriction and an API allowlist limited to the services you actually use is doing its job even if the key string is visible in view-source.
