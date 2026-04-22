# Brief: API Key Auth and Restrictions (Google Maps Platform)

**Date fetched:** 2026-04-22
**Scope:** Key types, per-platform restrictions, multi-origin setups, and the "old key works, new key breaks" class of bugs
**Downstream doc:** `/documents/api-key-restrictions.md` (new)
**Cross-ref:** `/documents/troubleshooting.md` (error-code specifics already covered there — this brief should link, not duplicate)

## Sources consulted (Google only)

1. https://developers.google.com/maps/documentation/javascript/get-api-key — setup overview
2. https://developers.google.com/maps/api-security-best-practices — **primary source**; most restriction-format guidance lives here
3. https://developers.google.com/maps/documentation/places/web-service/get-api-key — Places specifics
4. https://developers.google.com/maps/documentation/javascript/error-messages — error-code cross-refs
5. https://cloud.google.com/docs/authentication/api-keys — **blocked** (redirected to `docs.cloud.google.com`; WebFetch permission denied). Notes below fall back to the Maps-Platform-specific pages, which are the authoritative source for Maps keys anyway.
6. https://cloud.google.com/docs/authentication/api-keys-best-practices — **blocked** for the same redirect reason.

Where Google doesn't document something explicitly (e.g., Vercel preview deploys), the brief says so rather than speculating.

---

## Key types and scope

### 1. API key vs OAuth 2.0 vs service accounts

- **API keys** are the default for Maps Platform and the only option for Maps JavaScript API (client-side). All Google Maps Platform products require an API key for authentication and billing (per the Places "get-api-key" page: *"all Google Maps Platform products require API keys"*).
- **OAuth 2.0** — security best-practices page recommends: *"Prefer OAuth 2.0 for server-to-server calls where supported."* Not all Maps endpoints support it; treat as a server-side-only option for the subset that does.
- **Service accounts** — used for server-side calls where supported; Google explicitly warns: *"Never expose service account keys in client-side applications."*
- **Maps-specific vs generic Cloud:** API-key mechanics (creation, restriction types, quotas) are generic Cloud; *which* restrictions apply to *which* Maps product (e.g., JS API needs website restrictions; Places SDK needs Android/iOS restrictions) is Maps-specific.

### 2. One key for everything vs per-platform separation

Google's guidance: **separate keys per application/platform.** Direct quote from security best practices:
- *"Best practice is to always restrict your API keys with one type of application restrictions and one or more API restrictions."*
- A key can carry exactly **one** application-restriction type (HTTP referrers OR IP OR Android OR iOS). This makes single-key multi-platform setups structurally impossible if you want restrictions enforced.
- Google notes **up to 300 API keys per project**, so there's no quota reason to consolidate.
- Rationale: *"if one key is compromised, you can delete it without affecting others."*

**Verdict:** Split by platform is not just recommended — application-restriction mechanics effectively require it.

---

## Restriction types

### 3. Application restrictions — exact formats

From the security best practices page:

- **HTTP referrers (websites)**: *"Always provide the **whole** referrer string, including the protocol scheme, hostname and optional port."*
  - Google's examples: `https://*.google.com` (wildcard subdomains) or `https://google.com` (specific domain).
  - Wildcard support: subdomain-level via `*.`; **not** documented for path wildcards or TLD wildcards on the Maps pages consulted.
  - Protocol must match (http vs https). Port included when non-standard.
- **Android apps**: restrict to **package name + SHA-1 signing-certificate fingerprint** pair. Both required per entry.
- **iOS apps**: restrict to **bundle identifier**.
- **IP addresses / CIDR**: for server-side use. Google calls this *"impractical for mobile with dynamic IPs"* — do not use for client apps.

### 4. API restrictions — per-API enablement

- Separate from application restrictions: limits which Google APIs the key can call.
- **Common gotcha:** Maps JavaScript API's client-side services (Directions, Distance Matrix, Elevation, Geocoding) are **separate APIs** from "Maps JavaScript API" itself. Direct quote: *"If you also use any of the following Maps JavaScript API services, you should also authorize these corresponding APIs: Directions Service (Legacy), Distance Matrix Service (Legacy), Elevation Service, Geocoding Service."*
- Places SDK similarly: *"If your app uses the Places SDK for Android or Places SDK for iOS, authorize Places API (New) or Places API, depending on the SDK versions you use."*
- A too-narrow API restriction is a frequent cause of "REQUEST_DENIED" with no referrer/IP problem in sight — the domain is fine, but the key isn't authorized for that specific API.

