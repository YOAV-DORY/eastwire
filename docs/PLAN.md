# EastWire: initial build plan

## Context

EastWire is a public portfolio site that helps English-speaking readers find news from China, India, South Korea and Japan that they might not otherwise see, with a path to wider Asian coverage. It will be a live LinkedIn demo, so it has to work reliably and be honest about its sources.

- **Owner:** second-year CS student (strongest in Python and Java, works on macOS with Claude Code).
- **Decisions you made:**
  - **Hosting:** $0, no paid AI.
  - **GDELT:** third-party headlines are shown only from publisher domains you have reviewed.
- **Copy rule:** EastWire describes what its listed sources published. It never claims to measure what Western readers saw, and never uses "underreported in the West" scores.
- **Research date:** all evidence below was checked on **2026-10-13**, using live API calls plus reading each source's terms page.

---

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
| 5 | Japan Times RSS | `https://www.japantimes.co.jp/feed/` | Japan | No key. Cloudflare challenges `robots.txt` and the policy page | $0 | Headline, plus the RSS dek as an excerpt (well under the 20% cap), credit placed right next to it, and link. Items credited to wire services (AFP, Jiji, Kyodo, Reuters, Bloomberg, AP): **headline + link only**. No photos. | "The Japan Times" next to the excerpt, with the original link | 30 days | japantimes.co.jp/about-us/link-policy/: could not re-read on 2026-10-13 (Cloudflare). The 20% rule comes from your brief and a third-party archive (edit.tosdr.org/documents/12023). Feed live. | **Conditional.** Disabled until a person reads the policy and robots.txt in a normal browser, archives them, and ideally gets email confirmation of automated use. Also check that the feed works from GitHub Actions IP addresses. |
| 6 | The Hindu RSS | e.g. `https://www.thehindu.com/news/national/feeder/default.rss` | India | Terms require **prior written consent** for automated collection | n/a | None. Also deny thehindu.com and thehindubusinessline.com in the GDELT layer. | n/a | n/a | thehindu.com/termsofuse/ (effective 18 Jan 2023): bans automated collection without written consent; bans caching; bans "commercial or public purposes"; non-commercial use limited to "personal or academic dissemination"; allows a limited right to hyperlink. Read 2026-10-13. | **Excluded** until written consent |
| 7 | Korea Times RSS | `https://feed.koreatimes.co.kr/k/allnews.xml` (plus `/k/{southkorea,economy,business,foreignaffairs,…}.xml`) | South Korea | **Prior written permission** needed to redistribute or publish | n/a | None. Deny in the GDELT layer. | n/a | n/a | koreatimes.co.kr/copyright; koreatimes.co.kr/termsofservice (effective 2 May 2025; no commercial use without consent). The RSS page presents feeds as a way to read the site. Read 2026-10-13. | **Excluded** until written permission |
| 8 | SCMP | none | Hong Kong / China | Terms forbid it | n/a | None. **Deny scmp.com on every path.** | n/a | n/a | scmp.com/terms-conditions (updated 15 Sep 2026): §3.2.1 bans automated access, extraction and indexing, "including… metadata", "whether… directly or via third-party sources"; §3.2.3 bans unauthorised links | **Excluded** |

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
| 16 | Naver News Search | `https://openapi.naver.com/v1/search/news.json` | South Korea | Client ID and Secret | 25,000 calls/day according to your brief. **Not re-verified:** developers.naver.com was blocked for my tools. | Results are in Korean, and the no-translation rule means they can't be shown | n/a | n/a | Your brief; third-party sources | **Conditional.** Disabled; maybe discovery-only later. |
| 17 | LINE Messaging API | Webhooks | n/a | Limited to a bot's own chats | n/a | Not a public-news source. Never collect chats. | n/a | n/a | developers.line.biz/en/docs/messaging-api/receiving-messages/ | **Excluded** |
| 18 | X API | Pay-per-use | n/a | Developer account plus prepaid credits | **$0.005 per post read**, $0.010 per user read, capped at 3M post reads per month. No free tier described ($20 promo credit). | n/a | n/a | n/a | docs.x.com/x-api/getting-started/pricing (2026-10-13) | **Excluded** under the $0 budget. No scraping. |

### Map and gazetteer sources

