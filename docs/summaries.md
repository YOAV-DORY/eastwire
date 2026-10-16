# Story summaries

Cards can carry a one-line summary written by EastWire. It is **automated** and labelled so on
the story sheet and the About page. Most cards have none, on purpose: a summary is written only
where it can be done reliably and within the publisher's terms.

## Where a summary can come from

EastWire never fetches or stores whole articles. A summary is written only from the short text a
feed already provides (its description), and only for sources whose terms allow derived text:

| Source | Why it is allowed | `summaries` in sources.yaml |
|---|---|---|
| Global Voices | CC BY 3.0 allows adaptations with credit (partner reprints excluded) | true |
| Sixth Tone | Its terms allow citing articles with credit by name | true |
| The Mainichi | Its copyright page restricts use only for commercial purposes; EastWire is non-commercial | true |
| China Digital Times | Allowed, but its feed carries no description | false |
| Dialogue Earth | CC BY-NC-ND: no derivatives, so no summaries | false |
| Every other feed and all GDELT items | Headline-only terms, or no text to work from | false |

## How it is written

- **Model:** Microsoft's Phi-3-mini-4k-instruct (MIT licence), quantised (q4), served by
  [llama.cpp](https://github.com/ggml-org/llama.cpp) on the GitHub runner during the hourly ingest
  (`scripts/summary-model.sh`). Both are pinned by version and SHA-256. Nothing is sent to a
  hosted AI service and nothing costs money.
- **Prompt** (`LocalModelSummarizer`): one neutral sentence under 30 words built around facts
  the headline does not contain (a name, number, date, place, reason or consequence), only from
  the given text, paraphrased, no opinions; "NONE" when the text adds nothing. One invented
  worked example sets the tone. Columns and editorials are skipped.
- **Checks** (`SummaryCheck`, unit tested): a summary is stored only if it is 40–240 characters
  and at most two sentences; shares no run of five words with the publisher's text; uses no
  number, capitalised name, judgment ("historic", "lacks") or negation ("not", "denied") that the
  headline or text does not; and is not just the headline again. Anything else is dropped and the
  card shows the headline alone.
- **Once per story:** written when a story is stored, or on the next run for stories stored
  before summaries existed. A rejected attempt is recorded (`summary_method = 'rejected:…'`) and
  not retried.

## Measured (2026-10-16, real feed items)

- The first model tried, Qwen2.5-1.5B-Instruct, mostly restated the headline; almost nothing
  passed the checks, so it was replaced.
- With Phi-3-mini, about half of 30 real Mainichi and Global Voices items passed; the rest were
  rejected for copying, repeating the headline or adding a word the source did not use. One
  rejected example had turned "X is evidence of Y" into "not evidence of Y", which is why
  negations are checked.
- On an Apple-silicon laptop a summary takes about 2 seconds; the GitHub runner is slower (the
  "Summary model" workflow prints its timing).

Summaries are not verified reporting; the headline links to the publisher's own article.
