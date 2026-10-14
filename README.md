# EastWire

EastWire helps English-speaking readers find news from China, India, South Korea and Japan,
placed on a map, with every source shown. Asia-wide expansion comes later.

It shows what its listed sources published. It does not claim to measure what any audience
has or hasn't seen.

**Status:** all 9 milestones built; waiting for deployment ([`docs/deploy.md`](docs/deploy.md)).
- The hourly job collects GDELT-discovered headlines from reviewed publishers and Global Voices articles ([`docs/ingestion.md`](docs/ingestion.md)).
- The read-only API serves them with a display-policy check on every read.
- The homepage shows them with country and city filters, freshness and honest empty states.
- Full-text search (`/search?q=…`) supports quoted phrases, `-exclusions` and `OR`, with every filter kept in a shareable URL. Press `/` to search; single-key shortcuts can be turned off.
- The map (`/map`) pins stories placed in a city, split into mentioned, dateline and publisher roles. Stories that only name a country are counted beside the map, never pinned to a capital. Each city has a panel (`/map/city/{geonamesId}`), there is a table view for screen readers and keyboards, and an optional GeoNames population layer with its own legend.
- Six rule-based sectors (economy, geopolitics, technology, business, society, environment) from [`config/sectors.yaml`](config/sectors.yaml). Every tag on a story shows the rules that matched; `/sector/{slug}` lists every rule. Measured on a holdout set the rules were never tuned on: 100% precision, 33% recall. Tags are rarely wrong but often missing ([`docs/sectors.md`](docs/sectors.md)).
- A separate social section (`/social`) with posts from five domain-verified Bluesky newsroom accounts (YouTube channels are ready once an API key is set). Each post is labelled "not verified reporting", shows why its account is listed, and loads the official embed only on click. Posts deleted or labelled upstream disappear within an hour ([`docs/social.md`](docs/social.md)).
- Hardened:
  - a strict Content-Security-Policy and security headers on the site and the API;
  - a per-IP rate limit and a database-size warning on `/status`;
  - Playwright end-to-end tests against the production build, with axe accessibility checks in both themes at phone and desktop widths ([`docs/security.md`](docs/security.md)).

Deployment steps (Neon, Render, Cloudflare Pages, all free) are in [`docs/deploy.md`](docs/deploy.md).
The full build plan, including the design system, is in [`docs/PLAN.md`](docs/PLAN.md).

## Ground rules

- A source is used only if its terms allow the way EastWire shows it. An RSS feed or public
  visibility alone is not permission.
- No full articles, translations, unlicensed images, paywall bypass, scraping or AI summaries.
- Excerpts appear only where a license or policy allows them. Otherwise it's a headline and a link.
- Social posts are kept separate, labeled as not verified reporting, and shown through official embeds.
- Sparse coverage is shown honestly. An empty city is an empty city.

## What's in the repo now

| Path | What it is |
|---|---|
| [`docs/source-matrix.md`](docs/source-matrix.md) | Every source evaluated: endpoint, quota, display rights, attribution, retention, evidence, status |
| [`docs/domain-review.md`](docs/domain-review.md) | Rules and results for publisher domains discovered via GDELT |
| [`docs/cities.md`](docs/cities.md) | How the 170-city map list is chosen |
| [`docs/evidence/`](docs/evidence/) | Saved terms pages, plus open manual checks |
| [`config/sources.yaml`](config/sources.yaml) | Machine-readable source registry |
| [`config/domains.yaml`](config/domains.yaml) | allow / deny / pending decision for each publisher domain |
| [`config/countries.yaml`](config/countries.yaml) | Covered countries with ISO and FIPS codes (GDELT uses FIPS) |
| [`config/cities.csv`](config/cities.csv) | Generated city list (GeoNames, CC BY 4.0) |
| [`config/city_curation.yaml`](config/city_curation.yaml) | Hand-curated city aliases and exclusions |
| [`scripts/`](scripts/) | City list builder and config validator |
| [`backend/`](backend/) | Java 21 / Spring Boot 4: `core` (config, `DisplayPolicy`, Flyway schema), `ingest`, `api` |
| [`frontend/`](frontend/) | React + TypeScript: design tokens, UI primitives, home, search, map (Leaflet), sectors, social, status and about pages |
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | Config validation, backend build with integration tests, frontend lint/test/build |
| [`.github/workflows/ingest.yml`](.github/workflows/ingest.yml) | Hourly ingestion (minute 17), off until `INGEST_ENABLED=true` |
| [`docs/ingestion.md`](docs/ingestion.md) | How a run works, connectors, failure handling, measured volumes |
| [`config/sectors.yaml`](config/sectors.yaml), [`docs/sectors.md`](docs/sectors.md) | Sector rules, scoring, and how accurate they are |
| [`config/social_accounts.yaml`](config/social_accounts.yaml), [`docs/social.md`](docs/social.md) | Curated social accounts, why each is listed, retention and embeds |
| [`docs/security.md`](docs/security.md) | Headers, CSP, rate limiting, secrets and reader privacy |
| [`docs/deploy.md`](docs/deploy.md) | Going live on Neon + Render + Cloudflare Pages ($0) |
| [`render.yaml`](render.yaml), [`backend/api/Dockerfile`](backend/api/Dockerfile) | API deployment (Render Blueprint, Docker image) |

