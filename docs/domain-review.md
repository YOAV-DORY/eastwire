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

## Second batch (2026-10-13): chosen by volume

The first batch came from a list of well-known outlets. The second came from data: 13 GDELT GKG
files (12,401 rows, about 3 hours) were counted for publishers that mention China, India, South Korea
or Japan. The English GKG stream turned out to be **dominated by Indian publishers**; Japanese and
Korean publishers barely appear.

| Domain | Rows in sample | Decision | Rule | Basis (paraphrased) | Evidence |
|---|---|---|---|---|---|
| indiatimes.com (Times of India, ET) | 119 | deny | D2 | Bars aggregating, scraping or redistributing content and automated summarization or aggregation without approval | [terms](https://www.indiatimes.com/termsandcondition) |
| aninews.in | 90 | deny | D2 | Bars displaying, publishing or framing content from the site | [terms](https://www.aninews.in/term-condition/) |
| moneycontrol.com | 44 | deny | D2 | Bars direct or indirect redistribution and public display | [terms](https://www.moneycontrol.com/cdata/termsofuse.php) |
| business-standard.com | 34 | **allow** | A1 | Only restricts scraping of its own services and user posts | [terms](https://www.business-standard.com/terms-conditions) |
| livelaw.in | 31 | deny | D2 | Bars display, "including framing and inline linking" | [terms](https://www.livelaw.in/terms-and-conditions) |
| manilatimes.net | 22 | deny | D2 | Personal non-commercial use only; no display or communication to the public | [terms](https://www.manilatimes.net/terms-of-service) |
| chinadaily.com.cn | 21 | deny | D2 | Footer: no republication or use in any form without written authorization | [site](https://www.chinadaily.com.cn/) |
| asiaone.com | 21 | deny | D1 | Linking to provide access to content needs written consent | [terms](https://www.asiaone.com/terms-and-conditions) |
| rediff.com | 16 | deny | D2 | No reproduction, distribution or display | [terms](https://www.rediff.com/terms.html) |
| bignewsnetwork.com and 8 sister sites | 200+ | deny | Q1 | Aggregator network republishing wire copy | — |
| tribuneindia.com, newindianexpress.com, freepressjournal.in, outlookindia.com, deccanchronicle.com | — | pending | P1 | Reader terms not found or not readable | — |

Already decided in batch 1 and frequent in the sample: thehindu.com (58), hindustantimes.com (53),
thehindubusinessline.com (36), livemint.com (28), koreaherald.com (12); all denied.

## Third batch (2026-10-15): why Japan, Korea and China were missing

A fresh 6-hour sample (23 GKG files, 18,952 rows, 2026-10-15 02:45–08:45 UTC) counted publishers
per covered country. The allowed Japanese and Chinese outlets **did not appear at all**: Mainichi,
Asahi, Sixth Tone and Caixin each had 0 rows. The English GKG stream carries the high-volume
outlets that deny display (China Daily 95 rows about China, Korea Herald 34 about Korea, Times
of India 24 about Japan) and aggregators. GDELT alone cannot fix the imbalance, so three
publishers whose terms allow headline links are now read directly (see sources.yaml and
source-matrix.md rows 8a–8f):

| Domain | Decision | Rule | Basis (paraphrased) | Evidence |
|---|---|---|---|---|
| mainichi.jp (English RSS) | allow (direct feed) | A1 + RSS terms | The RSS page forbids only commercial use of the RSS service; robots.txt names only AI crawlers | [RSS page](https://mainichi.jp/english/rss/) |
| sixthtone.com (RSS) | allow (direct feed) | A2 | Linking free and encouraged; citing allowed with credit; no clause on automated access; no robots.txt | [terms](https://www.sixthtone.com/terms-use) |
| nippon.com | **allow** | A2 | Free to link without permission; links must say they go to Nippon.com; no framing | [copyright](https://www.nippon.com/en/copyright/) |
| world.kbs.co.kr | deny | D2 | Footer: no copy, distribution or use of the content | [RSS page footer](https://world.kbs.co.kr/service/about_rss.htm?lang=e) |
| hani.co.kr | pending | P2 | Web use of articles is licensed for a fee; silent on headline links | [copyright guide](https://member.hani.co.kr/help/rules/mypage_help_copyright.hani) |
| korea.net | pending | P1 | Every automated request redirected in a loop; no license mark readable | — |
| english.news.cn, en.people.cn | pending | P1 | Terms not found on 2026-10-15 | — |

South Korea is still the largest gap: no Korean outlet checked allows headline display without
permission. The site says so on Sources & method.

## What this means for coverage

- **Allowed now** (7, plus direct headline feeds from Mainichi, Sixth Tone and Nippon.com since 2026-10-15):
  - Japan: Mainichi, Asahi, Nippon.com.
  - China: Sixth Tone, Caixin Global.
  - India: Scroll, Business Standard.
- **Most high-volume publishers deny display without permission.** Of the frequent original-reporting publishers in the sample, only Business Standard could be allowed. GDELT will stay a small, India-leaning layer. Global Voices (CC BY) and, later, social accounts carry most of the Japan and Korea coverage.
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