### 5. Quota restrictions (not a key restriction, but conflated)

- Quotas are set per-API per-project, not per-key. They limit request volume, not origin. Users often see "quota exceeded" and assume a key restriction issue, or vice versa. Worth calling out for disambiguation; otherwise out of scope for this doc.

---

## Multi-origin scenarios (highest-value section)

### 6. Vercel preview deploys

**Google does not address Vercel or preview deploys explicitly** in any of the consulted pages. What Google *does* document:

- Wildcard subdomain syntax `https://*.vercel.app` is valid referrer format (matches the *.google.com example pattern).
- **Problem:** `https://*.vercel.app` allows literally every Vercel-hosted site on earth to use your key. This defeats the purpose of restrictions.
- **Problem:** Preview URLs are typically `https://<project>-<hash>-<team>.vercel.app` — you can't enumerate them in advance.

**Practical patterns** (synthesized from Google's principles, not directly stated by Google):
- Use a **separate key for previews/staging** that's scoped to `https://*-<team>.vercel.app` or your team's subdomain pattern if Vercel provides a stable team prefix. Still broad, but narrower.
- Or use Vercel's custom preview domains (`preview.yourdomain.com` wildcard) and restrict the key to `https://*.preview.yourdomain.com`.
- Production key should be strictly `https://yourdomain.com` + `https://www.yourdomain.com` only.

**Be explicit in the downstream doc:** "Google does not publish preview-deploy-specific guidance as of 2026-04-22."

### 7. Multiple dev domains (localhost + staging + prod)

A single key *can* list multiple referrers. The security best practices page doesn't forbid this — it just says each entry must be a full referrer string. So a single key with:
- `http://localhost:*` (or specific ports — port wildcard behavior not documented on the Maps page; verify empirically)
- `https://staging.example.com`
- `https://example.com`
- `https://www.example.com`

...is syntactically valid. Google's *preference* remains separate keys per environment, for blast-radius reasons: a leaked dev key shouldn't grant prod quota/abuse potential.

**Recommendation for the downstream doc:** Split minimum two keys — one dev/staging, one prod. Localhost + staging on the dev key is fine.

### 8. Per-platform web + mobile separation

Required by the mechanics of application restrictions (see §2). One key cannot simultaneously be HTTP-referrer-restricted **and** Android-package-restricted. So web vs Android vs iOS vs server = minimum four keys if all four platforms exist.

Security rationale from Google: scoped blast radius, per-platform quota tracking via Cloud Console metrics, and the ability to rotate one platform's key without redeploying others.

---

## Failure modes (highest-value section)

### 9. "Old key works, new key breaks" — diagnostic tree

Google doesn't name this symptom but the causes are documented. Most common causes, ranked:

1. **Old key had no application restrictions; new key does.** A fresh key created today will likely default to "unrestricted" *or* the creator added website restrictions without including the current dev domain (localhost, 127.0.0.1, LAN IP). The old key "works everywhere" because it's unscoped.
2. **Old key has broader API restrictions.** New key scoped to "Maps JavaScript API" only, but the app also calls Geocoding Service → fails on the Geocoding call, not the map load. See §4.
3. **Propagation delay.** Google doesn't publish a specific propagation-time number in the Maps pages; anecdotally up to a few minutes. If the new key was just created, wait and retry before deep debugging.
4. **Key belongs to a different Cloud project** that doesn't have the relevant APIs *enabled* (separate from the key's API *restrictions*). This surfaces as `ApiNotActivatedMapError` — cross-ref troubleshooting.md §ApiNotActivatedMapError.
5. **Billing not enabled on the new key's project.** All Maps APIs require billing. Symptom is often `REQUEST_DENIED` on REST or a cryptic load failure on the JS API.

**Diagnostic steps:**
1. In Cloud Console, compare old-key vs new-key "Application restrictions" and "API restrictions" side by side.
2. Confirm both keys are in the same project, or that the new key's project has all the same APIs enabled and billing active.
3. Temporarily remove all restrictions from the new key. If it now works, the restriction config is the issue. Re-add restrictions incrementally.

### 10. Intermittent CORS / referrer errors

Google doesn't list a CORS-specific error in the JS error-messages page. What actually happens under the hood:

