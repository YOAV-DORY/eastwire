"""Build config/cities.csv, EastWire's documented major-city list, from GeoNames.

Selection rule (see docs/cities.md). For every phase-1 country in config/countries.yaml,
a populated place is included if it is any of:
  - the national capital            (GeoNames feature code PPLC)
  - a first-level admin capital     (feature code PPLA, e.g. a province/state/prefecture seat)
  - a city with population >= 2,000,000 according to GeoNames
    (2M, not 1M: GeoNames figures for many Chinese cities cover the whole prefecture,
     so a 1M cut-off selected 157 extra Chinese entries, some with placeholder values)
Never included: city sections and low-level seats (feature codes PPLX, PPLA3, PPLA4), which
are districts such as Pudong (Shanghai) or Bao'an (Shenzhen) rather than separate cities,
and any geonames_id listed under `exclude` in config/city_curation.yaml.

Aliases (historic or English exonyms such as Bombay -> Mumbai) come from the hand-curated
config/city_curation.yaml, not from GeoNames alternate names, which mix airport codes and
other languages' spellings that would cause false gazetteer matches.

Inputs (download first; data/raw/ is gitignored):
  https://download.geonames.org/export/dump/cities15000.zip   -> data/raw/cities15000.txt
  https://download.geonames.org/export/dump/admin1CodesASCII.txt

GeoNames data is CC BY 4.0. The output keeps a population_source column so the population
layer can credit it. Population figures come from GeoNames and their year varies.

Usage:
  .venv/bin/python -I scripts/build_cities.py \
      --cities data/raw/cities15000.txt --admin1 data/raw/admin1CodesASCII.txt \
      --countries config/countries.yaml --curation config/city_curation.yaml \
      --out config/cities.csv
"""

import argparse
import csv
import sys
from collections import Counter

import yaml

MIN_POPULATION = 2_000_000
SUB_CITY_FEATURE_CODES = {"PPLX", "PPLA3", "PPLA4"}

# GeoNames 'geoname' table column positions.
GEONAME_ID, NAME, ASCII_NAME, LAT, LON = 0, 1, 2, 4, 5
FEATURE_CODE, COUNTRY, ADMIN1, POPULATION = 7, 8, 10, 14


def load_phase1_countries(path):
    with open(path, encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return {c["iso2"] for c in data["countries"] if c["phase"] == 1}


def load_admin1_names(path):
    names = {}
    with open(path, encoding="utf-8") as f:
        for line in f:
            parts = line.rstrip("\n").split("\t")
            if len(parts) >= 3:
                names[parts[0]] = parts[2]  # key "CN.22" -> ASCII name
    return names


def load_curation(path):
    """Curated aliases {(country_iso2, ascii name): [aliases]} and excluded geonames ids."""
    with open(path, encoding="utf-8") as f:
        data = yaml.safe_load(f)
    aliases = {(cc, name): list(names)
               for cc, cities in data["aliases"].items()
               for name, names in cities.items()}
    excluded = {entry["geonames_id"] for entry in data.get("exclude", [])}
    return aliases, excluded


def strip_city_suffix(name, country):
    """GeoNames names for some Japanese/Korean cities carry a '-shi' / '-si' (city) suffix."""
    suffix = {"JP": "-shi", "KR": "-si"}.get(country)
    if suffix and name.endswith(suffix):
        return name[: -len(suffix)]
    return name


def selection_reasons(row):
    if row[FEATURE_CODE] in SUB_CITY_FEATURE_CODES:
        return []
    reasons = []
    if row[FEATURE_CODE] == "PPLC":
        reasons.append("national_capital")
    if row[FEATURE_CODE] == "PPLA":
        reasons.append("admin1_capital")
    if int(row[POPULATION] or 0) >= MIN_POPULATION:
        reasons.append("population_2m")
    return reasons


def build(cities_path, admin1_path, countries_path, curation_path):
    countries = load_phase1_countries(countries_path)
    admin1_names = load_admin1_names(admin1_path)
    aliases, excluded = load_curation(curation_path)
    selected = []
    with open(cities_path, encoding="utf-8") as f:
        for line in f:
            row = line.rstrip("\n").split("\t")
            if len(row) < 19 or row[COUNTRY] not in countries:
                continue
            if int(row[GEONAME_ID]) in excluded:
                continue
            reasons = selection_reasons(row)
            if not reasons:
                continue
            ascii_name = strip_city_suffix(row[ASCII_NAME], row[COUNTRY])
            selected.append({
                "geonames_id": int(row[GEONAME_ID]),
                "name": strip_city_suffix(row[NAME], row[COUNTRY]),
                "ascii_name": ascii_name,
                "country_iso2": row[COUNTRY],
                "admin1_code": row[ADMIN1],
                "admin1_name": admin1_names.get(f"{row[COUNTRY]}.{row[ADMIN1]}", ""),
                "lat": round(float(row[LAT]), 5),
                "lon": round(float(row[LON]), 5),
                "population": int(row[POPULATION] or 0),
                "population_source": "GeoNames cities15000 (CC BY 4.0; year varies)",
                "feature_code": row[FEATURE_CODE],
                "reasons": "+".join(reasons),
                "aliases": "|".join(aliases.pop((row[COUNTRY], ascii_name), [])),
            })
    for country, name in aliases:
        print(f"warning: alias entry {country}/{name} matches no selected city", file=sys.stderr)
    selected.sort(key=lambda c: (c["country_iso2"], -c["population"], c["name"]))
    return selected


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--cities", required=True)
    parser.add_argument("--admin1", required=True)
    parser.add_argument("--countries", required=True)
    parser.add_argument("--curation", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args(argv)

    cities = build(args.cities, args.admin1, args.countries, args.curation)
    if not cities:
        sys.exit("No cities selected; check the input files.")
    with open(args.out, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(cities[0].keys()))
        writer.writeheader()
        writer.writerows(cities)

    per_country = Counter(c["country_iso2"] for c in cities)
    capitals = sum(1 for c in cities if "national_capital" in c["reasons"])
    print(f"Wrote {len(cities)} cities to {args.out}: {dict(sorted(per_country.items()))}")
    print(f"National capitals found: {capitals}")


if __name__ == "__main__":
    main(sys.argv[1:])
