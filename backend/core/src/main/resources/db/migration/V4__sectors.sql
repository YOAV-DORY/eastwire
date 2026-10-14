-- Sector tagging (milestone 7).

-- What each article was tagged from besides its headline and excerpt: GDELT theme codes and
-- the publisher's own topic tags ({"gdeltThemes": [...], "feedCategories": [...]}). Kept so
-- a change to config/sectors.yaml can re-tag stored articles.
ALTER TABLE article ADD COLUMN sector_signals jsonb NOT NULL DEFAULT '{}';

-- Version (short hash) of config/sectors.yaml the article's sectors come from.
-- NULL means not tagged yet; the next ingestion run tags it.
ALTER TABLE article ADD COLUMN sector_rules_version text;
