# Source permission matrix

Every source EastWire considered, what it allows, and the evidence behind each decision.
All checks were made on **2026-10-13**. The machine-readable copy is
[`config/sources.yaml`](../config/sources.yaml), and `scripts/validate_config.py` checks
that the two agree on the rules that matter (excluded and conditional sources stay disabled).

Publisher domains discovered through GDELT have their own review: see
[`domain-review.md`](domain-review.md) and [`config/domains.yaml`](../config/domains.yaml).

> This is a record of what each source's published terms say and how EastWire applies them.
> It is not legal advice.

## 1. What live testing showed (2026-10-13)

| Check | Result |
|---|---|
| GDELT DOC 2.0 `api.gdeltproject.org/api/v2/doc/doc?mode=artlist&format=json` | First call returned HTTP 200 with an empty body `{}`. The next call returned **HTTP 200 with a plain-text message** ("Please limit requests to one every 5 seconds…"), not JSON. Later calls got **HTTP 429**, even after waiting 15 s, 90 s and 5 min. Treat it as unreliable. |
| GDELT GEO 2.0 `api.gdeltproject.org/api/v2/geo/geo` | **404** on all 4 parameter variants tried. Unavailable. |
| GDELT raw files `data.gdeltproject.org/gdeltv2/lastupdate.txt` | Current: it listed the 11:30 UTC slot at 11:31. The newest listed `.gkg.csv.zip` **returned 404 for several minutes** after being listed. The previous slot returned 200 (about 4.8 MB zipped). |
| GKG sample (11:15 UTC slot, English stream) | 1,098 documents. About 205 had a location in China, India, South Korea or Japan (IN 136, CN 59, JP 26, KR 9; one document can count for several countries). 1,170 location mentions were country-level and 544 were city-level, so **most geography is country-level**. Titles were available in `<PAGE_TITLE>`. Low-quality aggregator domains appeared (e.g. heraldglobe.com, parisguardian.com). So did The Hindu domains, which are excluded. |
| GKG location IDs | GKG `FeatureID` is a GNS ID (e.g. `-2106102` for New Delhi), **not a GeoNames ID**. It has to be matched to the city list by name plus distance. Country codes are **FIPS** (CH, IN, KS, JA), not ISO. |
| Bluesky `public.api.bsky.app/xrpc/app.bsky.feed.searchPosts` | **403** from the CDN (request country: IL). |
| Bluesky `public.api.bsky.app/.../getAuthorFeed` | 200, no token needed. No rate-limit headers were returned. |
| Bluesky `api.bsky.app/.../searchPosts` without a token | 200, but this host is not cached and the docs ask "public web" uses to go through `public.api`. Not used. |
| Bluesky oEmbed `embed.bsky.app/oembed?url=…/post/…` | 200. Returns a blockquote plus an embed script, with `cache_age` 86400. |
| Bluesky docs | `docs.bsky.app` now redirects to `bsky.network/docs` and `endpoints.bsky.app`. |
| Japan Times `japantimes.co.jp/feed/` (trailing slash) | 200 RSS with 30 items. Fields: title, link, category, pubDate, `jto:credit`, author, a one-sentence description (dek), and media. `/feed` without the slash, `robots.txt` and the link-policy page all return a **Cloudflare bot challenge**. I did not try to get past it. |
| Global Voices country feeds | 200, with full text in `content:encoded`. **Volume is low:** the latest 15 South Korea items span June 2025 to September 2026. |
| The Hindu / Korea Times feeds | Both return 200. Their terms still block reuse (see the matrix). |

---

## 2. Source permission matrix

Status meanings:
- **Verified:** usable now under the stated conditions.
- **Conditional:** stays disabled until the listed condition is met.
- **Excluded:** never used unless the publisher gives written permission.

An "Excluded" source is excluded on every path, including indirect ones such as GDELT.

### News and discovery sources