- Maps JS API tiles/requests are not blocked by browser CORS — they're blocked by Google's server, which inspects the `Referer` header and rejects with a response that the JS SDK surfaces as `RefererNotAllowedMapError`.
- "Intermittent" typically means:
  - `Referer` header is sometimes stripped (strict `Referrer-Policy: no-referrer` on the page → Google sees no referrer → rejects). Fix: set `Referrer-Policy: strict-origin-when-cross-origin` (the browser default, but apps sometimes override).
  - Iframe / extension context sends a different referrer than expected.
  - Mixed protocols (page loaded over `http://` but referrer restriction is `https://` only).

### 11. `ApiNotActivatedMapError` vs `RefererNotAllowedMapError` vs `InvalidKeyMapError`

Straight from Google's error-messages page, disambiguated:

| Error | Cause (quoted) | What to check |
|---|---|---|
| `RefererNotAllowedMapError` | *"The current URL loading the Maps JavaScript API has not been added to the list of allowed referrers."* | Key's **Application restrictions** (HTTP referrers list). Current page's full URL including protocol. |
| `ApiNotActivatedMapError` | *"The Maps JavaScript API is not activated on your API project."* | Cloud Console → APIs & Services → Library. Enable "Maps JavaScript API" on the key's project. Different from API *restrictions* on the key. |
| `InvalidKeyMapError` | *"The API key included in the script element that loads the API is not found."* | Typo'd key, deleted key, or key in a different project than intended. Regenerate if needed. |
| `MissingKeyMapError` | *"The script element that loads the API is missing the required authentication parameter."* | The `key=` URL parameter is absent from the loader script. |

Full quotes and fix steps already exist in `/documents/troubleshooting.md` — the new doc should **link to** troubleshooting.md rather than duplicate these tables.

---

## Best practices

### 12. Rotating keys without downtime

Google's exact flow (from security best practices):
- *"Rotating creates a new key with identical restrictions. Both old and new keys work temporarily during migration."*
- *"Before rotating: first attempt to restrict the existing key. Only rotate if restriction isn't possible or unauthorized use is active."*
- *"Migrate to multiple keys gradually: for existing production keys, monitor usage over time using Cloud Console metrics to determine when each platform type has migrated off the old key before deleting it."*

Zero-downtime recipe: create new key → deploy apps with new key → watch Cloud Console metrics until old-key traffic drops to zero → delete old key. Do not delete the old key on the same deploy as the switch.

### 13. Env vars and "public keys are safe if restricted"

Google doesn't explicitly bless or condemn `NEXT_PUBLIC_` / `VITE_` prefixes (those are framework conventions, not Cloud's concern). What Google *does* say:

- *"Store signing secrets outside of your application's source code and source tree."* This is about **signing secrets for Static Maps**, not API keys. Don't overgeneralize.
- Maps JS API keys are **inherently public** — they ship in the client bundle. The security model relies entirely on HTTP-referrer restrictions + API restrictions, not secrecy.
- **Therefore:** a `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in env is fine *if and only if* the key has strict referrer + API restrictions. Without restrictions, it's an invitation to abuse.
- Server-side keys (used by Geocoding/Directions REST calls from your backend) must **never** be public-prefixed. Use `GOOGLE_MAPS_SERVER_KEY` (no `NEXT_PUBLIC_`) and IP-restrict it.

Static Maps API is a special case: *"Apply both website and API restrictions to a Static Web API key, if the key is publicly exposed on your web page."* Plus digital signatures server-side.

---

## Downstream doc: suggested structure for `api-key-restrictions.md`

1. TL;DR: minimum 2 keys (client + server), max 4 (web/Android/iOS/server). Always restrict.
2. Key types decision table
3. Restriction-format cheat sheet (quote the exact strings from §3)
4. **Multi-origin patterns** — localhost + staging + prod, plus the Vercel preview-deploy section with the "Google doesn't document this" caveat
5. Platform split (web/mobile/server) with env-var naming convention
6. "Old key works, new key breaks" diagnostic tree (§9)
7. Key rotation playbook (§12)
8. Link to `troubleshooting.md` for error-code reference — don't duplicate

## Gaps / open questions

- Google's exact HTTP referrer wildcard grammar (path wildcards? port wildcards? protocol wildcards?) is **not fully documented** on the Maps-specific pages. The generic Cloud docs were blocked for us today. Recommend an empirical test pass before publishing the downstream doc.
- API-key propagation timing is not stated as a specific SLA anywhere we could reach.
- Vercel preview deploys: zero official guidance. Call this out plainly.
