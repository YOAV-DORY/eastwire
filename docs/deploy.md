# Deploying EastWire ($0 plan)

| Piece | Service | Plan | Cost |
|---|---|---|---|
| Database | Neon | Free (1 GB, scales to zero after 5 min) | $0 |
| Hourly ingestion | GitHub Actions (`.github/workflows/ingest.yml`) | Free for public repos | $0 |
| Read API | Render web service (Docker, `render.yaml`) | Free (sleeps after 15 idle min, about 1 min to wake) | $0 |
| Frontend | Cloudflare Pages | Free | $0 |

These steps create accounts and enter credentials, so the repository owner does them. Never
commit secrets; each value below is entered in the service's own settings.

## 1. Database (Neon) and the hourly job

Follow [`database.md`](database.md), "Production". At the end:
- the `EASTWIRE_DB_*` secrets are set;
- `INGEST_ENABLED=true` is set;
- one manual "Ingest" run has created the schema and the first stories.
- optional: the `YOUTUBE_API_KEY` secret, to turn on videos ([`social.md`](social.md)).

## 2. API (Render)

1. In Render: **New → Blueprint**, pick this repository. Render reads `render.yaml` and proposes the `eastwire-api` service.
2. Fill in the variables it asks for:
   - `EASTWIRE_DB_URL`: the same JDBC URL as the ingest job (`jdbc:postgresql://<neon-host>/eastwire?sslmode=require`).
   - `EASTWIRE_DB_PASSWORD`: the **api_reader** password. The user is already set to `api_reader`, which can only `SELECT`.
   - `EASTWIRE_CORS_ORIGINS`: the Pages address from step 3, e.g. `https://eastwire.pages.dev`. Fill it in after step 3 if needed.
3. Deploy. Check `https://<service>.onrender.com/api/v1/health` returns `{"status":"ok"}`, then check `/api/v1/status`.

CI builds and smoke-tests the same Docker image on every push (`api-image` job), so a broken
Dockerfile shows up before Render tries to deploy it.

## 3. Frontend (Cloudflare Pages)

1. In Cloudflare: **Workers & Pages → Create application**, then choose **Pages**. Look for the link "Looking to deploy Pages? Get started" at the bottom; "Import a repository" makes a **Worker** instead. Then **Import an existing Git repository** and pick this repository. A Worker fails with `ENOENT … package.json` (wrong root) and would not apply `_headers` and `_redirects` without extra config. The address must end in `.pages.dev`.
2. Build settings:
   - Root directory: `frontend`
   - Build command: `npm run build`
   - Output directory: `dist`
   - Environment variables: `VITE_API_BASE_URL` = the Render URL from step 2 (no trailing slash), and `NODE_VERSION` = `24`.
     The build also writes this origin into the Content-Security-Policy (`connect-src`), so if
     it is missing or wrong the site loads but every API call is blocked. Rebuild after changing it.
3. Deploy. `public/_redirects` makes every route serve the app. `public/_headers` sets the Content-Security-Policy and the other security headers ([`security.md`](security.md)).
4. Put the Pages address into Render's `EASTWIRE_CORS_ORIGINS` (step 2) and redeploy the API.

## 4. Smoke test

Live addresses (2026-10-14):
- Site: https://eastwire.pages.dev
- API: https://eastwire-api.onrender.com, with `/api/v1/health` and `/api/v1/status`
- Render's `EASTWIRE_CORS_ORIGINS` is `https://eastwire.pages.dev`

Check:
- `curl -sI https://eastwire.pages.dev/` shows a `content-security-policy` whose `connect-src` names the Render host.
- `/api/v1/status` reports every enabled source `fresh` and the database size.

- The home page loads. The first visit after a quiet spell shows "Waking the free-tier server…" for up to a minute, then stories.
- The freshness pill shows "Updated … ago" and links to `/status`.
- Choosing a country updates the URL (`?country=JP`), and reloading keeps the filter.
- `/about` lists every source with its status and evidence date.

## Costs and limits to know

- **Render free:** 750 instance-hours per month (enough for one service); cold starts of about a minute.
  - Always-on is the Starter plan at $7/month (verified 2026-10-13).
- **Neon free:**
  - 100 CU-hours per project per month. The hourly job wakes the database about 24 times a day.
  - 1 GB storage. Retention keeps it small: 30 days for GDELT items, 90 for Global Voices.
- **GitHub Actions:**
  - Scheduled runs can be delayed at busy times.
  - The schedule is disabled after 60 days without repository activity. Any commit re-arms it.