| # | Source | Exact endpoint | Geography | Auth / approval | Free quota / cost | Allowed display (method / fields) | Attribution | Retention / deletion | Evidence (URL, date) | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | GDELT GKG 2.x raw files (English stream) | `https://data.gdeltproject.org/gdeltv2/lastupdate.txt` points to `…/{YYYYMMDDHHMMSS}.gkg.csv.zip` | Global; filter FIPS CH, IN, KS, JA | None | $0. No published quota. About 5 MB per 15 min | Used for discovery and geo metadata. Display **only for allowlisted domains**: PAGE_TITLE as the link text, plus domain, time and link-out. No summary. No `socialimage`. | "Data: The GDELT Project" with a link to gdeltproject.org (required) | 30 days. Purge if a domain is later denied. | gdeltproject.org/about.html ("unlimited and unrestricted use", citation required; says nothing about article copyright); live test 2026-10-13 | **Verified** for data access. **Conditional** for each domain's display. |
| 2 | GDELT DOC 2.0 API | `https://api.gdeltproject.org/api/v2/doc/doc?query=…&mode=artlist&format=json&maxrecords≤250` | Global; rolling 3-month window | None | Free; 1 request per 5 s; 429s observed | Same as #1 | Same as #1 | Same as #1 | DOC 2.0 blog post; live test 2026-10-13 | **Conditional.** Disabled; optional fallback only. |
| 3 | GDELT GEO 2.0 API | `https://api.gdeltproject.org/api/v2/geo/geo` | n/a | n/a | n/a | n/a | n/a | n/a | Live test: 404 ×4, 2026-10-13 | **Excluded** (unavailable) |
| 4 | Global Voices RSS | `https://globalvoices.org/-/world/east-asia/{china,japan,south-korea}/feed/`, `https://globalvoices.org/-/world/south-asia/india/feed/`, topic feeds `/-/topics/{economics-business,politics,technology,environment}/feed/` | Country and topic | None | $0 | Headline, plus an excerpt of up to about 300 characters taken from the feed `description`, author, date and link. **No images or media** (they may be licensed differently). No full text, no translations. Posts that are partner reprints from other outlets are shown as link-only. | "By {author}, Global Voices · CC BY 3.0 (link) · excerpt, shortened" | 90 days. Remove on 404 or a byline-removal request. | globalvoices.org/about/global-voices-attribution-policy/ ("Updated 9 April 2025"; links CC BY 3.0); feeds live 2026-10-13 | **Verified** (text only) |
| 5 | Japan Times RSS | `https://www.japantimes.co.jp/feed/` | Japan | No key. Cloudflare challenges `robots.txt` and the policy page | $0 | Headline, plus the RSS dek as an excerpt (well under the 20% cap), credit placed right next to it, and link. Items credited to wire services (AFP, Jiji, Kyodo, Reuters, Bloomberg, AP): **headline + link only**. No photos. | "The Japan Times" next to the excerpt, with the original link | 30 days | japantimes.co.jp/about-us/link-policy/: could not re-read on 2026-10-13 (Cloudflare). The 20% rule comes from the project brief and a third-party archive (edit.tosdr.org/documents/12023). Feed live. | **Conditional.** Disabled until a person reads the policy and robots.txt in a normal browser, archives them, and ideally gets email confirmation of automated use. Also check that the feed works from GitHub Actions IP addresses. |
| 6 | The Hindu RSS | e.g. `https://www.thehindu.com/news/national/feeder/default.rss` | India | Terms require **prior written consent** for automated collection | n/a | None. Also deny thehindu.com and thehindubusinessline.com in the GDELT layer. | n/a | n/a | thehindu.com/termsofuse/ (effective 18 Jan 2023): bans automated collection without written consent; bans caching; bans "commercial or public purposes"; non-commercial use limited to "personal or academic dissemination"; allows a limited right to hyperlink. Read 2026-10-13. | **Excluded** until written consent |
| 7 | Korea Times RSS | `https://feed.koreatimes.co.kr/k/allnews.xml` (plus `/k/{southkorea,economy,business,foreignaffairs,…}.xml`) | South Korea | **Prior written permission** needed to redistribute or publish | n/a | None. Deny in the GDELT layer. | n/a | n/a | koreatimes.co.kr/copyright; koreatimes.co.kr/termsofservice (effective 2 May 2025; no commercial use without consent). The RSS page presents feeds as a way to read the site. Read 2026-10-13. | **Excluded** until written permission |
| 8 | SCMP | none | Hong Kong / China | Terms forbid it | n/a | None. **Deny scmp.com on every path.** | n/a | n/a | scmp.com/terms-conditions (updated 15 Sep 2026): §3.2.1 bans automated access, extraction and indexing, "including… metadata", "whether… directly or via third-party sources"; §3.2.3 bans unauthorised links | **Excluded** |
| 8a | The Mainichi (English) latest-articles RSS | `https://mainichi.jp/rss/etc/english_latest.rss` (RSS 1.0, served as text/html) | Japan, plus world wire copy | None | $0. 20 latest items | Headline, link, publisher credit, publication time. **No excerpt, no images.** The summary is read only to find a dateline and places, then dropped. Items with no main-subject place in a covered country (e.g. US sports wire copy) are skipped. | "The Mainichi" on each card | 30 days | mainichi.jp/english/rss/ (read 2026-10-15): "Use of our RSS service for commercial purposes is prohibited", nothing else restricts it; copyright page reviewed 2026-10-13 (rule A1); robots.txt names only AI crawlers | **Verified** (headline only; non-commercial condition) |
| 8b | Sixth Tone RSS | `https://www.sixthtone.com/rss` (redirects to its API) | China | None | $0. About 50 items over a week | Headline, link, credit by name, publication time. No excerpt, no images. Items in FEATURES, Q & A or VOICES go to Reading, not Latest. Dates like "Oct 14, 2026" are parsed; an item without a date is not stored. | "Sixth Tone" on each card | 30 days | sixthtone.com/terms-use (read 2026-10-15): "free (and encouraged) to link to our articles"; citing allowed with credit (rule A2); no clause on automated access; no robots.txt | **Verified** (headline only) |
| 8c | Nippon.com (English) RSS | `https://www.nippon.com/en/feed/` | Japan | None | $0. About 20 items over ten days | Headline, link, credit, publication time; all items are features (Reading section). No excerpt, no images, no framing. | "Nippon.com" on each card | 30 days | nippon.com/en/copyright/ (read 2026-10-15): free to link without permission; links must say they go to Nippon.com; no framing (rule A2); robots.txt does not cover the feed | **Verified** (headline only) |
| 8d | KBS World | `https://world.kbs.co.kr/service/about_rss.htm?lang=e` | South Korea | n/a | n/a | None | n/a | n/a | Footer on every page including the RSS page (read 2026-10-15): no copy, distribution or use of the content | **Excluded** |
| 8e | The Hankyoreh (English) RSS | `https://english.hani.co.kr/rss/english_edition/` | South Korea | n/a | n/a | None until permission | n/a | n/a | member.hani.co.kr copyright guide (read 2026-10-15): web use of articles is licensed for a fee via the Korea Press Foundation; silent on headline links | **Conditional** (ask copyright@hani.co.kr) |
| 8f | Korea.net | n/a | South Korea | n/a | n/a | n/a | n/a | n/a | Every automated request redirected in a loop on 2026-10-15, so no page or license mark could be read | **Conditional** (read a KOGL mark in a browser first) |

