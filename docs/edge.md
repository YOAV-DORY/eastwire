# Edge: keep-alive, hourly ingest and the "last good" snapshot

A first visit must show real stories at once, even though the free Render API sleeps after
15 idle minutes and takes about a minute to wake. Three layers handle that, cheapest first:

1. **Snapshot baked into the page.** Every Cloudflare Pages build (`CF_PAGES` is set there)
   fetches the first-screen views from the API and writes them into `index.html` as a JSON data
   block (`frontend/vite.config.ts`, `frontend/snapshot/snapshot-core.mjs`). Always present,
   but only as fresh as the last deploy.
2. **Snapshot at the edge.** The `eastwire-edge` Worker (`edge/`) stores a fresh copy in
   Workers KV once an hour and serves it at `/snapshot.json`. When `VITE_SNAPSHOT_URL` points
   at it, the page fetches it on load (about 100 ms) and uses whichever copy is newer.
3. **Live API.** Always asked at once; its answer replaces the snapshot. The page never says
   "waking"; it shows a small "Updated 25 min ago" taken from when sources were last checked.

The page also keeps the last live answer on the visitor's device (`frontend/src/lib/savedCopy.ts`).
All copies are real API responses with their own times; nothing is invented.

## What the Worker does (Cron Trigger every 10 minutes)

| When (minute of the hour, UTC) | Task |
|---|---|
| every run | `GET /api/v1/health` on the Render API, so it never reaches 15 idle minutes. The health check does not touch the database, and the API's pool now closes idle connections after a minute (`minimum-idle: 0`), so Neon still scales to zero between real queries. |
| :10–:19 | Dispatches `.github/workflows/ingest.yml` (when the `GITHUB_TOKEN` secret is set). GitHub's own hourly schedule fired only every 3–5 hours on 2026-10-14/15; the workflow's two scheduled times stay as a backup and skip themselves after a recent success. |
| :30–:39, or when KV is empty | Refreshes the snapshot in KV (one write an hour; the free plan allows 1,000 a day). |

Free-plan budget: 144 cron runs a day, well inside 100,000 requests and 10 ms CPU each; one
always-awake Render service uses about 730 of the 750 free instance hours a month (no other free
Render service may run alongside it); Neon wakes for ingestion, the snapshot and real visits.

## Setting it up (owner, once)

Run from the repository root. `wrangler login` opens Cloudflare in your browser to authorize.

```bash
cd edge && npx wrangler@4 login
npx wrangler@4 kv namespace create SNAPSHOT
```

Paste the printed `id` into `edge/wrangler.toml` (`REPLACE_WITH_KV_NAMESPACE_ID`), then:

```bash
npx wrangler@4 deploy
```

It prints the Worker's URL, e.g. `https://eastwire-edge.<your-subdomain>.workers.dev`.

**Hourly ingest (recommended).** Create a fine-grained GitHub token limited to the
`YOAV-DORY/eastwire` repository with **Actions: Read and write** and nothing else, then:

```bash
npx wrangler@4 secret put GITHUB_TOKEN
```

**Point the site at the snapshot.** In Cloudflare Pages → eastwire → Settings → Variables, add
`VITE_SNAPSHOT_URL = https://eastwire-edge.<your-subdomain>.workers.dev/snapshot.json` (the build
also adds its origin to the CSP), then redeploy.

Check: `https://eastwire-edge.<your-subdomain>.workers.dev/health` shows the snapshot's time;
`npx wrangler@4 tail` shows each cron run's log line (`ping: ok | ingest: dispatched | ...`).

## Tests

`cd edge && npm test` (Node's test runner, no dependencies): schedule, snapshot refresh (and
keeping the old one when the API is down), ingest dispatch, and the HTTP endpoints.
