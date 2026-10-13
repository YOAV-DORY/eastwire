# EastWire

EastWire helps English-speaking readers find news from China, India, South Korea and Japan,
placed on a map, with every source shown. Asia-wide expansion comes later.

It shows what its listed sources published. It does not claim to measure what any audience
has or hasn't seen.

**Status:** milestone 1 of 9 (compliance groundwork). No application code yet.
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

## Check the config

```bash
python3 -m venv .venv && .venv/bin/pip install -r scripts/requirements.txt
.venv/bin/python -I scripts/validate_config.py
```

## Attribution

- Discovery data: [The GDELT Project](https://www.gdeltproject.org/).
- City data: [GeoNames](https://www.geonames.org/), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- Map tiles (planned): © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.
