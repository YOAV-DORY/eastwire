-- Main-subject places (redesign, 2026-10).
-- TRUE when the story is about this place (headline, dateline, first place in the text, or
-- its only filing country); FALSE for a passing mention. Country and city pages use only
-- TRUE rows. NULL = stored before this migration; the next ingest run fills it in from the
-- headline and stored places.
ALTER TABLE article_location ADD COLUMN is_primary boolean;

CREATE INDEX article_location_primary_idx ON article_location (country_iso2, place_id) WHERE is_primary;
