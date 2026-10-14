# Ingestion

The hourly job (`backend/ingest`, run by `.github/workflows/ingest.yml` at minute 17) collects
items from the enabled sources in `config/sources.yaml` and stores what the display policy
allows. It is a command-line Spring Boot app: it runs once and exits.

## One run, step by step

1. **Lock.** `pg_try_advisory_lock`, so a manual run and the cron never overlap. If the lock
   is taken, the run exits without doing anything.
2. **Config sync.** `config/` is copied into the reference tables (`country`, `place`,
   `source`, `domain_policy`). `config/` is always the source of truth.
3. **Connectors.** Each enabled source runs in turn and is isolated from the others. A source
   whose circuit is open is skipped (see below).
4. **Write.** Every candidate goes through `ArticleWriter`, in one transaction per item:
   1. Display policy. Excluded or unreviewed publishers are dropped.
   2. URL dedupe: SHA-256 of a normalized URL, so www/m/amp variants, `utm_*` and fragments count as the same article.
   3. Takedown list.
   4. Excerpt cut to the source's permitted length, at a sentence boundary.
   5. Insert.
   6. Locations.
   7. Story clustering: a headline at least 60% similar (pg_trgm) to one from the last 48 h joins its cluster. That cluster size is what "also reported by N" will show.
5. **Purge.** Articles past their source's retention window, and taken-down items, are deleted.
6. **Exit code.** Non-zero only if *every* attempted connector failed. GitHub then marks the run failed and emails the repository owner.

Every attempt is a row in `ingestion_run`, with status, counts and connector details. The
latest state per source is in `source_status`:
- last attempt and last success
- newest item time
- cursor
- consecutive failures and circuit

The site's freshness labels come from there. "Checked at" and "newest item" are reported
separately: Global Voices may be checked successfully every hour and still have nothing new
for days.

## Connectors

### GDELT GKG (`gdelt-gkg`)

- **Source:** the raw 15-minute GKG files listed in `lastupdate.txt`. The DOC and GEO APIs were rate-limited, empty or offline (docs/source-matrix.md).
- **Cursor:** the last fully processed slot (`YYYYMMDDHHMMSS`). Each run processes every slot after it.
  - At most 6 h back; older slots are reported as a gap, never backfilled.
  - The first run ever takes 1 h.
- **Newest slot:** it can return 404 for a few minutes after being announced. The run stops there and the next run retries it. An *older* missing slot is a gap and makes the run PARTIAL.
- **Kept:** rows from publisher domains marked `allow` (inside their `url_prefixes`) that mention a covered country. They become **headline links only**: no excerpt, no image.
- **Locations, all role MENTIONED, from GDELT's own geocoding:**
  - FIPS→ISO country codes.
  - Cities are pinned only within 25 km of a list city with a matching name, or within 10 km.
  - Other cities stay at country precision, with a note.
  - National capitals get LOW confidence ("Beijing said…" usually means the government).
- **Publisher location:** from the domain review, never from the article.

### Global Voices (`global-voices`)

- **Feeds:** the 4 country feeds and 4 topic feeds, each fetched with a conditional GET (`fetch_state` keeps ETag/Last-Modified), so unchanged feeds cost one 304.
- **Country:** only from Global Voices' own category tags. Topic-feed items without a covered country are skipped.
- **Cities:** found in the headline and summary by the gazetteer.
  - Word-like names such as Saga or Sejong count only next to their country's name.
  - Capitals get LOW confidence.
- **Event location:** only from a dateline such as `SEOUL —` at the start of the summary.
- **Text:**
  - The excerpt is cut to ≤300 characters from the feed summary.
  - Credit line: "By {author}, Global Voices · CC BY 3.0 · excerpt, shortened". "excerpt, shortened" is added only when an excerpt is shown.
  - **Partner reprints** are detected from the post's notice and shown as headline and link only, without a CC BY claim.
- **Robustness:**
  - Illegal XML control characters are stripped before parsing (one South Korea post contained a 0x08 byte on 2026-10-13).
  - HTML (e.g. a bot-challenge page) is refused.
  - After 2 network-level failures in a row, the remaining feeds are skipped for that run.

## Failure handling

| Situation | Behavior |
|---|---|
| 429 or 5xx response, network error | Up to 3 attempts, exponential backoff with jitter, `Retry-After` honored (≤120 s, else the run fails) |
| One feed or one GKG slot fails | Run is PARTIAL; everything else is kept |
| A connector fails | Recorded with the error, cursor and last success kept; other connectors still run |
| 3 failed runs in a row | Circuit opens for 3 h (the source is skipped, recorded as `skipped`), then retried once |
| Every attempted connector fails | Process exits 1 → GitHub marks the run failed and emails the owner |
| GitHub delays or drops a scheduled run | Cursors catch up on the next run (within the 6 h lookback) |
| Repository inactive 60 days | GitHub disables the schedule; `/status` shows the staleness honestly |

## What it produces (measured 2026-10-13)

- **GDELT:** 25,799 rows over a 6-hour window, of which **2** came from allowed publishers (both Scroll). About 8 a day. The allowlist (5 publishers) is the main limit, so reviewing the pending publishers in docs/domain-review.md is what will grow it.
- **Global Voices:**
  - 18 articles from 8 feeds within the 90-day retention window.
  - 48 topic-feed items skipped as not about a covered country.
  - Newest item 4 days old.

## Running it

- **Locally,** against the compose database: `cd backend && ./gradlew :ingest:bootRun`. See docs/database.md.
- **Production:** set the repository variable `INGEST_ENABLED=true` and the `EASTWIRE_DB_*` secrets (docs/database.md). The workflow can also be started by hand from the Actions tab (`workflow_dispatch`).
- **Settings** (`backend/ingest/src/main/resources/application.yaml`, all overridable by environment variable):

  | Setting | Default |
  |---|---|
  | `EASTWIRE_HTTP_CONNECT_TIMEOUT` | 20s |
  | `EASTWIRE_HTTP_MAX_ATTEMPTS` | 3 |
  | `EASTWIRE_GDELT_MAX_LOOKBACK` | 6h |
  | `EASTWIRE_GDELT_BOOTSTRAP` | 1h |
  | `EASTWIRE_INGEST_ADVISORY_LOCK` | true |
