"""Consistency checks for EastWire's compliance config. Exits 1 on any error.

Checks that the rules in docs/source-matrix.md and docs/domain-review.md are actually
encoded in config/: excluded or conditional sources are disabled, every allowed domain has
evidence, excluded publishers are denied everywhere, the city list is well-formed, and the
sector rules use the six sectors the database allows.

Usage: .venv/bin/python -I scripts/validate_config.py [--config-dir config]
"""

import argparse
import csv
import datetime
import os
import sys

import yaml

SOURCE_STATUSES = {"verified", "conditional", "excluded"}
DISPLAY_MODES = {"headline_excerpt", "headline_only", "embed", "none"}
DECISIONS = {"allow", "deny", "pending"}
RULE_PREFIX_FOR_DECISION = {"allow": ("A",), "deny": ("D", "Q"), "pending": ("P",)}
# Publishers excluded in the source matrix must also be denied for GDELT-discovered items.
MUST_DENY = {"scmp.com", "thehindu.com", "thehindubusinessline.com", "koreatimes.co.kr"}
# The database's article_sector check constraint allows exactly these.
SECTOR_SLUGS = {"economy", "geopolitics", "technology", "business", "society", "environment"}
SECTOR_RULE_KEYS = ("keywords", "negative", "gdelt_themes", "feed_categories")


class Report:
    def __init__(self):
        self.errors = []

    def error(self, where, message):
        self.errors.append(f"{where}: {message}")


def load_yaml(path):
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)


def is_date(value):
    return isinstance(value, datetime.date)


def check_sources(sources, city_ids, report):
    seen = set()
    for s in sources:
        where = f"sources.yaml[{s.get('slug', '?')}]"
        if s.get("slug") in seen:
            report.error(where, "duplicate slug")
        seen.add(s.get("slug"))
        if s.get("status") not in SOURCE_STATUSES:
            report.error(where, f"status must be one of {sorted(SOURCE_STATUSES)}")
        if s.get("display_mode") not in DISPLAY_MODES:
            report.error(where, f"display_mode must be one of {sorted(DISPLAY_MODES)}")
        if s.get("status") in ("excluded", "conditional") and s.get("enabled"):
            report.error(where, f"{s['status']} sources must have enabled: false")
        if s.get("status") == "excluded" and s.get("display_mode") != "none":
            report.error(where, "excluded sources must have display_mode: none")
        if s.get("images"):
            report.error(where, "images must be false (no licensed images in the MVP)")
        evidence = s.get("evidence") or {}
        if not evidence.get("url") or not is_date(evidence.get("checked_on")):
            report.error(where, "evidence.url and evidence.checked_on (YYYY-MM-DD) are required")
        if s.get("display_mode") in ("headline_excerpt", "headline_only", "embed") and not (
                s.get("attribution") or s.get("label")):
            report.error(where, "displayed sources need an attribution or label")
        city = s.get("publisher_city_geonames_id")
        if city is not None and city not in city_ids:
            report.error(where, f"publisher_city_geonames_id {city} is not in cities.csv")


def check_domains(domains, report):
    seen = set()
    for d in domains:
        name = d.get("domain", "?")
        where = f"domains.yaml[{name}]"
        if name in seen:
            report.error(where, "duplicate domain")
        seen.add(name)
        decision = d.get("decision")
        if decision not in DECISIONS:
            report.error(where, f"decision must be one of {sorted(DECISIONS)}")
            continue
        if not str(d.get("rule", "")).startswith(RULE_PREFIX_FOR_DECISION[decision]):
            report.error(where, f"rule {d.get('rule')!r} does not fit decision {decision!r}")
        if decision in ("allow", "deny") and not is_date(d.get("checked_on")):
            report.error(where, "checked_on (YYYY-MM-DD) is required for allow/deny")
        if decision == "allow" and not d.get("evidence_url"):
            report.error(where, "allow needs an evidence_url")
        if decision == "pending" and not d.get("next_action"):
            report.error(where, "pending needs a next_action")
        for prefix in d.get("url_prefixes") or []:
            if not prefix.startswith("/"):
                report.error(where, f"url_prefix {prefix!r} must start with '/'")
    for name in MUST_DENY:
        entry = next((d for d in domains if d.get("domain") == name), None)
        if entry is None or entry.get("decision") != "deny":
            report.error("domains.yaml", f"{name} is excluded in the source matrix and must be denied")


