-- Social posts and videos (milestone 8).

-- How an account's posts are filtered: 'all' keeps every original post, 'mentions' only
-- posts whose text names a covered country or city (for outlets covering the whole world).
ALTER TABLE social_account ADD COLUMN scope text NOT NULL DEFAULT 'mentions' CHECK (scope IN ('all', 'mentions'));
ALTER TABLE social_account ADD COLUMN domain text;

-- What the card shows before the official embed loads.
ALTER TABLE social_item ADD COLUMN cid text;             -- Bluesky record version, needed by the official embed
ALTER TABLE social_item ADD COLUMN title text;           -- YouTube video title
ALTER TABLE social_item ADD COLUMN thumbnail_url text;   -- YouTube API thumbnail
-- The link a post shares, for "related reporting" (same URL as a stored article).
ALTER TABLE social_item ADD COLUMN linked_url text;
ALTER TABLE social_item ADD COLUMN linked_url_hash bytea;
-- Covered countries the text names. Never derived from the account or its language.
ALTER TABLE social_item ADD COLUMN countries text[] NOT NULL DEFAULT '{}';

CREATE INDEX social_item_account_idx ON social_item (account_id);
CREATE INDEX social_item_linked_idx ON social_item (linked_url_hash) WHERE linked_url_hash IS NOT NULL;
CREATE INDEX social_item_countries_idx ON social_item USING gin (countries);
