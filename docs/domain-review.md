# Publisher domain review (GDELT-discovered items)

GDELT points EastWire to articles from thousands of publishers. GDELT's open license covers
GDELT's own data. It does **not** give EastWire any rights over the publishers' content. So a
GDELT item is shown only if its publisher's domain has been reviewed here and marked `allow`
in [`config/domains.yaml`](../config/domains.yaml). Unknown domains are treated as `pending`
and never shown.

> This is a record of what each publisher's published terms say and how EastWire applies
> them. It is not legal advice.

## What an `allow` permits

- The headline, used as link text, plus publisher name, time, and a link to the original.
- **Never** an excerpt or summary.
- **Never** an image (GDELT's `socialimage` field is ignored).
- **Never** framing or embedding the article.
- EastWire never visits the publisher's site to collect anything. Title and URL come from GDELT's
  GKG files, so a publisher's anti-scraping clause about *its own site* is not, on its own,
  a reason to deny. It is still recorded in the notes.

## Decision rules (version 1)

| Rule | Decision | Applies when the publisher's terms… |
|---|---|---|
| **A1** | allow | contain no clause against linking, display, indirect or third-party use, metadata, aggregation, or information services. Generic "all rights reserved", "no reproduction of articles" or "personal, non-commercial use" wording is noted as residual risk R1 but does not block, because EastWire is non-commercial and shows only headline links. |
| **A2** | allow | explicitly permit linking to articles, or linking from headlines, possibly with conditions. The conditions are recorded and must be followed. |
| **D1** | deny | forbid deep links to articles or require permission before linking. |
| **D2** | deny | explicitly forbid *displaying* or *publishing* content without permission, or forbid direct or indirect use, use in databases, retrieval systems or information services (including non-commercial ones). |
| **D3** | deny | forbid automated collection, indexing or reuse of content or metadata **including via third parties**. |
| **D4** | deny | the publisher is excluded in the source matrix (SCMP, The Hindu group, Korea Times). |
| **Q1** | deny | quality: aggregator sites that appear to republish other outlets' copy instead of reporting. |
| **P1** | pending | terms not yet reviewed, not found, or not readable. |
| **P2** | pending | terms are ambiguous for an automated pipeline; ask the publisher. |

Conditions that come with an allow:
- **non_commercial:** EastWire stays non-commercial, with no ads and no paid tier. If that ever changes, every `A1`/`A2` entry with `non_commercial` must be reviewed again.
- **credit_by_name:** the publisher name is shown on every card.
- **no_frames:** never frame or embed the article.
- **label_as_asahi:** the card names "The Asahi Shimbun".
- **notify_by_email_after_launch:** see the action items below.

## Results (reviewed 2026-10-13)

| Domain | Publisher | Country | Decision | Rule | Basis (paraphrased) | Evidence |
|---|---|---|---|---|---|---|
| mainichi.jp (`/english/`) | The Mainichi | JP | **allow** | A1 | Using material without permission is prohibited only for purposes other than personal or non-commercial use. No linking clause. | [copyright](https://mainichi.jp/english/info/copyright_en.html) |
| asahi.com (`/ajw/`) | The Asahi Shimbun AJW | JP | **allow** | A2 | Links are free in principle if not for profit and not framed. Headline links are explicitly covered if the link says it goes to The Asahi Shimbun Digital. Asks to be notified by email. | [site policy](https://www.asahi.com/ajw/help/policy.html) |
| scroll.in | Scroll | IN | **allow** | A1 | Personal, non-commercial use of the site; nothing on linking, headlines or third-party sourcing (terms dated April 2022). | [terms](https://scroll.in/terms) |
| sixthtone.com | Sixth Tone | CN | **allow** | A2 | Anyone may link to articles with no permission needed; citing is allowed if Sixth Tone is credited by name. | [terms](https://www.sixthtone.com/terms-use) |
| caixinglobal.com | Caixin Global | CN | **allow** | A1 | Bars copying or publishing content for commercial use only. Nothing on linking. | [terms](https://www.caixinglobal.com/terms/) |
| kyodonews.net | Kyodo News | JP | deny | D1 | Deep links to articles are not allowed without consulting Kyodo. | [copyright](https://english.kyodonews.net/list/info/copyright) |
| koreaherald.com | The Korea Herald | KR | deny | D2 | No display or publication without prior written permission. Same standard as the excluded Korea Times. | [copyright](https://members.heraldcorp.com/html/custom/copyright.php?&lang=en) |
| koreajoongangdaily.joins.com / .com | Korea JoongAng Daily | KR | deny | D2 | Bars direct or indirect display, and use in databases or (non-)commercial information services. | [copyright](https://www.koreajoongangdaily.com/copyright) |
| yna.co.kr | Yonhap | KR | deny | D2 | No direct or indirect display through any medium; non-profit information services need permission. | [copyright](https://en.yna.co.kr/aboutus/copyright) |
| hindustantimes.com, livemint.com, livehindustan.com | HT Digital Streams | IN | deny | D2 | Prohibited uses include publicly displaying content. | [terms](https://www.hindustantimes.com/termsofuse) |
| indianexpress.com | The Indian Express | IN | deny | D2 | Content may not be displayed for other purposes without consent; no indexing of the site. | [terms](https://indianexpress.com/terms-and-conditions/) |
| thewire.in | The Wire | IN | deny | D2 | No direct or indirect publishing; no inclusion in retrieval systems. | [terms](https://thewire.in/terms) |
| channelnewsasia.com | CNA (Mediacorp) | SG | deny | D1 | Bars deeplinking to its sites from other websites. | [Mediacorp terms](https://www.mediacorp.sg/terms-conditions) |
| scmp.com, thehindu.com, thehindubusinessline.com, koreatimes.co.kr | — | — | deny | D3/D4 | Excluded in the source matrix. | [source-matrix.md](source-matrix.md) |
| heraldglobe.com, parisguardian.com, pakistantelegraph.com, myanmarnews.net | — | — | deny | Q1 | Aggregators seen in the GKG sample. | — |
| nhk.or.jp | NHK WORLD-JAPAN | JP | pending | P2 | Links are permitted, except links "generated in large numbers through automated means such as bots". | [terms art. 11](https://www3.nhk.or.jp/nhkworld/en/terms/) |
| japantimes.co.jp, hani.co.kr, nippon.com, news.cn, xinhuanet.com, chinadaily.com.cn, newindianexpress.com, nikkei.com | — | — | pending | P1 | Not yet reviewed, or terms not readable. | — |

## What this means for coverage

- **Allowed now:**
  - Japan: Mainichi, Asahi.
  - China: Sixth Tone, Caixin Global.
  - India: Scroll.
- **South Korea has no allowed national outlet.** Every Korean publisher reviewed (Korea Herald, JoongAng Daily, Yonhap), plus the already-excluded Korea Times, forbids display without permission. Korean news will appear only when an allowed outlet elsewhere covers Korea, or through Global Voices.
- This is a large gap, and the site must say so on `/about/sources`. The realistic fixes are:
  - ask Hankyoreh and others for permission;
  - add Korea-focused social accounts in milestone 8.
- India and China are thin too. Several big outlets deny. The pending list (New Indian Express, Xinhua, China Daily) is the next batch to review.

## Owner action items

1. **Japan Times:** read the link policy and robots.txt in a normal browser and save PDFs (see [`evidence/README.md`](evidence/README.md)).
2. **NHK:** email NHK WORLD-JAPAN and ask whether automatically generated headline links from a non-commercial site are acceptable under Article 11.
3. **Asahi:** after launch, send the link notification email its site policy asks for.
4. Review the pending batch (P1) with the same rules.
5. Re-check every `allow` entry's terms at least every 6 months. Publishers change terms; SCMP changed its terms in September 2026.

## How to add or change a domain

1. Read the publisher's current terms, copyright and link policy pages.
2. Apply the rules above. Paraphrase the deciding clause in `notes`. Keep any direct quote under 15 words.
3. Add `evidence_url` and `checked_on`, and save a PDF of the page in `docs/evidence/` if it's an `allow`.
4. Run `.venv/bin/python -I scripts/validate_config.py`.
5. Open a PR. A domain decision is never changed without a reviewed commit.