## Run it locally

You need Java (any recent JDK; Gradle downloads Java 21 itself), Node 24 and Python 3.

```bash
# Compliance config
python3 -m venv .venv && .venv/bin/pip install -r scripts/requirements.txt
.venv/bin/python -I scripts/validate_config.py

# Backend: core (config + display policy), ingest (hourly job), api (read-only REST)
cd backend && ./gradlew build          # Testcontainers tests need Docker; skipped without it
./gradlew :api:bootRun                 # http://localhost:8080/api/v1/sources

# Frontend (dark by default; dev-only component gallery at /dev/gallery)
cd frontend && npm install && npm run dev   # http://localhost:5174
npm test                                    # Vitest component tests
npm run e2e                                 # Playwright + axe on the production build (uses installed Chrome)
```

Database setup (local and Neon) is in [`docs/database.md`](docs/database.md).

## Case study

**The question.** Could one person build a credible, free-to-run news discovery site for
Asia that never shows anything it has no right to show, and says so when it knows little?

**Constraints I set:**
- $0 hosting: Cloudflare Pages, Render Free, Neon Free and GitHub Actions.
- No paid or generative AI.
- Every source checked against its terms before use.
- No made-up coverage: an empty city stays empty.

**Decisions that shaped it:**
- **Rights first, checked twice.**
  - A single `DisplayPolicy` decides what each story may show, at ingestion and again on every API read. Denying a publisher today hides its stories today.
  - 54 publisher domains are reviewed with evidence links. Only 6 allow headline display, and every South Korean outlet reviewed declines. That gap is shown on the site rather than papered over.
- **GDELT's raw files, not its APIs.**
  - The DOC API rate-limited or returned nothing; the GEO API was gone. The 15-minute GKG files work, so the job reads those, with a cursor that treats "newest file not published yet" as normal.
  - Six hours of GDELT, about 26,000–31,000 rows, yield roughly 60 showable stories. Almost all the rest come from publishers who have not allowed reuse.
- **Places with roles.** A city a story *mentions*, where it is *datelined* and where its *publisher* sits are three different facts. Stories that only name a country are never pinned to the capital.
- **Sector tags you can audit.**
  - Keyword rules in a YAML file, and every tag shows the rules that fired.
  - On a holdout written after the rules were frozen: 100% precision, 33% recall. The site says tags are often missing instead of hiding that.
- **Social kept apart.**
  - Five domain-verified newsroom accounts.
  - Official embeds that load only on click.
  - Posts deleted or labelled upstream disappear within an hour.

**What the tests caught:**
- Testcontainers containers stopped while Spring reused a cached context.
- A theme script the CSP would have blocked.
- A sector-tag button that Chrome announced as "Economy : why this sector".
- A hero headline that wrapped to four lines on laptops.
- A table only a mouse could scroll.
- A NULL bug in the social linker, found on the first run against live Bluesky.

**Numbers:**
- 227 backend tests, of which 27 Postgres integration tests run in CI.
- 102 component tests and 62 end-to-end tests.
- 131 KB of JavaScript (gzipped) before the map loads.

**Next:**
- Deploy.
- Finish the Japan Times and NHK checks.
- Add reviewed journalists.
- Grow beyond four countries one reviewed publisher at a time.

## Attribution

- Discovery data: [The GDELT Project](https://www.gdeltproject.org/).
- City data: [GeoNames](https://www.geonames.org/), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- Map tiles: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, drawn with [Leaflet](https://leafletjs.com/).
