# Security and privacy

EastWire has no accounts, no forms that store anything and no cookies of its own. What
there is to protect: the reader's privacy, the read-only API, the database and two secrets.

## Website (Cloudflare Pages)

[`frontend/public/_headers`](../frontend/public/_headers) sends, on every page:

| Header | Value and why |
|---|---|
| `Content-Security-Policy` | `script-src 'self' https://embed.bsky.app`: only our bundle, `theme-init.js` and Bluesky's official embed script. No inline scripts; the theme script is a file for this reason. |
| | `connect-src 'self' <API origin> https://tiles.openfreemap.org`: the build writes in the API host from `VITE_API_BASE_URL` (and the edge snapshot's, if set); OpenFreeMap serves the base map ([map.md](map.md)). `worker-src 'self'`: MapLibre's worker. |
| | `img-src`: OpenStreetMap tiles (the map's fallback), OpenFreeMap, `blob:` (map images), Wikimedia Commons photos and YouTube API thumbnails. `frame-src`: the two official embeds. `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`. |
| | `style-src` allows `'unsafe-inline'`, because Leaflet and the embeds set style attributes. Scripts stay locked. |
| `Strict-Transport-Security` | One year, subdomains included |
| `X-Frame-Options: DENY`, `Cross-Origin-Opener-Policy: same-origin` | No framing, no cross-window handles |
| `Referrer-Policy: strict-origin-when-cross-origin` | OpenStreetMap's tile policy needs a referrer; this sends only the origin |
| `Permissions-Policy` | Camera, microphone, geolocation and FLoC off |

The Playwright suite serves the production build with these headers
([`scripts/serve-dist.mjs`](../frontend/scripts/serve-dist.mjs)) and fails if any page logs a
CSP violation.

## API (Render)

- **Read-only**: GET and HEAD only. It connects as `api_reader`, which has `SELECT` and nothing else (migration V2).
- **CORS**: only the origins in `EASTWIRE_CORS_ORIGINS`.
- **Rate limit**: 120 requests per minute per client IP on `/api/**` (`EASTWIRE_RATE_LIMIT_PER_MINUTE`). Over the limit it answers 429 with `Retry-After`. `/api/v1/health` is exempt so Render's checks never trip it. Client IPs come from Render's `X-Forwarded-For` (`server.forward-headers-strategy: native`).
- **Headers on every response**:
  - `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: no-referrer`
  - HSTS
- **Input**:
  - Every parameter is validated against an allow list (countries, cities, sectors, platforms, sort orders, page and size limits).
  - Search text is 2–200 characters and goes to `websearch_to_tsquery`, which never raises on odd input.
  - All SQL is parameterized.
- **Errors**: no stack traces or exception messages reach the client (`server.error.*`).

## Ingestion (GitHub Actions)

- **Secrets**: `EASTWIRE_DB_*` and the optional `YOUTUBE_API_KEY` live only in Actions secrets. The YouTube key goes in a request header, never in a URL or log.
- **Workflow hardening**:
  - Every workflow pins its actions to commit SHAs.
  - Permissions are `contents: read`.
  - `pull_request_target` is never used.
  - Checkouts do not keep credentials.
- **Database role**: `ingest_writer`. An advisory lock prevents overlapping runs.

## Reader privacy

- **No cookies.** `localStorage` holds only the theme and the shortcut setting.
- **No analytics or trackers.**
- **Third-party requests:**
  - OpenFreeMap's base map (or OpenStreetMap's tiles as a fallback) when a map is on screen.
  - YouTube thumbnails on the social page.
  - Bluesky or YouTube only after the reader presses "Load". The YouTube button says it may set cookies.
- The About page states all of this, plus the YouTube API Services terms and the Google Privacy Policy.

## Moderation and takedowns

- **Hard deletes**: a `suppression` row (URL hash, or platform + id) removes an article or post at the next hourly run. Takedown requests come through GitHub issues.
- **Social posts** removed or labelled upstream are deleted within an hour (Bluesky) or a day (YouTube) ([`social.md`](social.md)).
