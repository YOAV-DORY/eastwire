-- Ingestion v1 (milestone 3).

-- Conditional-GET state per feed URL, so unchanged feeds cost a 304 and no parsing.
CREATE TABLE fetch_state (
    url             text PRIMARY KEY,
    etag            text,
    last_modified   text,
    last_status     integer,
    last_fetched_at timestamptz
);

-- A publisher's own filing ("Global Voices filed this under South Korea") is a distinct method.
ALTER TABLE article_location DROP CONSTRAINT article_location_method_check;
ALTER TABLE article_location ADD CONSTRAINT article_location_method_check
    CHECK (method IN ('gdelt_gkg', 'dateline', 'gazetteer', 'source_registry', 'feed_category'));

-- The same place in the same role is stored once per article.
CREATE UNIQUE INDEX article_location_unique_idx
    ON article_location (article_id, role, precision, country_iso2, coalesce(place_id, 0));

-- Connector-specific counters for /status (slots processed, gaps, items skipped by reason...).
ALTER TABLE ingestion_run ADD COLUMN details jsonb NOT NULL DEFAULT '{}';
