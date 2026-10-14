-- EastWire initial schema (docs/PLAN.md, section 6).
-- Enumerated values use text + CHECK constraints rather than Postgres enum types,
-- so adding a value later is a one-line migration.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------- reference data
-- Synced from config/ by the ingest job; config/ is the source of truth.

CREATE TABLE country (
    iso2  char(2)  PRIMARY KEY,
    fips  char(2)  NOT NULL UNIQUE,
    name  text     NOT NULL,
    phase smallint NOT NULL CHECK (phase IN (1, 2))
);

CREATE TABLE place (
    geonames_id       bigint           PRIMARY KEY,
    name              text             NOT NULL,
    ascii_name        text             NOT NULL,
    country_iso2      char(2)          NOT NULL REFERENCES country (iso2),
    admin1_code       text,
    admin1_name       text,
    lat               double precision NOT NULL CHECK (lat BETWEEN -90 AND 90),
    lon               double precision NOT NULL CHECK (lon BETWEEN -180 AND 180),
    population        bigint,
    population_source text,
    feature_code      text,
    aliases           text[]           NOT NULL DEFAULT '{}',
    is_major_city     boolean          NOT NULL DEFAULT true
);
CREATE INDEX place_country_idx ON place (country_iso2);

CREATE TABLE source (
    id                  smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug                text     NOT NULL UNIQUE,
    name                text     NOT NULL,
    kind                text     NOT NULL CHECK (kind IN ('news_feed', 'discovery', 'social')),
    status              text     NOT NULL CHECK (status IN ('verified', 'conditional', 'excluded')),
    display_mode        text     NOT NULL CHECK (display_mode IN ('headline_excerpt', 'headline_only', 'embed', 'none')),
    enabled             boolean  NOT NULL DEFAULT false,
    max_excerpt_chars   integer  NOT NULL DEFAULT 0 CHECK (max_excerpt_chars >= 0),
    attribution         text,
    publisher_country   char(2),
    publisher_place_id  bigint   REFERENCES place (geonames_id),
    retention_days      integer  CHECK (retention_days > 0),
    evidence_url        text,
    evidence_checked_on date,
    synced_at           timestamptz NOT NULL DEFAULT now(),
    CHECK (NOT (status = 'excluded' AND enabled))
);