def check_countries(countries, report):
    for key in ("iso2", "fips"):
        values = [c[key] for c in countries]
        for dup in {v for v in values if values.count(v) > 1}:
            report.error("countries.yaml", f"duplicate {key} {dup}")
    for c in countries:
        if c.get("phase") not in (1, 2):
            report.error(f"countries.yaml[{c.get('iso2')}]", "phase must be 1 or 2")


def check_cities(rows, countries, report):
    phase1 = {c["iso2"] for c in countries if c["phase"] == 1}
    ids = set()
    aliases_by_country = {}
    for row in rows:
        where = f"cities.csv[{row['geonames_id']} {row['name']}]"
        if row["geonames_id"] in ids:
            report.error(where, "duplicate geonames_id")
        ids.add(row["geonames_id"])
        if row["country_iso2"] not in phase1:
            report.error(where, "country is not a phase-1 country")
        if not (-90 <= float(row["lat"]) <= 90 and -180 <= float(row["lon"]) <= 180):
            report.error(where, "lat/lon out of range")
        for alias in filter(None, row["aliases"].split("|")):
            key = (row["country_iso2"], alias.lower())
            if key in aliases_by_country:
                report.error(where, f"alias {alias!r} also used by {aliases_by_country[key]}")
            aliases_by_country[key] = row["name"]
    for iso2 in phase1:
        if not any(r["country_iso2"] == iso2 and "national_capital" in r["reasons"] for r in rows):
            report.error("cities.csv", f"{iso2} has no national capital")
    return {int(i) for i in ids}


def check_sectors(rules, report):
    slugs = [s.get("slug") for s in rules.get("sectors", [])]
    if sorted(slugs) != sorted(SECTOR_SLUGS):
        report.error("sectors.yaml", f"sectors must be exactly {sorted(SECTOR_SLUGS)}, got {slugs}")
    if not (rules.get("threshold", 0) > 0 and rules.get("max_sectors", 0) >= 1):
        report.error("sectors.yaml", "threshold must be > 0 and max_sectors >= 1")
    for sector in rules.get("sectors", []):
        where = f"sectors.yaml[{sector.get('slug')}]"
        for field in ("label", "definition"):
            if not sector.get(field):
                report.error(where, f"missing {field}")
        for key in SECTOR_RULE_KEYS:
            for rule, weight in (sector.get(key) or {}).items():
                if not isinstance(weight, (int, float)) or weight <= 0:
                    report.error(where, f"{key} {rule!r}: weight must be a positive number")
                if key in ("keywords", "negative") and str(rule).endswith("*") and len(str(rule).rstrip("*")) < 4:
                    # "ai*" would also match "aid"; short stems must be listed word by word.
                    report.error(where, f"{key} {rule!r}: stem too short for a trailing *")
                if key == "gdelt_themes" and not str(rule).rstrip("*").replace("_", "").isalnum():
                    report.error(where, f"gdelt_themes {rule!r}: not a GDELT theme code")
                if key == "gdelt_themes" and str(rule) != str(rule).upper():
                    report.error(where, f"gdelt_themes {rule!r}: theme codes are upper case")


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--config-dir", default="config")
    args = parser.parse_args(argv)
    path = lambda name: os.path.join(args.config_dir, name)  # noqa: E731

    report = Report()
    countries = load_yaml(path("countries.yaml"))["countries"]
    check_countries(countries, report)
    with open(path("cities.csv"), encoding="utf-8") as f:
        city_ids = check_cities(list(csv.DictReader(f)), countries, report)
    check_sources(load_yaml(path("sources.yaml"))["sources"], city_ids, report)
    with open(path("cities.csv"), encoding="utf-8") as f:
        city_names = {r["name"] for r in csv.DictReader(f)}
    for name in load_yaml(path("city_curation.yaml")).get("requires_country_context", []):
        if name not in city_names:
            report.error("city_curation.yaml", f"requires_country_context name {name!r} is not in cities.csv")
    domains = load_yaml(path("domains.yaml"))["domains"]
    check_domains(domains, report)
    check_sectors(load_yaml(path("sectors.yaml")), report)

    if report.errors:
        print(f"{len(report.errors)} problem(s):")
        for e in report.errors:
            print(f"  - {e}")
        sys.exit(1)
    counts = {d: sum(1 for x in domains if x["decision"] == d) for d in ("allow", "deny", "pending")}
    print(f"Config OK: {len(city_ids)} cities, domains {counts}")


if __name__ == "__main__":
    main(sys.argv[1:])