| # | Source | Exact endpoint | Geography | Auth / approval | Free quota / cost | Allowed display (method / fields) | Attribution | Retention / deletion | Evidence (URL, date) | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| 19 | OSM standard tiles | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | Global | Must follow the policy: valid Referer, no bulk downloads, respect caching | $0. Best effort, no SLA | Map tiles | "© OpenStreetMap contributors", bottom-right | Browser cache only | operations.osmfoundation.org/policies/tiles/ | **Verified** for low-traffic use. Tile URL is configurable. |
| 20 | GeoNames dumps | `https://download.geonames.org/export/dump/cities15000.zip` (also `cities5000.zip`) | Global | None | $0 | Gazetteer and the optional population layer | "GeoNames, CC BY 4.0" | Static | download.geonames.org/export/dump/readme.txt (CC BY 4.0) | **Verified** |
| 21 | CARTO dark basemap (for the dark map design) | `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=…` | Global | Free API key; requests without a key get a watermark | Free for non-commercial use up to 5M tile requests per month | Map tiles | "© OpenStreetMap contributors © CARTO" | Browser cache | github.com/CartoDB/basemap-styles README (2026-10-13). The formal terms page carto.com/legal/basemap-terms is dated 23 May 2024 and needs reading before use. | **Conditional.** Until then, the fallback is OSM tiles (#19) with a CSS dark filter. |

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

---

## 3. MVP vs later

**MVP:**
- Homepage with an interactive map hero, a prominent search bar, sector chips, country and city filters, and news cards (design in section 17).
- Dark theme by default, plus a light theme.
- Saved searches stored only on the reader's device (`localStorage`).
- Hourly ingestion with last-success timestamps.
- Honest stale and empty states.
- Search with filters, pagination and shareable URLs.
- Leaflet map with a documented city list, location roles and the optional population layer.
- Six rule-based sector tags, each with an explanation.
- A separate social section with curated Bluesky accounts and YouTube channels.
- Sources & methodology page.
- Status page.
- Sources: GDELT GKG (allowlisted domains only) and Global Voices. Japan Times only if it passes the human check.

**Later:**
- Japan Times, if it is still pending.
- Telegram manual embeds.
- Mastodon, one reviewed instance at a time.
- GDELT Events `ActionGeo` as a low-confidence event location.
- DOC API fallback.
- Permission requests to Korea Times, The Hindu and SCMP.
- Expansion countries: Taiwan, Indonesia, Vietnam, Philippines, Thailand, Malaysia, Singapore, Pakistan, Bangladesh.
- Raster population data (WorldPop or GHSL).
- Admin UI.
- Upgrade to always-on hosting ($7/month on Render Starter, verified).

---

## 4. Pages and wireframes

This section sets **what each page must contain**. Section 17 sets how it looks: tokens, components, and mobile and desktop layouts.

Changes from the design brief:
- The homepage now opens with a headline over the map, then the search bar, then the feed.
- New routes: `/sector/:slug` and `/map/city/:geonameId`.
- Navigation lives in the sidebar on desktop and the bottom nav on mobile.

### `/` Home

- **Header:** `EastWire · Asian news you may not see in your usual feed`.
- **Global freshness line:** `Last successful update 11:17 UTC · details`. Turns amber after 2 h without an update, red after 24 h.
- **Filters:** country tabs (All · China · India · South Korea · Japan), city select, sector chips.
- **Main column, news cards.** Each card shows:
  - Headline as a link-out.
  - Publisher and credit, and when it was published.
  - Excerpt, only if the source allows it.
  - Location chips by role and confidence, e.g. `Mentions: Osaka · Dateline: Tokyo · Publisher: Tokyo`, with low-confidence chips dashed.
  - Sector chips with a tooltip such as "Tagged Technology: 'semiconductor', GDELT theme …".
  - Badges: `via GDELT` and `Also reported by 3 sources`.
- **Side or bottom section:** "Social posts & videos". Different background, plus a permanent label: *"Not verified reporting. Shown from curated accounts."*
- **Empty state:** "No items from our sources for Daegu in the last 24 h. This reflects our limited source list, not an absence of news."
- **Cold start:** the free host can take about a minute to wake. Show "Waking the free-tier server…" with a skeleton and an automatic retry.

### `/search?q=&country=&city=&sector=&from=&to=&page=`

- The query box and filters write to the URL, so any search can be shared.
- Results use the same cards, with pagination.
- Clear message when there are zero results.

### `/map?country=&sector=&window=24h|7d&roles=`

- Leaflet map. City markers sized by item count, counting only items placed at **city precision**.
- Role toggles: mentioned, dateline/event, publisher.
- A box for items that only have a country: `India: 42 country-level items (not placed on a city)`. They are never pinned to the capital.
- Clicking a city opens a side panel with:
  - "Last item seen: 2 days ago".
  - Items grouped by role, each with its confidence.
- Population layer toggle. It has its own legend: *"Population (GeoNames, year varies) — not news volume"*.
- Attribution for OSM and GeoNames.

### `/social`

- Bluesky and YouTube embeds, loaded only on click.
- Provenance for each item: the account type (newsroom, journalist or official), why it was curated, and a domain-verified handle where one exists.
- Corroboration chip: "Related reporting: 2 articles", or "No matching report in our sources yet".

### `/about/sources`

- The source matrix, with live status and last success for each source.
- Coverage gaps.
- Sector rules.
- Geography method and the documented city list.
- All attributions: GDELT, OSM, GeoNames, CC BY.
- Contact for takedown requests.
- Privacy policy (required by the YouTube API terms).

### `/status`

- For each source: last attempt, last success, newest item time, consecutive failures, last error class.
- Checking a source and finding new items are reported separately, e.g. "checked 11:17, newest item 3 days ago".

---

## 5. Architecture and data flow

```
GitHub Actions cron "17 * * * *" (public repo, free) ──► ingest job (Spring Boot CLI, no web)
   │  advisory lock · per-connector isolation · cursors · retries/backoff
   ├─ GDELT GKG files ─┐
   ├─ Global Voices RSS┤──► normalize ─► canonical URL/hash ─► domain policy gate ─► dedupe/cluster
   ├─ Bluesky curated ─┤        ─► geo roles (GKG locs, dateline, gazetteer, source registry)
   └─ YouTube curated ─┘        ─► sector rules ─► upsert ─► revalidate social ─► retention purge
                                                     │
                                         Neon Postgres (free, role ingest_writer)
                                                     │ (role api_reader, SELECT only)
Render Free web service: Spring Boot read-only REST API  ◄── fetch ── Cloudflare Pages: React+TS+Leaflet
                                                                          │
                              tiles: tile.openstreetmap.org · embeds: embed.bsky.app, youtube-nocookie.com
```

**Backend:** Gradle, Java 21, current GA Spring Boot. Three modules:
- `core`: domain model, policy engine, classifier, geo.
- `ingest`: connectors and the CLI runner.
- `api`: REST controllers.

Libraries: Rome (RSS), jsoup (stripping HTML to text), Flyway, Spring `JdbcClient` (needed for full-text search SQL), Resilience4j, Bucket4j, Testcontainers, WireMock.

**Frontend:** Vite, React and TypeScript, React Router (filter state lives in the URL), TanStack Query, react-leaflet with leaflet.markercluster, CSS Modules with design tokens (no Tailwind), clsx, lucide-react, self-hosted `@fontsource-variable/inter`, Vitest, Playwright.

**Curation as code:** these files live in the repo and are changed only through reviewed PRs:
- `config/sources.yaml` (this matrix)
- `config/domains.yaml`
- `config/social_accounts.yaml`
- `config/sectors.yaml`
- `config/cities.csv`
- `config/suppressions.yaml`

That means the MVP has **no admin UI and no auth**.

**Simpler alternatives:**
- **Python:** FastAPI + feedparser + psycopg against the same schema. Less boilerplate, and it's your strongest language.
- **Static-first:** the Actions job writes static JSON plus a client-side search index to Pages, with no backend. Search is weaker.

Java stays the default because it's a stronger portfolio signal.

---

## 6. Database model (PostgreSQL, Flyway)

**Sources and publishers**
- `source`: id, slug, name, kind (`news_feed|discovery|social`), connector, endpoint, publisher_country, publisher_place_id, status (`verified|conditional|excluded`), display_mode (`headline_excerpt|headline_only|embed|none`), max_excerpt_chars, attribution_template, license_name, license_url, evidence_url, evidence_checked_on, enabled, retention_days.
- `domain_policy`: domain (PK), publisher_name, decision (`allow|deny|pending`), reason, evidence_url, checked_on, publisher_country, ownership_note (e.g. "state media", with a citation).

**Ingestion tracking**
- `ingestion_run`: id, source_id, started_at, finished_at, status (`success|partial|failed|skipped`), items_seen, items_new, http_status, error_class, error_message, cursor_before, cursor_after.
- `source_status`: source_id, last_attempt_at, last_success_at, newest_item_at, consecutive_failures, circuit_open_until, last_error.

**Articles**
- `article`: id, source_id, discovered_via_source_id, canonical_url, url_hash (UNIQUE), title, excerpt (nullable), excerpt_kind (`publisher_dek|cc_by_excerpt|none`), author, credit_line, published_at, discovered_at, language, display_mode, license snapshot, cluster_id, `search_tsv` (generated column, GIN index), expires_at.
- `story_cluster`: id, first_seen_at, representative_article_id, size.

**Places and locations**
- `country`: iso2, fips, name, phase.
- `place`: geonames_id, name, ascii_name, aliases, country_iso2, admin1, lat, lon, population, population_source, is_major_city.
- `article_location`: article_id, place_id (null if country-only), country_iso2, role (`mentioned|event|publisher`), precision (`city|admin1|country`), confidence (`high|medium|low`), method (`gdelt_gkg|dateline|gazetteer|source_registry`), evidence_snippet (≤80 chars of permitted text).

**Sectors**
- `article_sector`: article_id, sector (enum of 6), score, matched_rules (jsonb).

**Social**
- `social_account`: platform, external_id, handle, kind (`newsroom|journalist|official`), base_country, reason, evidence_url, enabled.
- `social_item`: platform, external_id (UNIQUE per platform), url, account_id, created_at, fetched_at, last_verified_at, index_text, labels (jsonb), status (`active|hidden|deleted`), expires_at.
- `social_link`: social_item_id, cluster_id, link_type (`shares_url|text_overlap`), score.

**Takedowns**
- `suppression`: url_hash or external_id, reason, created_at.

---

## 7. API routes (read-only, `/api/v1`)

| Route | Returns |
|---|---|
| `GET /articles?country=&city=&sector=&role=&from=&to=&page=&size=` | Home feed |
| `GET /search?q=&country=&city=&sector=&from=&to=&sort=relevance\|date&page=&size=` | Search results. Uses `websearch_to_tsquery`; `size` ≤ 50, `page` ≤ 20 |
| `GET /articles/{id}` | Provenance, locations, sector explanation, cluster members |
| `GET /map/cities?country=&sector=&window=` | Counts per city, split by role (city precision only), plus country-only totals |
| `GET /map/cities/{geonamesId}/items?role=&window=&page=` | Items for one city |
| `GET /countries`, `GET /places?country=` | Countries and the documented city list |
| `GET /population/cities?country=` | Optional population layer |
| `GET /social?platform=&country=&page=` | Social items |
| `GET /sources` | Public matrix |
| `GET /status` | Freshness |
| `GET /health` | Health check |

Ingestion has **no HTTP trigger**: it runs only as the Actions CLI.

---

## 8. Hourly ingestion, dedupe, geography, sectors, search

**Schedule**
- Runs at minute 17 of every hour, avoiding the busy top of the hour.
- `workflow_dispatch` allows a manual run.
- `concurrency: ingest`, `timeout-minutes: 20`.
- The job takes `pg_try_advisory_lock`, so two runs never overlap.

**Connectors** run one after another. Each has its own time budget and try/catch, so one failing source never stops the others.

- **GDELT GKG**
  1. Read `lastupdate.txt`.
  2. Work out every 15-minute slot after the saved cursor, looking back at most 6 h.
  3. Download and parse each file as a stream.
     - A **404 on the newest slot is normal**: stop there and leave the cursor unchanged so the next run retries.
     - Slots older than 6 h are logged as gaps.
  4. Keep rows whose V2 locations include one of the target FIPS codes.
  5. Pass a row through only if its domain is `allow` and it has a PAGE_TITLE.
- **Global Voices**
  - Conditional GET using ETag / If-Modified-Since.
  - Rome parses the feed; jsoup turns it into text.
  - Excerpts end at a sentence boundary, ≤300 characters.
  - Posts with partner-reprint markers become link-only.
- **Bluesky:** `getAuthorFeed` for each curated DID, original posts only. Skip any post with `!no-unauthenticated` or adult/graphic labels.
- **YouTube**
  - Each hour: `playlistItems` for each curated channel, then one `videos.list` call per 50 IDs.
  - Daily: re-check every stored ID with `videos.list` for refresh or deletion.
  - Quota estimate (assumption): with 40 channels, about 1–1.5k units/day out of 10k.

**Dedupe and corroboration**
- Canonical URL: lower-case the host; drop `utm_*`, `fbclid` and fragments; strip `amp`/`m.` variants. Then SHA-256 it into the unique `url_hash`.
- Clustering: pg_trgm similarity ≥ 0.6 (tune with tests) between normalized titles within 48 h. The cluster size drives "Also reported by N".
- Social posts link to a cluster when they share its URL or overlap strongly with its text.

**Geography**, three roles kept strictly apart:
- **Mentioned**
  - Comes from GKG locations, matched to `place` by normalized name and ≤25 km distance; country codes are mapped from FIPS to ISO.
  - For RSS items it comes from gazetteer matches in the title or excerpt, with aliases and checks for ambiguous names (e.g. Hyderabad in India vs Pakistan).
- **Event**
  - Only from an explicit dateline (`SEOUL (Yonhap) —`) found in permitted text. That gives `high` confidence. Otherwise the event location is "unknown".
  - GDELT `ActionGeo` comes later, as `low` confidence.
- **Publisher:** only from the source registry or the domain policy, never from the article content.
- **Social:** never inferred from a profile, account base or language. Only an explicit place in the post text (mentioned) or the linked cluster counts.

**Cities**
- Built by a script from GeoNames `cities15000`.
- Rule: the national capital, plus first-level admin capitals (PPLA), plus places with GeoNames population ≥ 1M.
- The output is reviewed and committed as `config/cities.csv`, and the rule is documented in `docs/cities.md`.
- Expansion means adding a row to `config/countries.yaml` (ISO, FIPS, phase), regenerating the city list, and reviewing domains.

**Sectors** (`config/sectors.yaml`)
- Each of the six sectors has:
  - weighted keywords, phrases and negative terms;
  - GKG theme prefixes (e.g. `ECON_` → economy, `ENV_`/`NATURAL_DISASTER` → environment, `MILITARY`/sanctions-type themes → geopolitics);
  - feed categories (GV topics).
- An item gets a sector if its score is ≥ threshold. At most 2 sectors, otherwise "Unclassified".
- Matched rules are stored and shown to the reader.
- Economy means macro topics; business means company-level news (documented).

**Search**
- Postgres FTS over title and excerpt (english config, GIN index), plus filters.
- Social posts are searchable only in their own tab, never mixed with news.
- Offset pagination is fine at this scale.

---

## 9. Source compliance and moderation

**Policy engine**
- One `DisplayPolicy` function decides what a card may show: source + domain + item credit → `{showTitle, excerptMaxChars, showImage=false, attributionHtml, linkRequired}`.
- Every API response goes through it. Unit tests cover every row of the matrix.

**Takedowns and corrections**
- Contact address on `/about/sources`.
- Requests go into `suppressions.yaml`, and the next run hard-deletes the content.

**Social curation rules**
- Only newsrooms, journalists and official accounts.
- Prefer domain-verified Bluesky handles (e.g. `@outlet.com`).
- Each account entry records a reason and an evidence URL.
- Hide posts with moderation labels.
- Never mix social posts into news cards.
- Never call anything "verified". Corroboration wording is only "related reporting found" or "none found".

**Content and labels**
- Label state media only with a cited basis.
- No AI summaries. All excerpts are publisher or CC BY text.

**Deletion**
- Bluesky: revalidated each run. YouTube: checked daily. Hard limits come from `expires_at`.
- A retention purge runs every hour.
- The embeds themselves also redact deleted posts.

---

## 10. Reliability, rate limits, security

**Outages**
- Keep serving the last good data, with honest staleness labels.
- After 3 consecutive failures a source's circuit opens and the next 3 runs skip it; then it is retried once.
- Exponential backoff with jitter; honor `Retry-After`.
- GDELT special cases: a 200 response whose body is not JSON (plain-text rate-limit message) counts as a rate limit. The newest-file 404 is handled by the cursor.
- YouTube `quotaExceeded`: pause the connector until the daily reset.
- The job exits non-zero only if every connector fails, which makes GitHub email the owner.
- If the DB is unreachable the job fails visibly, and the API returns 503 with a friendly message.

**GitHub Actions limits (verified)**
- Scheduled runs can be delayed or dropped under load. Cursors catch up on the next run.
- Schedules are **disabled after 60 days with no repo activity**. This is noted in the README. `/status` will show the staleness honestly; no keep-alive tricks.

**Security**
- Secrets live only in GitHub Actions secrets and Render env vars. The YouTube key is never sent to the browser and is restricted to the YouTube Data API.
- Two DB roles: `ingest_writer` and `api_reader` (SELECT only). Connections use `sslmode=require`.
- Workflows use `permissions: contents: read`, actions pinned to SHAs, and never `pull_request_target`.
- API: enum and whitelist validation, length caps on `q`, limits on date ranges, parameterized SQL, Bucket4j per-IP limit, CORS limited to the Pages origin.
- Headers: CSP that allows only embed.bsky.app, youtube-nocookie.com, telegram.org (later) and the tile host; `Referrer-Policy: strict-origin-when-cross-origin` (the OSM tile policy needs a Referer); HSTS.
- Never render feed HTML. Feed text is stripped and escaped, and Bluesky embeds are built from the URI with the official script.
- Dependabot.
- No user accounts, so no personal data is stored.

**Map and attribution**
- Leaflet attribution control: "© OpenStreetMap contributors" linked to /copyright, plus GeoNames CC BY 4.0 when the population layer is on.
- GDELT citation in the footer and on /about.
- No tile prefetching. The tile URL is configurable in case OSM throttles the site.

---

## 11. Deployment and costs ($0 strict, all verified 2026-10-13)

| Piece | Plan | Cost | Verified limits |
|---|---|---|---|
| Frontend | Cloudflare Pages Free | $0 | 500 builds/month, 20,000 files, 25 MiB per file (page updated 2026-09-05) |
| API | Render Free web service, Docker, 512 MB | $0 | Sleeps after 15 min idle, about 1 min to wake, 750 instance-hours/month. Free Render Postgres expires after 30 days, so it is **not used**. |
| DB | Neon Free | $0 | 1 GB per project, 100 CU-hours per project, scales to zero after 5 min (can't be turned off) |
| Hourly job | GitHub Actions, **public repo** | $0 | Free on standard runners. Fastest schedule every 5 min. Delays possible. Disabled after 60 days idle. |
| YouTube, Bluesky, GDELT, GV, OSM, GeoNames | Within free limits | $0 | See the matrix |
| AI | None (rule-based) | $0 | n/a |
| Upgrade path | Render Starter, 512 MB always-on | $7/month | Verified on render.com/pricing |

Domain: use `*.pages.dev` / `*.onrender.com`. I did not check custom domain prices.

---

## 12. Tests and acceptance criteria

**Tests**
- **Unit:**
  - URL canonicalizer
  - FIPS → ISO mapping
  - GKG row parser and location parser
  - Gazetteer matcher and ambiguity cases
  - Dateline detector
  - Sector classifier against a hand-labeled set of about 150 synthetic headlines; precision and recall go in the README
  - `DisplayPolicy`: one case per matrix row
  - Excerpt truncation
- **Connector contract tests** (WireMock):
  - success and empty feed
  - 304 Not Modified
  - 429 with `Retry-After`
  - GDELT 200 plain-text rate limit
  - newest GKG file 404
  - timeout
  - malformed XML
  - Cloudflare challenge HTML
  - YouTube `quotaExceeded`
  - Bluesky post deleted or labeled
- **Fixtures are synthetic or headline-only.** No copyrighted article text is committed.
- **Integration:** Testcontainers Postgres (needs Docker Desktop, OrbStack or Colima on macOS) for Flyway, upserts, FTS ranking, clustering, retention purge and advisory lock.
- **API:** MockMvc for validation, pagination limits, CORS and rate limiting.
- **Frontend:**
  - Vitest/RTL for cards, provenance chips, stale and empty states, and the social label.
  - Playwright for: filter → URL → reload gives the same results; shared search URL; map city click opens the panel; population toggle legend.
  - axe accessibility checks.
  - Design checks from section 17.6: screenshots at 390 and 1280 px in dark and light themes, a contrast test on the tokens, a reduced-motion check, and CLS measurement.

**Acceptance criteria (MVP)**
1. Every card shows publisher, time and link-out. An excerpt appears only when `DisplayPolicy` allows it. No images come from any news source.
2. Excluded domains (scmp.com, thehindu.com, thehindubusinessline.com, koreatimes.co.kr) never appear in any API response. Tested.
3. The home page and `/status` show the last-successful-update time for each source and overall. More than 2 h triggers a stale banner; more than 24 h triggers an outage banner.
4. A city with no items shows the honest empty-state message. No placeholder or fabricated items.
5. Search reflects q, country, city, sector, from, to and page in the URL. Reloading or sharing gives identical results.
6. The map pins only city-precision items. Country-only counts are shown separately. Each item shows its role and confidence.
7. The population layer is off by default, has its own legend and source, and is never derived from news volume.
8. Every sector tag can show the rules that matched it.
9. Social content appears only in the labeled social section, through official embeds, with a link to the original. Posts deleted or labeled upstream disappear within one run (Bluesky) or one day (YouTube). Nothing is stored more than 30 days without a refresh.
10. One failing connector does not block the others. A GDELT newest-file 404 does not lose data.
11. Attribution is visible for OSM, GDELT, GV CC BY and GeoNames.
12. CI is green: unit, integration and E2E tests.

---

## 13. Verified facts vs assumptions

**Verified (2026-10-13):** everything marked with a date in sections 1, 2 and 11.

**Assumptions (not legal advice):**
- Showing an allowlisted publisher's headline as link text is acceptable once its terms have been reviewed.
- The Japan Times 20% excerpt rule still holds. The live page could not be read.
- The Naver limit of 25,000 calls/day.
- Spring Boot fits in 512 MB with heap tuning.
- Neon usage stays under 100 CU-hours: about 24 wake-ups a day, compute at 0.25 CU.
- With a 30–90 day retention window the DB stays under 1 GB. `/status` warns at 800 MB.
- GKG volume is extrapolated from a single 15-minute sample.
- The Bluesky search 403 may depend on IP or region.
- The YouTube quota resets daily at midnight Pacific time.
- GitHub Actions IP addresses may be challenged by Cloudflare-protected feeds.
- Enough Asian newsrooms post on Bluesky to make the section worthwhile. This needs curation research; YouTube is likely richer.

---

## 14. Coverage gaps (shown on `/about/sources`)

- **South Korea is thin:** 9 GKG documents in the sample 15-minute slot, and Korea Times is excluded.
- **Milestone 1 domain review (2026-10-13) made South Korea worse.** Every Korean outlet reviewed denies display: Korea Herald, JoongAng Daily, Yonhap, plus Korea Times. Allowed so far:
  - Japan: Mainichi, Asahi;
  - China: Sixth Tone, Caixin;
  - India: Scroll.

  Details in `docs/domain-review.md`.
- **China:** English-language coverage from inside China is mostly state media; SCMP is excluded; the GV China feed is sparse; Chinese-language sources are excluded because translation isn't allowed.
- **India:** plenty of volume, but The Hindu is excluded, so coverage depends on reviewing other domains.
- **Japan:** depends on Japan Times passing the check plus the GDELT allowlist.
- **City level:** most items are country-level only. Smaller cities will rarely show up.
- **Global Voices** publishes only a few posts per country per month.
- Non-English and translated media are excluded. Countries beyond the four are not started.

---

## 15. Implementation milestones (in order, no estimates)

1. **Compliance groundwork:**
   - repo (public), `docs/source-matrix.md`, `config/sources.yaml`, `config/domains.yaml` (all `pending`, plus the denylist)
   - review the first 10–15 domains, with evidence
   - human check of Japan Times
   - generate `cities.csv` and the city documentation
2. **Skeleton:**
   - Gradle multi-module backend, Flyway schema
   - `DisplayPolicy` and its tests
   - docker-compose Postgres for local work
   - Vite frontend shell
   - design foundation: `tokens.css`, `base.css`, UI primitives (Button, Chip, Sticker, Kbd, Skeleton), theme toggle, the `/dev/gallery` page, and the token contrast test
   - CI workflow
3. **Ingestion v1:**
   - GDELT GKG and Global Voices connectors
   - run and status tracking, cursors, retries, circuit breaker
   - CLI runner
   - hourly Actions cron writing to Neon
4. **Read API and homepage:**
   - AppShell: top bar, sidebar, bottom nav
   - hero, StoryCard, chips
   - FreshnessIndicator
   - stale, empty and cold-start states
   - deploy to Render Free and Cloudflare Pages
   - **first live demo**
5. **Search:** FTS, filters, pagination, URL state, shareable links.
6. **Map:**
   - Leaflet city markers, role toggles, confidence display
   - country-only box, city side panel
   - population layer, attributions
7. **Sectors:** rules file, classifier, explanation UI, evaluation numbers in the README.
8. **Social:**
   - curated Bluesky and YouTube accounts
   - embeds, revalidation and deletion jobs
   - corroboration links, `/social`
9. **Hardening:**
   - CSP and security headers, rate limiting
   - accessibility, Playwright E2E
   - the screenshot checklist from section 17.6
   - `/status` DB-size warning
   - README case study and LinkedIn write-up
10. **Later list:** see section 3.

---

## 16. Verification of this plan once built

- `./gradlew test` covers the unit, WireMock and Testcontainers tests. `npm test` and `npx playwright test` cover the frontend.
- Run the ingest CLI locally against docker Postgres and check `/api/v1/status`.
- Trigger the Actions workflow manually and confirm a new `ingestion_run` row in Neon.
- Open the Pages URL:
  - check the cold-start message
  - check that a shared search URL gives the same results
  - check that a map city click opens the panel
  - check the attributions
- Delete a test Bluesky post from your own account and confirm it disappears after the next run.

## 17. Design system and UI (Linear × Gumroad style language)

The calm, dark, precise product surface comes from Linear. Gumroad's loud pink and chunky playfulness are used sparingly as accents. The tone is serious about news but has personality. Never a portal look.

**Borrow style language only:**
- No Linear or Gumroad logos, illustrations, copy, icons or fonts. Gumroad's display face is commercial, so Inter is used instead.
- The logo is our own wordmark plus an SVG mark.

### 17.1 Principles

1. **Pink is rationed.** Exactly five roles:
   - primary buttons
   - active filters and chips
   - map pins and clusters
   - "New" badges
   - search focus ring

   The only other pink is the one flat SVG graphic in the homepage hero, which the brief allows. Pink appears nowhere else.
2. **Provenance and freshness are always visible.** They're never decoration.
3. **Max 3 text sizes per view.**
   - Home: display + body + small.
   - Other pages: h1 + body + small.
   - Monospace uses the small size.
4. **No WebGL and no image assets.** All graphics are inline SVG or CSS. No news images (licensing rules).
5. **Fast and private:**
   - Inter is self-hosted.
   - Embeds load only on click.
   - EastWire sets no cookies.
   - No popups, interstitials or trackers.

### 17.2 Design tokens (`frontend/src/styles/tokens.css`)

```css
:root,
[data-theme="dark"] {
  color-scheme: dark;
  /* surfaces */
  --bg: #08090a;
  --bg-elev-1: #111214;
  --bg-elev-2: #17181b;
  --bg-hover: #1d1e22;
  --bg-social: #0e0f11;
  --border: rgba(255, 255, 255, 0.08);
  --border-strong: rgba(255, 255, 255, 0.16);
  /* text */
  --text: #f7f8f8;          /* 18.8:1 on --bg */
  --text-muted: #8a8f98;    /* 6.1:1 on --bg, 5.5:1 on --bg-elev-2 */
  --text-disabled: #62666d; /* disabled/decorative only (3.4:1) */
  --text-on-accent: #000000;/* 10.4:1 on --accent */
  /* accents */
  --accent: #ff90e8;        /* fills: primary button, active chip, pins, New badge */
  --accent-hover: #ffa6ee;
  --accent-press: #f07adb;
  --accent-text: #ff90e8;   /* pink as text/ring on dark (9.9:1) */
  --accent-glow: rgba(255, 144, 232, 0.22);
  --accent-2: #ffe27a;      /* soft yellow: stale/attention markers only */
  --danger: #ff5c5c;
  --ok: #3dd68c;
  /* sectors: dots and chips only, always paired with a text label */
  --sector-economy: #2fb7c4;
  --sector-geopolitics: #f2994a;
  --sector-technology: #5b8def;
  --sector-business: #a78bfa;
  --sector-society: #ff6b6b;
  --sector-environment: #3dd68c;
  /* elevation: borders first, shadows only for hover and popovers */
  --shadow-hover: 0 8px 24px rgba(0, 0, 0, 0.45);
  --shadow-pop: 0 16px 48px rgba(0, 0, 0, 0.55);
  --shadow-chunky: 2px 2px 0 0 #000;
  --ring: 0 0 0 2px var(--bg), 0 0 0 4px var(--accent-text);
}

[data-theme="light"] {
  color-scheme: light;
  --bg: #fbfbfc;
  --bg-elev-1: #ffffff;
  --bg-elev-2: #f4f5f7;
  --bg-hover: #eeeff2;
  --bg-social: #f6f6f8;
  --border: rgba(0, 0, 0, 0.08);
  --border-strong: rgba(0, 0, 0, 0.16);
  --text: #0b0b0d;
  --text-muted: #5c6068;    /* 6.1:1 */
  --text-disabled: #9a9ea6;
  --accent-text: #b5179e;   /* pink fails as text on white (2.0:1); use this (5.9:1) */
  --accent-glow: rgba(181, 23, 158, 0.18);
  --accent-2: #ffe27a;      /* as fill with black text only */
  --danger: #c62828;
  --ok: #1e8a55;
  --sector-economy: #0e7c86;
  --sector-geopolitics: #b3541e;
  --sector-technology: #2f5fd0;
  --sector-business: #6d4acf;
  --sector-society: #c7363b;
  --sector-environment: #1e8a55;
  --shadow-hover: 0 6px 20px rgba(0, 0, 0, 0.08);
  --shadow-pop: 0 12px 40px rgba(0, 0, 0, 0.14);
  /* --accent, --accent-hover, --accent-press, --text-on-accent, --shadow-chunky unchanged */
}

:root {
  /* type */
  --font-sans: "Inter Variable", Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-mono: ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace;
  --text-display: clamp(2.5rem, 1.5rem + 4.6vw, 5.5rem); /* home hero only */
  --lh-display: 1.0;  --track-display: -0.045em; --weight-display: 800;
  --text-h1: clamp(2rem, 1.4rem + 2.6vw, 3.5rem);
  --lh-h1: 1.05;      --track-h1: -0.03em;       --weight-h1: 700;
  --text-body: 0.9375rem;  /* 15px; 1rem at >=768px */
  --lh-body: 1.6;
  --text-small: 0.8125rem; /* 13px: secondary text, mono metadata, chips */
  --lh-small: 1.45;
  /* spacing: 4px base */
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-5: 20px;
  --space-6: 24px; --space-8: 32px; --space-10: 40px; --space-12: 48px; --space-16: 64px; --space-20: 80px;
  /* radius */
  --radius-sm: 6px; --radius-md: 8px; --radius-lg: 12px; --radius-xl: 16px; --radius-pill: 999px;
  /* motion */
  --dur-fast: 150ms; --dur-base: 200ms; --dur-pin: 320ms; --dur-pulse: 2000ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  /* layout */
  --topbar-h: 56px; --bottomnav-h: 64px; --sidebar-w: 240px;
  --content-max: 1200px; --feed-max: 720px; --rail-w: 320px; --measure: 68ch;
  --z-map: 0; --z-sticky: 1100; --z-dialog: 1200; /* above Leaflet's internal z-indexes */
}

@media (min-width: 768px) { :root { --text-body: 1rem; } }

@media (prefers-reduced-motion: reduce) {
  :root { --dur-fast: 0.01ms; --dur-base: 0.01ms; --dur-pin: 0.01ms; }
  /* pulse, pin-drop, hover-lift and skeleton shimmer are disabled via the same query */
}
```

**Breakpoints** (as media queries, since CSS variables can't be used there):
- 390 baseline
- `768` (tablet, top-bar nav)
- `1024` (sidebar)
- `1280` (right rail)

**Theme switching:**
- Dark is the default.
- An inline script in `index.html` sets `data-theme` before first paint, reading the saved choice from `localStorage` (wrapped in try/catch).

### 17.3 Components and states

All interactive parts get:
- a `:focus-visible` style using `var(--ring)`;
- touch targets of at least 44px on mobile;
- a disabled state at opacity 0.4 with `cursor: not-allowed`.

#### TopBar (fixed, 56 px, 1px bottom border)

- **Content:** our wordmark (left), freshness indicator, theme toggle.
- **Nav (Map, Latest, Sectors, Search):**
  - 768–1023 px: centered in the top bar.
  - ≥1024 px: moves to the sidebar, so it isn't shown twice.
  - <768 px: moves to the bottom nav.
- **Search trigger:** shown at ≥768 px, with a `/` key hint.
- **States:**
  - default: `--bg` at 85% opacity with `backdrop-filter: blur(12px)`, solid fallback;
  - scrolled: `--border-strong`.

#### BottomNav (<768 px)

- Four items: Home, Map, Search, Sectors. Icon plus a small label.
- Active item: white label, 2px pink top indicator, `aria-current="page"`.
- Hover and pressed states; padding for the safe area.

#### Sidebar (≥1024 px, 240 px)

- **Groups:**
  - Map `M` and Latest `L`;
  - Countries: flag sticker plus mono count for the last 24 h;
  - Sectors: dot plus label;
  - Saved searches: stored in `localStorage`, labeled "on this device", no accounts;
  - footer links to Sources and Status.
- **Item states:**
  - default: muted;
  - hover: `--bg-hover`;
  - active: `--bg-elev-2` with white text and a 2px pink left bar;
  - focus-visible;
  - groups can collapse.
- `<kbd>` hints are right-aligned.

#### SearchBar

- **Hero variant:**
  - Size: 64px tall, `--radius-xl`, `--bg-elev-1`, `--border-strong`, with a search icon.
  - Placeholder: our own copy, e.g. "Search news from China, India, Korea, Japan…".
  - Button: chunky pink "Search", 48px, black bold text.
  - `/` hint shows while the field is empty and unfocused.
- **Compact variant:** 40px.
- **States:**
  - hover: brighter border;
  - focus: `--ring` plus `0 0 0 6px var(--accent-glow)`;
  - filled: shows a clear `×`;
  - loading: `aria-busy`, spinner inside the button, button width stays fixed;
  - error: helper text below.
- **Markup:** `<form role="search">` with a visually hidden `<label>`. Submitting goes to `/search?q=`.
- **Mobile:** the button shrinks to a 48px pink square icon.

#### Chips

- **SectorChip:** pill with a colored dot and a label.
  - default: `--bg-elev-1` with border;
  - hover: `--border-strong`;
  - selected: pink fill, black text, dot gets a 1px black ring, `aria-pressed="true"`;
  - zero count: muted but still selectable.
- **CountryChip:** same pattern, with a flag sticker.
- **Chip rows:**
  - mobile: one row that scrolls horizontally, with edge fade masks;
  - desktop: wraps.
  - A "Clear filters" ghost button.

#### StoryCard

- **Panel:** `--bg-elev-1`, 1px `--border`, `--radius-lg`, `--space-4` to `--space-5` padding.
- **Meta row** (mono, small):
  - `JP · Osaka` country tag;
  - sector dots with labels;
  - `<time datetime>` showing "12 min ago", with the absolute UTC time as a tooltip;
  - a pink **New** sticker if discovered less than 60 min ago.
- **Headline:**
  - body size, weight 600, clamped to 2 lines;
  - this is the only link to the original, with an `↗` icon;
  - `target="_blank" rel="noopener noreferrer"` plus visually hidden "(opens in new tab)".
- **Summary:**
  - muted, clamped to 2 lines;
  - rendered only if `DisplayPolicy` allows. When it's absent the card is just shorter, with no placeholder.
- **Footer:**
  - source name in mono, plus credit;
  - `via GDELT` badge;
  - `Also reported by 3` disclosure button that expands the cluster;
  - location chips: `Mentions` / `Dateline` / `Publisher`. Low-confidence chips have a dashed border and a "?" popover.
- **States:**
  - hover: `translateY(-1px)`, `--border-strong`, `--shadow-hover`;
  - focus-within ring;
  - skeleton with identical line-clamp heights;
  - compact variant for map popups and panels.
- No images.

#### SocialCard

- **Panel:** `--bg-social`, **dashed** 1px border.
- **Fixed top label** (mono, uppercase): `SOCIAL POST · NOT VERIFIED REPORTING`.
- Platform is shown as a text name ("Bluesky", "YouTube"), not a logo.
- **Click-to-load facade:**
  - YouTube: title, channel, API thumbnail, and "Load video (YouTube may set cookies)";
  - Bluesky: plain-text blockquote, then "Load post", which brings in the official script.
- **States:** unloaded, loading, loaded, removed ("No longer available").
- **Corroboration chip:** "Related reporting: 2" or "No matching report yet".

#### MapPin, Cluster and Popup

- **Pin:**
  - SVG `divIcon` teardrop, pink fill, 1.5px black stroke, white center;
  - sizes S/M/L for 1–4, 5–19 and 20+ items;
  - selected: scale 1.15 plus a white ring;
  - low-confidence-only city: dashed stroke.
  - Markers use `keyboard: true` and `alt` text such as "Osaka, 12 items".
- **Cluster:** pink circle, black bold count, `--accent-glow` halo.
- **Drop animation:** `translateY(-12px)` plus fade over `--dur-pin` with `--ease-out`. Staggered 20 ms, at most 12 pins. Off under reduced motion.
- **Popup:**
  - panel: `--bg-elev-2`, border, `--radius-lg`, max 300 px wide;
  - content: city name, mono role counts ("12 mentioned · 2 dateline · 0 publisher"), top 3 compact headlines, pink "Open city →" text link;
  - close button: 32 px.

#### FreshnessIndicator

- **Look:** pill with a dot and mono text. Clicking it goes to `/status`. The relative time updates every 60 s.
- **States:**

  | State | Dot | Text |
  |---|---|---|
  | Fresh (<2 h) | Pink, pulsing (2 s opacity/scale; static under reduced motion) | "Updated 12 min ago" |
  | Stale (2–24 h) | Yellow, static | "Stale · updated 3 h ago" |
  | Outage (>24 h) | Red | "Sources offline · last update 12 Oct" |
  | Loading | Gray | "Checking…" |

- `aria-live="polite"` fires only when the state changes, not on every tick.

#### Feedback states

- **EmptyState:**
  - muted flat-pin graphic;
  - honest message: "Nothing from our sources for Daegu in the last 24 h. This reflects our limited source list, not an absence of news.";
  - actions: "Widen to 7 days" and "All South Korea".
- **StaleBanner:**
  - strip under the top bar with a yellow left bar, text, and a link to `/status`;
  - can be dismissed for the session.
- **ErrorState:**
  - "Couldn't load stories" with a Retry button;
  - keeps cached data visible if there is any.
- **ColdStart:**
  - "Waking the free-tier server… up to a minute", shown over skeletons;
  - retries automatically with backoff for up to 90 s.
- **Skeleton:**
  - `--bg-elev-1` blocks with an opacity pulse;
  - static under reduced motion.

#### Buttons

- **Primary:**
  - chunky pink pill, black weight-700 text, 48 or 40 px tall;
  - hover `--accent-hover`;
  - press `translateY(1px) scale(0.98)` over 100 ms;
  - loading state keeps the button width.
- **Secondary:** `--bg-elev-2` with a border.
- **Ghost:** muted text that turns white on hover.
- **Icon button:** 40 px.

#### Stickers and badges

- **"New":**
  - pink fill, black mono uppercase small text;
  - 1.5px black border, `--radius-sm`, `rotate(-3deg)`, `--shadow-chunky`.
- **Country sticker:**
  - our own simplified inline SVG flag (CN, IN, KR, JP) plus an ISO code;
  - slight rotation only in the sidebar and hero, flat inside cards.
- Emoji flags aren't used because Windows doesn't render them.

#### Small utilities

- `Kbd`: mono, bordered, `--radius-sm`.
- `ThemeToggle`: sun/moon icon button with `aria-label`.
- `Popover`: opens on click or focus, never hover-only. Used for the "why this sector" and confidence explanations.
- `Pagination`: real `<a href>` links so pages can be shared. Mobile shows Previous/Next only.
- `ShortcutsDialog`: native `<dialog>` opened with `?`. It lists the shortcuts and has a **toggle to turn off single-key shortcuts** (WCAG 2.1.4).

### 17.4 Page layouts

#### Home `/`

**Mobile (390):**
1. **Top bar:** wordmark plus compact freshness dot.
2. **Hero:**
   - Display headline, left-aligned, 3 lines, our own copy: "Asian news, / on the map, / with sources shown."
   - Flat pink pin-and-compass SVG, rotated about 8°, top-right, 72 px, `aria-hidden`.
3. **Map:**
   - Fixed `min(52vh, 420px)` height so the page doesn't jump while it loads.
   - Dragging is turned off on mobile so the page can still scroll, but tapping a pin works.
   - Floating "Open full map" secondary button.
4. **Hero SearchBar.**
5. **Sector chip row.**
6. **Latest:**
   - mono label "LATEST · 128 stories · 24 h";
   - single column of StoryCards;
   - a "Social posts & videos" strip of horizontally scrolling SocialCards after the 10th card;
   - a "Load more" button, not infinite scroll, so the footer stays reachable.
7. **Footer, then the fixed bottom nav.**

**Desktop (1280):**
- Sidebar.
- Hero row: headline in about 60% of the width, SVG graphic on the right at 160 px.
- Map across the full main width, 440 px tall.
- SearchBar (max 720 px) directly below the map.
- Chips.
- Two columns:
  - feed, 720 px;
  - right rail, 320 px: social section, per-country "Coverage today" counts in mono, and a mini source-health list.

#### Search `/search?…`

**Mobile:**
- Sticky compact search bar.
- "Filters" button opens a bottom-sheet `<dialog>` with country, city, sector and date range. It's opened by the user, so it doesn't count as a popup.
- Active filters shown as removable chips.
- Mono result count.
- Cards, then Previous/Next.

**Desktop:**
- Sidebar.
- H1 `Results for "chip exports"`.
- Inline filter bar with selects and chips.
- Segmented control `News | Social`. The two are never mixed.
- Results, then numbered pagination.

#### Map `/map` and city `/map/city/:geonameId`

**Desktop:**
- Full-bleed map inside the main area.
- **Floating filter panel, top-left:**
  - country select;
  - sector chips;
  - 24 h / 7 d toggle;
  - role checkboxes (mentioned, dateline, publisher);
  - population layer toggle. Population is drawn as gray outline circles, never pink, with its own legend: "Population (GeoNames, year varies), not news volume".
- **Legend, bottom-left:**
  - pin sizes;
  - dashed outline = low confidence;
  - "Country-level only: 42 (not mapped)".
- **City panel, right side (380 px)**, shown when a city is selected:
  - H1 city name;
  - mono coordinates "34.69°N 135.50°E";
  - "Last item seen 2 h ago";
  - tabs by role;
  - compact cards.
- The URL updates with the selection.
- A **"View as list"** toggle shows an accessible table of cities.

**Mobile:**
- The map fills the space between the top bar and bottom nav.
- Filter chip bar at the top.
- Selecting a city opens a bottom sheet that snaps to 40% or 90% height.
- The legend sits behind an "i" button.

#### Sector `/sector/:slug`

- **Header:** large sector dot, H1 "Technology", one-line definition.
- **"How we tag this" disclosure:** the actual keywords, GKG themes and feed categories from `sectors.yaml`.
- Country chips, then the feed.
- **Desktop right rail:** "Top places this week", city counts in mono.
- **Mobile:** single column.

#### About `/about` (with `/about/sources` and `/status`)

- Reading layout, `--measure` wide.
- H1 "How EastWire works".
- **Sections:**
  - what we show and don't show;
  - source matrix: a table on desktop; stacked definition lists on mobile; mono status pills: Verified green / Conditional yellow / Excluded gray;
  - coverage gaps;
  - geography roles legend;
  - sector rules;
  - city list, with a CSV download;
  - attributions;
  - privacy: no cookies, click-to-load embeds;
  - takedown contact.
- **Desktop:** sticky table of contents in the right rail.

#### `/social` and `/status`

- Same shell and components: SocialCard grid; a status table with FreshnessIndicator states.

### 17.5 Implementation guidance (React + TypeScript + CSS Modules)

**Folder structure:**

```
frontend/src/
  styles/        tokens.css · base.css (reset, type, focus, skip link) · utilities.css (visually-hidden, clamp)
  components/ui/      Button Chip Sticker Badge Kbd IconButton Skeleton Dialog Popover Pagination
  components/layout/  AppShell TopBar Sidebar BottomNav Footer
  components/news/    StoryCard StoryList SocialCard ClusterDisclosure LocationChip SectorDot
  components/map/     NewsMap (lazy) pinIcon clusterIcon CityPopup MapLegend CityListView
  components/status/  FreshnessIndicator StaleBanner EmptyState ErrorState ColdStart
  components/graphics/HeroMark.tsx  Flag{CN,IN,KR,JP}.tsx   (hand-authored inline SVG)
  hooks/         useHotkeys useTheme useReducedMotion useSavedSearches useRelativeTime
  pages/         Home Search MapPage SectorPage About Social Status
  dev/           ComponentGallery  (route /dev/gallery, dev builds only)
```

**Styling:**
- CSS Modules plus global tokens. `clsx` for class names. No Tailwind.
- State lives on `data-*` attributes or ARIA attributes (`[aria-pressed="true"]`, `[aria-current="page"]`), so styling and accessibility stay in sync.

**Fonts:**
- `@fontsource-variable/inter`, latin subset only, self-hosted, latin woff2 preloaded.
- A fallback `@font-face` built on local Arial with `size-adjust`/`ascent-override` stops layout shift when Inter loads.
- `font-variant-numeric: tabular-nums` on times and counts.

**Icons:** `lucide-react`, named imports, 16 and 20 px, stroke 1.75. No brand logos.

**Map:**
- `react-leaflet` plus `leaflet.markercluster` with a custom `iconCreateFunction`.
- The map chunk is lazy-loaded with `React.lazy`, triggered when it scrolls into view (IntersectionObserver).
- The container uses `isolation: isolate` so Leaflet's z-indexes stay under the top bar.
- When reduced motion is on, set `zoomAnimation`, `fadeAnimation` and `markerZoomAnimation` to false.
- Restyle the attribution control (mono, small, still AA-legible) but keep it visible.
- **Dark tiles:**
  - Preferred: CARTO `dark_all`. It needs a free key, and the CARTO terms must be read first (matrix row 21).
  - Fallback: OSM standard tiles with a dark filter on `.leaflet-tile-pane` in dark theme only: `filter: invert(1) hue-rotate(180deg) brightness(.9) contrast(.9) saturate(.3)`.
  - Light theme uses unfiltered tiles.

**Keyboard shortcuts:**
- `useHotkeys` ignores key presses inside inputs, textareas and contenteditable fields, and any press with modifier keys.
- Shortcuts:
  - `/` focuses search (and calls `preventDefault`);
  - `?` opens the shortcuts dialog;
  - `m` and `l` navigate.
- All of these can be turned off in the dialog.

**Accessibility:**
- Landmarks:
  - `header`;
  - `nav aria-label="Primary"`;
  - `main`;
  - `aside aria-label="Social posts, not verified reporting"`;
  - `footer`.
- "Skip to stories" link.
- One H1 per page.
- Color never carries meaning alone: sector dots always have labels, and pins have counts in their alt text.
- Map alternative: the city list view.
- WCAG AA contrast ratios are computed in a test (17.6).

**Motion:**
- 150–200 ms fades and hover transitions only.
- Filter changes cross-fade the list (opacity only) and keep its container height until new data arrives.
- Pin drop as described above.
- Everything is disabled under `prefers-reduced-motion`.

**No layout shift:**
- Fixed map height.
- Skeletons with the same heights as the real cards.
- Chip row height reserved.
- No images.
- Font metrics overridden on the fallback font.

**Performance budget:**
- First-load JS ≤150 KB gzipped, not counting the map chunk.
- CLS < 0.05.
- LCP < 2.5 s on simulated 4G for the static shell, not counting API cold start.
- No third-party requests before the user does something, except tiles and the API.

**Privacy:**
- EastWire sets no cookies.
- `localStorage` holds only the theme, the shortcut toggle and saved searches.
- So no consent banner is needed. This is an assumption, not legal advice.
- Embed facades say which third party they load before loading it.

### 17.6 Visual verification (Playwright screenshots at 390 × 844 and 1280 × 800, dark and light)

1. No horizontal scroll: `scrollWidth ≤ innerWidth`.
2. **At 390:** bottom nav shows 4 items and respects the safe area; no sidebar.
3. **At 1280:** sidebar shown; no bottom nav; nav is not repeated in the top bar.
4. Home hero headline is left-aligned, at most 3 lines at both widths. The SVG graphic doesn't cover the text.
5. Map height is the same before and after tiles load. Pins and clusters are pink. Attribution is visible.
6. The search bar is the most obvious control. A focused screenshot shows the pink ring. The `/` hint is visible on desktop.
7. **Pink audit:** pink appears only in the 5 allowed roles, plus the homepage hero graphic. Text sizes per view ≤ 3.
8. **Cards:**
   - 12 px radius, 1 px border, mono timestamp, sector dot with label, source, `↗`;
   - no images;
   - a headline-only source shows no summary.
9. The social section is visually distinct and labeled "not verified reporting".
10. With mocked API states, the freshness indicator (fresh, stale, outage) and the empty, error and cold-start states render correctly.
11. In light theme, pink is used only as a fill with black text, and links use `--accent-text`.
12. With reduced motion on, layout is identical and the computed `transition-duration` is ≈0.
13. **Automated checks:**
    - axe finds 0 serious or critical issues;
    - Tab order: skip link → top bar → sidebar → search → chips → cards;
    - measured CLS < 0.05;
    - a Vitest test parses `tokens.css` and checks the contrast ratio of every text/background pair.

## Status and next concrete step

**Milestone 1 (compliance groundwork):** on `main`.

**Milestone 2 (skeleton):** PR #1, CI green (including the Postgres integration tests).

**Milestone 3 (ingestion v1):** built on branch `m3-ingestion`, stacked on milestone 2.
- **Connectors:**
  - GDELT GKG raw files: cursor over 15-minute slots, a newest-slot 404 waits for the next run, gaps recorded.
  - Global Voices RSS: conditional GET, country from GV's own tags, partner-reprint detection, illegal XML bytes stripped, stops after 2 network failures in a row.
- **Pipeline:** ArticleWriter (policy → URL dedupe → takedowns → excerpt → insert → locations → pg_trgm story clustering), RetentionPurger.
- **Run machinery:** HttpFetcher (backoff with jitter, Retry-After), RunRecorder (`ingestion_run` + `source_status`), circuit breaker (3 failures → 3 h), advisory lock, exit code 1 only when every connector fails.
- **Shared code in `core`:** UrlCanonicalizer, Gazetteer (some names need their country nearby), DatelineDetector; V3 migration.
- **Accuracy fixes found by running against live data:**
  - the credit line names the license and "excerpt" only when they apply;
  - partner reprints claim no CC BY;
  - national capitals get LOW confidence.
- **Tests:** core 88, ingest 56 (+11 Postgres integration tests that run in CI), api 6.
- **End-to-end checks against the real GDELT and Global Voices, writing into PGlite:**
  - the packaged jar runs in 27 s;
  - a second run is mostly 304s;
  - a failing connector is isolated;
  - all failing gives exit 1;
  - the circuit opens after 3 failures.
- **Measured volume:** 25,799 GDELT rows over 6 h gave 2 allowed articles. Global Voices gave 18 articles within the 90-day window.
- **Hourly workflow:** `.github/workflows/ingest.yml`, off until `INGEST_ENABLED=true`.

**Milestone 3, second domain batch:** domains were chosen by GKG volume. Business Standard is now allowed (6 allowed in total); Times of India, ANI, Moneycontrol and others are denied. The same 6-hour window now gives 78 GDELT items instead of 2.

**Milestone 4 (read API + homepage):** built on branch `m4-read-api`, stacked on milestone 3.
- **API:**
  - Endpoints: `/articles` (country/city/date filters, pagination, `DisplayPolicy` re-checked on every read), `/status` (oldest last success, fresh/stale/outage/unknown), `/countries` (24 h counts) and `/places`.
  - The database answers 503 with a friendly message when unreachable.
- **Frontend:**
  - AppShell: top bar, sidebar with country counts, bottom nav.
  - Home: hero, country chips with flags, city picker, StoryCard feed with Load more.
  - FreshnessIndicator, stale/empty/error/cold-start states.
  - Pages: /status, /about (sources, gaps, places, credits), honest "coming in milestone N" pages.
- **Deployment:** API Dockerfile with a CI build and smoke test, `render.yaml`, Pages `_redirects`/`_headers`, `docs/deploy.md`.
- **Verified locally against real ingested data:** live API, browser at 390 and 1280 px, no console errors, 1 `main`/1 `h1`.
- **Tests:** api 28 (+4 Postgres in CI), frontend 67.

**CI fix (PR #2):** the Testcontainers database is now a Spring bean. Per-class `@Container` fields were stopped while Spring reused a cached context pointing at them, so every later test class failed. PRs #2 and #3 are green, including the API Docker image smoke test.

**Milestone 5 (search):** built on branch `m5-search`, stacked on milestone 4.
- **API:** `/api/v1/search` uses Postgres `websearch_to_tsquery` (phrases, `-exclusions`, `OR`) with `ts_rank_cd` relevance or date order, and the same filters and read-time policy as the feed. `QueryValidator` is shared by feed and search.
- **Frontend:**
  - Hero search bar on Home; `/search` page with country, city, from/to and order filters, all in the URL.
  - Real-link pagination, a syntax hint with examples, honest empty results.
  - `/` focuses search and `?` opens a shortcuts dialog where single-key shortcuts can be turned off (WCAG 2.1.4).
- **Verified:** real-data queries (`semiconductor`, `rupee OR inflation`, `"South Korea"`, `Tata -steel`); browser at 1280 and 390 px; api 35 tests (+5 Postgres in CI), frontend 75.

**Milestone 6 (map):** built on branch `m6-map`, stacked on milestone 5.
- **API:** `GET /api/v1/map/cities?window=24h|7d|30d&roles=&country=` returns one pin per city with counts by role, the newest item time and a low-confidence-only flag, plus country-only totals. It aggregates in Java after the same read-time `DisplayPolicy` check as the feed, so the map never counts a story the list would hide.
- **Frontend:**
  - Leaflet loads lazily in its own chunk; OSM tiles get a CSS dark filter in dark theme (CARTO still pending its terms check).
  - Pink teardrop pins sized 1–4 / 5–19 / 20+, dashed when every placement is low confidence, clustered with counts; popups with role counts and an "Open city" link.
  - `/map` keeps country, window, roles, population layer and view in the URL; `/map/city/:geonamesId` opens a city panel with coordinates, role counts, last item seen, population and stories. On phones the page scrolls to the panel.
  - A table view lists every pinned city for keyboard and screen-reader use.
  - The legend states that country-only stories are not mapped, and the optional population layer (gray circles, never pink) says "Population (GeoNames, year varies), not news volume".
  - The home hero shows the map with dragging off on touch screens and an "Open full map" button.
- **Verified:** live data in the browser at 1280 and 390 px (15 pinned cities; country-only CN 4, IN 35, JP 2, KR 1), no console errors, no horizontal scroll.
- **Not done yet:** the bottom-sheet city panel on phones (the panel sits under the map instead), and a role-tabbed panel. Main JS is 126 KB gzipped; the map chunk adds 54 KB on demand.
- **Known data quirk:** GeoNames lists Delhi and New Delhi as separate cities, so a story can be pinned to either.

**Milestone 7 (sectors):** built on branch `m7-sectors`, stacked on milestone 6.
- **Rules:** `config/sectors.yaml` holds weighted keywords, negative phrases, Global Voices topic tags and GDELT theme codes for the six sectors.
  - Threshold 3, at most 2 sectors per story; excerpt keywords count half; GDELT themes add at most +2 together, so they can never tag alone.
  - Checked by `scripts/validate_config.py` and by `SectorRules` in Java (exact six sectors, no typos, no duplicates, positive weights, no stems shorter than four letters).
- **Classifier:** `core/sector/SectorClassifier`, deterministic, returns every matched rule.
- **Ingestion:**
  - GDELT V1THEMES and Global Voices tags are stored as `article.sector_signals` (V4 migration).
  - Tags are written with their matched rules.
  - Each run re-tags live articles whose `sector_rules_version` (a hash of sectors.yaml) is out of date.
- **API:**
  - `sector=` filter on `/articles`, `/search` and `/map/cities`.
  - Every story carries its sector tags with label, score and rules.
  - `GET /api/v1/sectors` returns the rules plus 7-day counts.
- **Frontend:**
  - Sector chips on Home and sector selects on Search and Map, all in the URL.
  - A "why this sector" disclosure on every story card, including a note when the GDELT theme cap applied.
  - `/sectors` overview with an honest accuracy note; `/sector/:slug` with feed, country chips, top places this week and a "How we tag" panel listing every rule.
  - Sidebar sector list.
- **Evaluation** (`SectorEvaluationTest`, docs/sectors.md):

  | Set | Precision | Recall | Note |
  |---|---|---|---|
  | Development, 216 invented | 98% | 88% | tuned on |
  | Holdout, 60 invented | 100% | 33% | never tuned on |
  | 66 real items, before tuning | 76% | 69% | |
  | Same 66, after tuning | 85% | 81% | seen data |

  The holdout result was the important finding: tags are rarely wrong but often missing. The UI says so.
- **Verified:**
  - Against fresh real data in PGlite: 63 GDELT and 18 Global Voices items tagged on write; an earlier database's 96 articles were re-tagged after the migration.
  - Browser at 1280 and 390 px.
  - Tests: core 101 (+1 opt-in real-sample check), ingest 58 (13 of them Postgres, run in CI), api 44 (7 Postgres, in CI), frontend 93.

**Owner actions to go live:**
1. Create the Neon project.
2. Run `backend/db/local-init.sql` with strong passwords.
3. `gh secret set` the three `EASTWIRE_DB_*` secrets, then `gh variable set INGEST_ENABLED --body true`.

All in `docs/database.md`.

**Next:**
1. The owner deploys (docs/deploy.md).
2. Milestone 8: social (curated Bluesky and YouTube).
