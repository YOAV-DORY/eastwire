-- Four different times are kept apart:
--   published_at   the publisher's own time (null when the source gives none, e.g. most GDELT items)
--   discovered_at  when the item was first listed by its source (GDELT's crawl time, or the feed)
--   ingested_at    when EastWire stored it (new in V7)
--   source checks  live in source_status.last_success_at, not on articles
ALTER TABLE article ADD COLUMN ingested_at timestamptz;
UPDATE article SET ingested_at = discovered_at;
ALTER TABLE article ALTER COLUMN ingested_at SET NOT NULL;
ALTER TABLE article ALTER COLUMN ingested_at SET DEFAULT now();

-- news: reporting on something that happened; feature: analysis, essays, explainers and citizen
-- media, which belong in a dated reading section rather than "Latest".
ALTER TABLE article ADD COLUMN story_type text NOT NULL DEFAULT 'news'
    CHECK (story_type IN ('news', 'feature'));
UPDATE article SET story_type = 'feature'
WHERE source_id IN (SELECT id FROM source WHERE slug = 'global-voices');

CREATE INDEX article_story_time_idx ON article (story_type, (COALESCE(published_at, discovered_at)) DESC);