CREATE TABLE domain_policy (
    domain       text PRIMARY KEY,
    publisher    text,
    country_iso2 char(2),
    decision     text NOT NULL CHECK (decision IN ('allow', 'deny', 'pending')),
    rule         text NOT NULL,
    url_prefixes text[] NOT NULL DEFAULT '{}',
    evidence_url text,
    checked_on   date,
    synced_at    timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- ingestion tracking

CREATE TABLE ingestion_run (
    id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_id      smallint    NOT NULL REFERENCES source (id),
    started_at     timestamptz NOT NULL DEFAULT now(),
    finished_at    timestamptz,
    status         text        NOT NULL CHECK (status IN ('running', 'success', 'partial', 'failed', 'skipped')),
    items_seen     integer     NOT NULL DEFAULT 0,
    items_new      integer     NOT NULL DEFAULT 0,
    http_status    integer,
    error_class    text,
    error_message  text,
    cursor_before  text,
    cursor_after   text
);
CREATE INDEX ingestion_run_source_started_idx ON ingestion_run (source_id, started_at DESC);

CREATE TABLE source_status (
    source_id            smallint PRIMARY KEY REFERENCES source (id),
    last_attempt_at      timestamptz,
    last_success_at      timestamptz,
    newest_item_at       timestamptz,
    consecutive_failures integer NOT NULL DEFAULT 0,
    circuit_open_until   timestamptz,
    last_error           text,
    cursor               text
);

-- ---------------------------------------------------------------- articles

CREATE TABLE story_cluster (
    id                        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    first_seen_at             timestamptz NOT NULL DEFAULT now(),
    representative_article_id bigint,
    size                      integer     NOT NULL DEFAULT 1 CHECK (size >= 1)
);

CREATE TABLE article (
    id                      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_id               smallint    NOT NULL REFERENCES source (id),
    discovered_via_source_id smallint   REFERENCES source (id),
    canonical_url           text        NOT NULL,
    url_hash                bytea       NOT NULL UNIQUE CHECK (octet_length(url_hash) = 32),  -- SHA-256
    domain                  text        NOT NULL,
    title                   text        NOT NULL CHECK (length(title) BETWEEN 1 AND 500),
    excerpt                 text,
    excerpt_kind            text        NOT NULL DEFAULT 'none'
                                        CHECK (excerpt_kind IN ('publisher_dek', 'cc_by_excerpt', 'none')),
    author                  text,
    credit_line             text,
    published_at            timestamptz,
    discovered_at           timestamptz NOT NULL DEFAULT now(),
    language                text        NOT NULL DEFAULT 'en',
    display_mode            text        NOT NULL CHECK (display_mode IN ('headline_excerpt', 'headline_only')),
    license_name            text,
    license_url             text,
    attribution             text,
    cluster_id              bigint      REFERENCES story_cluster (id) ON DELETE SET NULL,
    expires_at              timestamptz NOT NULL,
    search_tsv              tsvector GENERATED ALWAYS AS (
                                setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
                                setweight(to_tsvector('english', coalesce(excerpt, '')), 'B')) STORED,
    -- An excerpt needs a permission basis, and headline-only items never carry one.
    CHECK ((excerpt IS NULL) = (excerpt_kind = 'none')),
    CHECK (display_mode = 'headline_excerpt' OR excerpt IS NULL)
);
CREATE INDEX article_search_idx       ON article USING gin (search_tsv);
CREATE INDEX article_title_trgm_idx   ON article USING gin (title gin_trgm_ops);
CREATE INDEX article_published_idx    ON article (published_at DESC);
CREATE INDEX article_discovered_idx   ON article (discovered_at DESC);
CREATE INDEX article_expires_idx      ON article (expires_at);
CREATE INDEX article_cluster_idx      ON article (cluster_id);

ALTER TABLE story_cluster
    ADD CONSTRAINT story_cluster_representative_fk
    FOREIGN KEY (representative_article_id) REFERENCES article (id) ON DELETE SET NULL;

CREATE TABLE article_location (
    id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    article_id       bigint  NOT NULL REFERENCES article (id) ON DELETE CASCADE,
    place_id         bigint  REFERENCES place (geonames_id),
    country_iso2     char(2) NOT NULL REFERENCES country (iso2),
    role             text    NOT NULL CHECK (role IN ('mentioned', 'event', 'publisher')),
    precision        text    NOT NULL CHECK (precision IN ('city', 'admin1', 'country')),
    confidence       text    NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
    method           text    NOT NULL CHECK (method IN ('gdelt_gkg', 'dateline', 'gazetteer', 'source_registry')),
    evidence_snippet varchar(80),
    -- Only city-precision locations point at a place; country-level items are never pinned.
    CHECK ((precision = 'city') = (place_id IS NOT NULL))
);
CREATE INDEX article_location_article_idx ON article_location (article_id);
CREATE INDEX article_location_place_idx   ON article_location (place_id, role);
CREATE INDEX article_location_country_idx ON article_location (country_iso2, role);

CREATE TABLE article_sector (
    article_id    bigint       NOT NULL REFERENCES article (id) ON DELETE CASCADE,
    sector        text         NOT NULL CHECK (sector IN ('economy', 'geopolitics', 'technology', 'business', 'society', 'environment')),
    score         numeric(6,2) NOT NULL,
    matched_rules jsonb        NOT NULL DEFAULT '[]',
    PRIMARY KEY (article_id, sector)
);
CREATE INDEX article_sector_sector_idx ON article_sector (sector);

-- ---------------------------------------------------------------- social

CREATE TABLE social_account (
    id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    platform     text    NOT NULL CHECK (platform IN ('bluesky', 'youtube', 'telegram')),
    external_id  text    NOT NULL,
    handle       text,
    display_name text,
    kind         text    NOT NULL CHECK (kind IN ('newsroom', 'journalist', 'official')),
    base_country char(2) REFERENCES country (iso2),
    reason       text    NOT NULL,
    evidence_url text,
    enabled      boolean NOT NULL DEFAULT true,
    UNIQUE (platform, external_id)
);

CREATE TABLE social_item (
    id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    platform         text        NOT NULL CHECK (platform IN ('bluesky', 'youtube', 'telegram')),
    external_id      text        NOT NULL,
    url              text        NOT NULL,
    account_id       bigint      NOT NULL REFERENCES social_account (id),
    created_at       timestamptz NOT NULL,
    fetched_at       timestamptz NOT NULL DEFAULT now(),
    last_verified_at timestamptz NOT NULL DEFAULT now(),
    index_text       text,
    labels           jsonb       NOT NULL DEFAULT '[]',
    status           text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'deleted')),
    expires_at       timestamptz NOT NULL,
    search_tsv       tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(index_text, ''))) STORED,
    UNIQUE (platform, external_id),
    -- Platform data may be kept at most 30 days without a refresh (YouTube policy III.E.4.c).
    CHECK (expires_at <= last_verified_at + interval '30 days')
);
CREATE INDEX social_item_created_idx ON social_item (created_at DESC);
CREATE INDEX social_item_search_idx  ON social_item USING gin (search_tsv);
CREATE INDEX social_item_expires_idx ON social_item (expires_at);

CREATE TABLE social_link (
    social_item_id bigint       NOT NULL REFERENCES social_item (id) ON DELETE CASCADE,
    cluster_id     bigint       NOT NULL REFERENCES story_cluster (id) ON DELETE CASCADE,
    link_type      text         NOT NULL CHECK (link_type IN ('shares_url', 'text_overlap')),
    score          numeric(6,3) NOT NULL,
    PRIMARY KEY (social_item_id, cluster_id)
);

-- ---------------------------------------------------------------- takedowns

CREATE TABLE suppression (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    url_hash    bytea,
    platform    text,
    external_id text,
    reason      text        NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    CHECK (url_hash IS NOT NULL OR (platform IS NOT NULL AND external_id IS NOT NULL))
);
CREATE UNIQUE INDEX suppression_url_idx    ON suppression (url_hash) WHERE url_hash IS NOT NULL;
CREATE UNIQUE INDEX suppression_social_idx ON suppression (platform, external_id) WHERE external_id IS NOT NULL;
