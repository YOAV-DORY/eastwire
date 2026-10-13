# EastWire city list

[`config/cities.csv`](../config/cities.csv) is the documented list of cities that can carry a
pin on the map. **170 cities**:

| Country | Cities |
|---|---|
| China | 67 |
| India | 39 |
| Japan | 47 |
| South Korea | 17 |

It is generated, not hand-typed, so the rule below is the whole story.

## Selection rule

For each phase-1 country in [`config/countries.yaml`](../config/countries.yaml), a GeoNames
populated place is included if it is **any** of:

1. **The national capital** (GeoNames feature code `PPLC`): Beijing, New Delhi, Seoul, Tokyo.
2. **A first-level administrative capital** (`PPLA`): a Chinese provincial capital, an Indian
   state or union-territory capital, a Korean provincial seat, or a Japanese prefectural capital.
3. **A city with population ≥ 2,000,000** according to GeoNames.

Never included:
- **City sections and low-level seats** (feature codes `PPLX`, `PPLA3`, `PPLA4`). GeoNames
  stores districts such as Pudong and Minhang (Shanghai) or Bao'an (Shenzhen) as separate
  places with multi-million populations. They are parts of a city, not cities.
- **Entries listed under `exclude`** in [`config/city_curation.yaml`](../config/city_curation.yaml),
  each with a reason. Currently only Wuzhong, whose GeoNames population looks implausible.

## Why 2 million and not 1 million

At 1M the list had 331 cities, 188 of them Chinese. GeoNames population figures for many
Chinese cities cover a whole prefecture, so 157 places qualified on population alone. Some
had placeholder values such as exactly 1,000,000. At 2M the list is 170 cities. It still
includes every capital, and the map stays readable.

## What the list does and doesn't promise

- A city on the list is a place EastWire **can** pin stories to. It is **not** a promise
  that there will be news from that city every hour, or at all. Empty cities show an honest
  empty state.
- Stories that mention only a country are never pinned to the capital. They are counted
  separately as "country-level".
- Population figures come from GeoNames, and **their year varies**. They are used only for
  the optional population layer, which is clearly labeled as separate from news volume.

## Aliases

Older or English names that show up in English headlines (Bombay, Peking, Pusan, Madras…)
are curated by hand in `config/city_curation.yaml`. GeoNames' own alternate-name list is not
used, because it mixes airport codes and other languages' spellings that would cause false
matches. For example, "Seul" is Portuguese for Seoul but also a French word.

## Regenerating

```bash
mkdir -p data/raw
curl -L -o data/raw/cities15000.zip https://download.geonames.org/export/dump/cities15000.zip
curl -L -o data/raw/admin1CodesASCII.txt https://download.geonames.org/export/dump/admin1CodesASCII.txt
unzip -o data/raw/cities15000.zip -d data/raw
.venv/bin/python -I scripts/build_cities.py --cities data/raw/cities15000.txt \
  --admin1 data/raw/admin1CodesASCII.txt --countries config/countries.yaml \
  --curation config/city_curation.yaml --out config/cities.csv
.venv/bin/python -I scripts/validate_config.py
```

Review the diff of `cities.csv` before committing. GeoNames updates its data continuously.

## Expanding to more countries

1. Add the country to `config/countries.yaml` with its ISO and **FIPS** code. GDELT uses
   FIPS: Vietnam is `VM`, the Philippines `RP`, Singapore `SN`, Bangladesh `BG`.
2. Set its phase to 1, regenerate, and review the new rows and aliases.
3. Review that country's publisher domains in `config/domains.yaml` before turning anything on.

## Attribution

City names, coordinates and populations: **GeoNames** ([geonames.org](https://www.geonames.org/)),
licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The data was changed
by EastWire: filtered by the rule above, with names cleaned up and curated aliases added.
