# How the front page is chosen

`GET /api/v1/front` (and the same for a country, city or sector) builds every front page from
fixed rules in [`FrontRanker`](../backend/api/src/main/java/io/github/yoavdory/eastwire/api/front/FrontRanker.java).
No AI, no click data, no hand-picking. The rules only order what the sources published; they never
change a headline or invent a story. Tests: `FrontRankerTest`, `ImageMatcherTest`.

## What is eligible

- **Latest** holds *news* published in the last **48 hours**. When a source gives no publication
  time (most GDELT items), the time it was found counts instead, and the card and the "why it
  leads" line both say "found".
- **Features** (Global Voices, Nippon.com, Sixth Tone's FEATURES / Q & A / VOICES) and news older
  than 48 hours go to the dated **Reading** section, never to Latest. Reading shows up to eight
  stories from the last 30 days, one publisher at a time, newest first.
- Every story passes the display policy again first, so a story hidden by policy is never ranked.

## Score

Importance for a reader outside the region comes first; recency is one factor among several.

| Part | Points | Why |
|---|---|---|
| Coverage | +0.6 per other outlet reporting the same event, up to +1.8 | Several newsrooms picking it up is the clearest sign it matters |
| Security | +1.2 (missiles, nuclear tests, troops, warships, clashes, sanctions, espionage, cyberattacks, war) | What a reader abroad most needs to know |
| Market move | +1.0 for a record, the largest move or a crash in an index, currency or market | Moves that reach other markets |
| Economic policy | +0.8 (rates, central banks, inflation, tariffs, export controls, trade deals) | Same |
| Recency | up to 2, halving every 12 hours; −0.2 without a publication time | Today's news first |
| Sector | geopolitics 1, economy 0.8, technology 0.8, environment 0.6, society 0.5, business 0.4 | Broad significance |
| Reaches beyond one country | +0.8 when the headline names another government, an international body, trade, climate, AI, chips, nuclear or missiles; +0.4 more for the United States | Relevance to a reader outside the country |
| Several of our countries | +0.5 | Same |
| Routine market item | −1.5 (daily index wraps, "stocks to watch", results tables, dividends) | Useful, not front-page news |
| Opinion or review | −1.5 (URL sections such as /opinion/, /column/, /editorial/, /book/, /review/, /lifestyle/, /travel/, /food/, or a headline label like "Opinion:"), never lead | A column or a book review is not the day's news, however strong its topic words |
| Company news | −0.8 (training, hiring, launches, awards, donations) unless it has security, market or policy impact | Real, but rarely the day's most important story |
| About a country we do not cover | −0.5 | A dateline alone does not make it our news |
| No main-subject place | −1, never lead | It may only mention our countries in passing |

North Korea's weapons tests and threats count as **Korean Peninsula security** news, about South
Korea, and can lead.

## Lead, secondary and order

- **Lead:** the highest score among stories with a main-subject place in our countries that are
  neither routine nor about another country. The unfiltered front page does not lead with the
  same country twice in a row: the country it would have led with an hour earlier costs 1 point.
- **Two secondary stories:** the best of the rest, each losing 0.8 per earlier pick from the
  same publisher and 0.6 if it is about the lead's country, so the top three vary.
- **One story per event:** stories in the same cluster, or whose headlines share at least half
  their content words, appear once (the best-scoring one); the card counts the others.
- **Latest order:** best first, but balanced at every point from the top: no country holds more
  than 40% and no publisher more than 25% of the stories so far (rounded up), and no publisher
  appears three times in a row while others wait. When only one country or publisher is left, it
  follows. Nothing is hidden; only the order changes. The Sources page shows the raw 24-hour mix.
- **Images:** see [images.md](images.md). A story without a cleared image runs as text.

The lead shows its reasons ("Why it leads: Published 2 h ago · Technology · Reaches beyond one
country") so the choice can be checked.
