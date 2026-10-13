-- Least-privilege access (docs/PLAN.md, section 10):
--   ingest_writer: the hourly job; owns writes and runs these migrations.
--   api_reader:    the public API; SELECT only.
-- Roles are created per environment (see docs/database.md), so grants are applied only when
-- the role exists. This keeps the migration valid on a bare database such as a test container.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'api_reader') THEN
        EXECUTE 'GRANT USAGE ON SCHEMA public TO api_reader';
        EXECUTE 'GRANT SELECT ON ALL TABLES IN SCHEMA public TO api_reader';
        EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO api_reader';
    END IF;
END
$$;