### Social sources

| # | Source | Exact endpoint | Geography | Auth / approval | Free quota / cost | Allowed display (method / fields) | Attribution | Retention / deletion | Evidence (URL, date) | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| 9 | Bluesky, curated accounts | `GET https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor={did}`; revalidate with `app.bsky.feed.getPosts?uris=…` (up to 25); display through `https://embed.bsky.app/oembed?url=https://bsky.app/profile/{h}/post/{rkey}` | Based on account: curated Asian newsrooms, journalists and official accounts | None | $0. Docs call limits "generous"; no numeric guarantee | **Official embed** (blockquote plus the embed script). Store uri, cid, handle, createdAt, labels, and text (used only for the search index). | The embed shows the author. Label "Social post · not verified reporting". Link to the post on bsky.app. | Revalidate every run for 30 days, then delete. Delete immediately if the post is missing, or carries `!no-unauthenticated` or adult/graphic labels. | bsky.network/docs/advanced-guides/rate-limits ("do not support authentication… generous rate-limits"); …/oembed (deleted posts are redacted, opt-out is enforced); live tests 2026-10-13 | **Verified** |
| 10 | Bluesky search | `app.bsky.feed.searchPosts` | Keyword | n/a | 403 on `public.api` | n/a | n/a | n/a | Live test 2026-10-13 | **Conditional.** Disabled. |
| 11 | YouTube, curated channels | `GET https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=UU…`; `GET …/videos?part=snippet,status&id={≤50 ids}` | Based on channel | Google Cloud project plus an API key, kept on the server only | $0. 10,000 units/day; `search.list` is a separate 100 calls/day and **is not used**. Each call costs 1 unit. | **Official embedded player**: privacy-enhanced `youtube-nocookie.com`, click-to-load facade. Show title, channel, publish date, API thumbnail. Never modify the player. No downloads, no transcripts. | YouTube must be clearly shown as the source; never hide its branding | Refresh or delete stored data within 30 days. Check daily with `videos.list`; delete removed or private videos. | developers.google.com/youtube/v3/determine_quota_cost (updated 2026-10-08); …/terms/developer-policies (updated 2026-09-14; III.E.4.c 30-day rule, III.E.1 no downloads, III.E.6 no scraping, III.F.2 branding, III.I player) | **Verified** |
| 12 | Telegram | Official post widget; embed code generated from the t.me post page for **manually curated** public channel posts | Public channels | None | $0 | Widget embed only. No harvesting, no automated discovery. | Shown by the widget | Manual review; 30 days | core.telegram.org/widgets/post ("embed messages from public groups and channels"; no API for discovery) | **Conditional** (later; manual only) |
| 13 | Mastodon | `GET https://{instance}/api/v1/timelines/tag/{tag}` | Per instance | Depends on the instance. Access-controlled since 4.5; may return 401 or `[]` | Depends on the instance | n/a until reviewed | n/a | n/a | docs.joinmastodon.org/methods/timelines/ | **Conditional.** Disabled until each instance is reviewed. |
| 14 | Reddit Data API | n/a | n/a | **Explicit approval required** before any data access | n/a | n/a | n/a | n/a | Responsible Builder Policy (support.reddithelp.com, "updated 7 days ago") | **Excluded** until approved |
| 15 | Weibo | `http://api.t.sina.com.cn/statuses/search.json` (legacy) | China | OAuth app approval; current status unknown | Unknown | n/a | n/a | n/a | open.weibo.com/wiki/Statuses/search/en: doc dated **24 Jan 2011** | **Excluded** (unverified) |
| 16 | Naver News Search | `https://openapi.naver.com/v1/search/news.json` | South Korea | Client ID and Secret | 25,000 calls/day according to the project brief. **Not re-verified:** developers.naver.com was blocked for my tools. | Results are in Korean, and the no-translation rule means they can't be shown | n/a | n/a | Project brief; third-party sources | **Conditional.** Disabled; maybe discovery-only later. |
| 17 | LINE Messaging API | Webhooks | n/a | Limited to a bot's own chats | n/a | Not a public-news source. Never collect chats. | n/a | n/a | developers.line.biz/en/docs/messaging-api/receiving-messages/ | **Excluded** |
| 18 | X API | Pay-per-use | n/a | Developer account plus prepaid credits | **$0.005 per post read**, $0.010 per user read, capped at 3M post reads per month. No free tier described ($20 promo credit). | n/a | n/a | n/a | docs.x.com/x-api/getting-started/pricing (2026-10-13) | **Excluded** under the $0 budget. No scraping. |

