-- Runs once, as the superuser, when the local compose database is first created.
-- Passwords here are for local development only. Production roles are created in Neon
-- (see docs/database.md) and their credentials live in GitHub Actions / Render secrets.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE ROLE ingest_writer LOGIN PASSWORD 'ingest_writer_local';
CREATE ROLE api_reader LOGIN PASSWORD 'api_reader_local';

GRANT CONNECT ON DATABASE eastwire TO ingest_writer, api_reader;
-- Since Postgres 15 ordinary roles cannot create objects in the public schema by default.
GRANT USAGE, CREATE ON SCHEMA public TO ingest_writer;
GRANT USAGE ON SCHEMA public TO api_reader;
