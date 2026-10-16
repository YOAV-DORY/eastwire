-- EastWire's own one-line summaries (docs/summaries.md): written automatically from the text a
-- feed already gives (its description), only for sources whose terms allow it, and checked so they
-- never copy the publisher's wording or add a name or number the source did not state. Null when
-- no reliable summary could be written; the card then shows the headline alone.
ALTER TABLE article ADD COLUMN summary text CHECK (summary IS NULL OR char_length(summary) <= 300);
-- Which model and settings wrote it, e.g. "qwen2.5-1.5b-instruct-q4_k_m", for audits.
ALTER TABLE article ADD COLUMN summary_method text;
