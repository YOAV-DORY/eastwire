# Social posts and videos

EastWire shows a small, hand-picked set of newsroom accounts in a separate section
(`/social`, plus a short strip under the home feed). Posts are never mixed into news cards
or news search. Every card says **"Social post · not verified reporting"** (or "Video · …").

## Who is listed

[`config/social_accounts.yaml`](../config/social_accounts.yaml) is the full list. Each entry
records why the account is there and when that was checked. The rules, enforced by
`SocialAccounts` (Java) and `scripts/validate_config.py`:

- **Kind**: newsroom, journalist or official account only.
- **Identity**:
  - Bluesky handles must be the outlet's own web domain (`@scroll.in`), which Bluesky verifies, so a lookalike account cannot be listed.
  - YouTube entries are the outlet's official channel.
- **Language**: English posts only. EastWire never translates.
- **Publisher terms**: the publisher's domain must not be `deny` in [`domains.yaml`](../config/domains.yaml). Publishers awaiting a manual check (Japan Times, NHK) wait too.
- **Scope**: `all` keeps every original post. `mentions` keeps only posts whose text names a covered country or city; it is used for outlets that cover the whole world.

Checked on 2026-10-14 against Bluesky's public API and the channels' YouTube pages:

| Platform | Account | Scope | Notes |
|---|---|---|---|
| Bluesky | @scroll.in | all | Domain on our allowlist |
| Bluesky | @globalvoices.org | mentions | Licensed source already |
| Bluesky | @thediplomat.com | mentions | |
| Bluesky | @chinadigitaltimes.net | mentions | |
| Bluesky | @restofworld.org | mentions | |
| YouTube | Scroll.in, Sixth Tone, Caixin Global | all | Domains on our allowlist |
| YouTube | The Diplomat | mentions | |

Considered and left out:

| Account | Why left out |
|---|---|
| @thewire.in, @indianexpress.com | We deny their sites' terms. Indian Express is also inactive. |
| @asahi.com, @nikkei.com | Posts in Japanese |
| @japantimes.co.jp | Its policy check is still open |
| NHK World | Waiting for the NHK email |
| @hongkongfp.com | Hong Kong is not a covered area yet |
| Reuters, AP, AFP | Western wire services; the point is Asian newsrooms |
| `*.bsky.social` accounts | Not domain-verified |

## What is collected and when it is removed

- **Bluesky:**
  - Each hourly run reads each account's latest 50 original posts via `getAuthorFeed` on the public AppView. No login, no search.
  - Skipped: reposts, replies, posts older than 30 days, posts with no text, and posts or authors labelled `!no-unauthenticated`, `!hide`, `!takedown`, `!warn`, `porn`, `sexual`, `nudity`, `graphic-media` or `gore`.
  - Every stored post is re-checked each run with `getPosts`. A deleted post or one labelled since then is **deleted** within the hour.
- **YouTube:**
  - Each run reads each channel's 10 latest uploads (`playlistItems`, 1 quota unit per channel) and their details (`videos`, 1 unit per 50 videos).
  - Only public, processed, embeddable, non-live videos from the last 30 days are kept.
  - Stored videos are re-checked daily; removed, private or no-longer-embeddable videos are deleted.
  - `search.list` is never used.
- **Retention:** everything is deleted 30 days after publication (YouTube Developer Policies III.E.4.c; the same rule is used for Bluesky). Takedown requests go into `suppression` and are deleted at the next run.
- **Location:** a post gets a country only if its own words name the country or a listed city. Never from the account's base, language or followers.

## How it is shown

- Before the reader presses load, the card shows the post text EastWire stored (Bluesky) or the API thumbnail and title (YouTube). **Nothing is requested from Bluesky or YouTube until then.**
- **Load post** inserts Bluesky's official embed markup and `embed.bsky.app/static/embed.js`. That embed also hides posts deleted upstream.
- **Load video** inserts the privacy-enhanced player from `youtube-nocookie.com`, unmodified. The button says YouTube may set cookies.
- **Related reporting:** a post is linked to a story EastWire already lists only when it shares that story's URL, or when the story's headline appears almost word for word in the post (`word_similarity` ≥ 0.6). The chip says "Related reporting: N" or "No matching report in our sources yet". Never "verified".

## Turning YouTube on (owner step)

1. In Google Cloud, create a project and enable **YouTube Data API v3**.
2. Create an API key and restrict it to that API.
3. Add the key as the GitHub Actions secret: `gh secret set YOUTUBE_API_KEY`.
4. In `config/sources.yaml`, set `youtube-curated` to `enabled: true` and merge.

The key is used only by the ingest job and sent as an `X-Goog-Api-Key` header, never in a URL
or log. If the source is enabled without the key, the run fails visibly on `/status`.
Expected use: about 10 units per run, roughly 250 a day, out of the free 10,000.