### Map and gazetteer sources

| # | Source | Exact endpoint | Geography | Auth / approval | Free quota / cost | Allowed display (method / fields) | Attribution | Retention / deletion | Evidence (URL, date) | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| 19 | OSM standard tiles | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | Global | Must follow the policy: valid Referer, no bulk downloads, respect caching | $0. Best effort, no SLA | Map tiles | "© OpenStreetMap contributors", bottom-right | Browser cache only | operations.osmfoundation.org/policies/tiles/ | **Verified** for low-traffic use. Tile URL is configurable. |
| 20 | GeoNames dumps | `https://download.geonames.org/export/dump/cities15000.zip` (also `cities5000.zip`) | Global | None | $0 | Gazetteer and the optional population layer | "GeoNames, CC BY 4.0" | Static | download.geonames.org/export/dump/readme.txt (CC BY 4.0) | **Verified** |
| 21 | CARTO basemaps (e.g. Voyager without labels) | `https://basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png?key=…` | Global | **API key required** ("An API key is required to use CARTO basemaps", README re-read 2026-10-15); keys by e-mail | Free for non-commercial use up to 5M tile requests a month | Map tiles | "© OpenStreetMap contributors, © CARTO", visible in a corner (carto.com/attribution, read 2026-10-15) | Browser cache | github.com/CartoDB/basemap-styles; carto.com/attribution. carto.com/legal/basemap-terms still to be read. | **Conditional.** The owner requests a key and reads the terms; then set `VITE_TILE_URL` and `VITE_TILE_ATTRIBUTION` at build time (and add the host to the CSP `img-src`). Until then OSM tiles (#19), softened without inversion so their labels stay readable. |
| 22 | Wikimedia Commons (illustrative images) | `https://thumb.wikimedia.org/wikipedia/commons/thumb/…/{500,960,1920}px-…` | n/a | None | $0 | Only files listed in `config/images.yaml`, each with its own file page read: CC0, public domain, CC BY or CC BY-SA. Shown beside lead and secondary stories as a labelled **illustrative image** of the place or topic, never of the event, with creator, license and file-page links. Resized and cropped to fit; no other change. | The creator's requested credit and the license, linked, under every image | Not stored: loaded from Wikimedia's servers | Each file's Commons page (read 2026-10-15); see docs/images.md | **Verified** per file |

### Rules for every source

- An RSS feed, public visibility, or a summary we write ourselves **does not count as permission**.
- No full articles, no translations, no unlicensed photos, no paywall bypass, no made-up coverage.
- If a source does not give enough permitted text for an excerpt, show none.
- Third-party domains from GDELT start in a `pending` state. A domain becomes `allow` only after its terms are reviewed and saved with an evidence URL and date.
- Candidates to review first (not yet checked):
  - Japan: NHK World, Kyodo, Mainichi English, Asahi AJW, nippon.com
  - South Korea: Yonhap English, Korea Herald, JoongAng Daily, Hankyoreh English
  - India: Indian Express, Hindustan Times, Scroll, The Wire, Mint
  - China: Xinhua English, China Daily, Sixth Tone, Caixin Global
  - Regional: CNA
- Watch for Nikkei, which has a history of restrictive linking rules.
