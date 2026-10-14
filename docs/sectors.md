# Sectors

Every story can carry up to two of six sectors. The tags come from published rules in
[`config/sectors.yaml`](../config/sectors.yaml), not from AI. Each tag on a story can show
the exact rules that produced it, and `/sector/{slug}` lists every rule.

| Sector | Means |
|---|---|
| Economy | The economy as a whole: growth, prices, jobs, trade, budgets, taxes, currencies, central banks |
| Geopolitics | Diplomacy, defence, security, sanctions, borders and the politics of governments, including elections |
| Technology | Computing, AI, chips, telecoms, space and science, including cyber security |
| Business | Companies and markets: results, deals, listings, start-ups, executives, stock indexes |
| Society | Health, education, rights, gender, crime and justice, religion, migration, labour, culture, sport |
| Environment | Climate, pollution, energy transition, wildlife, natural disasters, extreme weather |

Economy and Business are split on purpose: a central bank decision is Economy, a company's
quarterly profit is Business.

## How a story is scored

Input is only what EastWire may show plus the source's own signals:

- **Headline keyword**: adds its weight (usually 3 for a clear word like "inflation", 2 for a
  suggestive one like "budget", 1 for a weak hint like "company").
- **Keyword only in the shown excerpt**: adds half its weight. Excerpts exist only where a
  licence allows them (Global Voices).
- **Negative phrase**: subtracts its weight ("flood of cheap imports" is not a flood,
  "blue-chip stocks" are not chips).
- **Publisher topic tag** (Global Voices filed it under "Environment"): adds its weight.
- **GDELT theme codes** (e.g. `ECON_INFLATION`): add their weight, at most +2 together. GDELT
  derives them from article text we never show, so they can support a tag but never create one
  alone.

A sector is tagged when its score reaches **3**. A story keeps at most **2** sectors, highest
score first. Anything else shows no sector; that is common (see below).

Matching ignores case and punctuation and works on whole words. A trailing `*` matches word
endings (`tariff*` matches "tariffs"); stems shorter than four letters are not allowed, so
`ai*` can never match "aid". `scripts/validate_config.py` and `SectorRules` (Java) both reject
unknown sectors, typos in rule names, duplicate keywords and non-positive weights.

### Worked example

"RBI holds repo rate steady as retail inflation eases", a GDELT item with themes
`ECON_INFLATION` and `ECON_INTEREST_RATES`:

| Rule | Adds |
|---|---|
| "rbi" in the headline | +3 |
| "repo rate" in the headline | +3 |
| "inflation" in the headline | +3 |
| GDELT themes `ECON_INFLATION`, `ECON_INTEREST_RATES` | +2 (cap) |
| **Economy score** | **11**, tagged |

## When rules change

Each article stores the signals it was tagged from (`article.sector_signals`) and the version
of the rules that tagged it (`article.sector_rules_version`, a short hash of
`sectors.yaml`). The hourly ingestion run re-tags every live article whose version differs,
so an edit to the rules reaches stored stories within an hour, with no backfill job.

## How accurate is it?

Measured with `SectorEvaluationTest` (`./gradlew :core:test`), which writes
`backend/core/build/sector-*.md`. All labels were written by the person who wrote the rules.

| Set | Size | Precision | Recall | Notes |
|---|---|---|---|---|
| Development | 216 invented headlines | 98% | 88% | Rules were adjusted after reading its misses. Optimistic by design. |
| Holdout | 60 invented headlines | 100% | 33% | Written after the rules were frozen; never tuned on. Headline only, no GDELT themes, so a worst case. |
| Real sample, before tuning | 66 real items (36 GDELT, 30 Global Voices) | 76% | 69% | Real headlines with their real GDELT themes or Global Voices tags. |
| Real sample, after tuning | same 66 | 85% | 81% | After fixing two problems the sample showed (below), so these are seen data. |

What this means:

- **When a tag appears it is usually right.** Precision stays high on unseen text.
- **Many stories get no tag.** On unseen wording, keyword rules miss most of what a reader
  would tag. No tag means "our rules did not recognise it", never "not about this".
- **Real items do better than headline-only tests** because GDELT themes and Global Voices
  tags add evidence the headline lacks.

What the real sample changed:

1. Global Voices files many posts under broad "Politics", "Governance" and "Law" tags, which
   over-tagged Geopolitics (25% precision). Those tags now count for 1, 1 and 0.5, so they need
   a matching keyword. "International Relations", "War & Conflict" and "Elections" still count
   in full.
2. Business Standard's market wording was missing ("stock", "share price", "NBFC", "cr").

The holdout set was not tuned on after it was written, and its numbers above are reported as
measured. The real sample is not committed (it is real headlines); to repeat the check, build
a CSV with columns `headline,excerpt,themes,categories,expected` and run
`./gradlew :core:test --tests '*SectorEvaluationTest' -PsectorSample=path/to/sample.csv`.

## Known limits

- Indian political stories with no political keyword (court cases, protests) often land in
  Society only or in nothing.
- Company names are a short, hand-picked list; most companies are recognised only through
  words like "profit", "shares" or "IPO".
- Stories older than the V4 migration were re-tagged without GDELT themes or feed tags,
  because those signals were not stored before.
