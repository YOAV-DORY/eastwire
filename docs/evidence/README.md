# Evidence

Saved copies of the terms pages that EastWire's source and domain decisions depend on.
Terms change, so a dated copy shows what a decision was based on.

**File naming:** `YYYY-MM-DD_<domain>_<page>.pdf`, e.g. `2026-10-13_japantimes.co.jp_link-policy.pdf`.

## How to save a page

1. Open the page in a normal browser (Safari or Chrome).
2. File → Export as PDF, or Print → Save as PDF.
3. Save it here using the naming pattern above, and reference it from `config/domains.yaml` or `config/sources.yaml`.

Saving and committing a copy of a terms page as evidence is common practice. If you'd rather
not commit full copies, keep the PDFs outside the repo and commit only a checklist entry
with the date.

## Open item: The Japan Times (manual check required)

Automated reads of these pages hit a Cloudflare bot challenge on 2026-10-13. EastWire did not try to get around it.

- [ ] Open https://www.japantimes.co.jp/about-us/link-policy/ and save it as a PDF.
- [ ] Confirm the excerpt rule: up to 20% of an article, with credit next to the excerpt and a link to the original.
- [ ] Check whether it says anything about RSS, automated collection, aggregators or wire-service content.
- [ ] Open https://www.japantimes.co.jp/robots.txt and save it. Check whether `/feed/` is disallowed for general user agents.
- [ ] Optional, but best: email The Japan Times to confirm a non-commercial portfolio may show feed headlines plus deks with attribution.
- [ ] Record the outcome in `config/sources.yaml` (`japan-times`) and `config/domains.yaml` (`japantimes.co.jp`). Only then can it be enabled.

## Open item: NHK WORLD-JAPAN

- [ ] Email NHK to ask whether automatically generated headline links are acceptable under Article 11 of https://www3.nhk.or.jp/nhkworld/en/terms/.
