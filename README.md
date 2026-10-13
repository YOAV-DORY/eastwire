# EastWire

EastWire helps English-speaking readers find news from China, India, South Korea and Japan,
placed on a map, with every source shown. Asia-wide expansion comes later.

It shows what its listed sources published. It does not claim to measure what any audience
has or hasn't seen.

**Status:** milestone 5 of 9: search.
- The hourly job collects GDELT-discovered headlines from reviewed publishers and Global Voices articles ([`docs/ingestion.md`](docs/ingestion.md)).
- The read-only API serves them with a display-policy check on every read.
- The homepage shows them with country and city filters, freshness and honest empty states.
- Full-text search (`/search?q=…`) supports quoted phrases, `-exclusions` and `OR`, with every filter kept in a shareable URL. Press `/` to search; single-key shortcuts can be turned off.

Deployment steps (Neon, Render, Cloudflare Pages, all free) are in [`docs/deploy.md`](docs/deploy.md).
The map and sectors come in milestones 6–7.
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
| [`frontend/`](frontend/) | React + TypeScript: design tokens, UI primitives, placeholder home page |
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | Config validation, backend build with integration tests, frontend lint/test/build |
| [`.github/workflows/ingest.yml`](.github/workflows/ingest.yml) | Hourly ingestion (minute 17), off until `INGEST_ENABLED=true` |
| [`docs/ingestion.md`](docs/ingestion.md) | How a run works, connectors, failure handling, measured volumes |
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
```

Database setup (local and Neon) is in [`docs/database.md`](docs/database.md).

## Attribution

- Discovery data: [The GDELT Project](https://www.gdeltproject.org/).
- City data: [GeoNames](https://www.geonames.org/), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- Map tiles (planned): © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.
