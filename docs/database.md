# Database

PostgreSQL. The schema lives in Flyway migrations under
`backend/core/src/main/resources/db/migration/`. Only the ingest job runs migrations.
`V4__sectors.sql` adds `article.sector_signals` and `article.sector_rules_version`, which let
the hourly run re-tag stored articles when `config/sectors.yaml` changes.

## Roles

| Role | Used by | Rights |
|---|---|---|
| `ingest_writer` | hourly ingest job (GitHub Actions) | owns the tables, runs migrations, reads and writes |
| `api_reader` | public API (Render) | `SELECT` only (granted by migration `V2__access_roles.sql`) |

Both connect over TLS in production (`sslmode=require`).

## Local development

**With Docker (or OrbStack / Colima):**

```bash
docker compose up -d                 # Postgres 17 with both roles (backend/db/local-init.sql)
cd backend && ./gradlew :ingest:bootRun   # runs migrations, then syncs config/ into the tables
```

The ingest job's defaults (`application.yaml`) match `compose.yaml`. To point it elsewhere,
set `EASTWIRE_DB_URL`, `EASTWIRE_DB_USER` and `EASTWIRE_DB_PASSWORD`.

**Without Docker:**
- The integration tests (Testcontainers) are skipped automatically. CI runs them.
- For a local server, install Postgres (e.g. Postgres.app or `brew install postgresql@17`) and run `backend/db/local-init.sql` as a superuser.

## Production (Neon, free plan)

1. Create a project and a database named `eastwire`.
2. In the Neon SQL editor, run `backend/db/local-init.sql` with **new, strong passwords** in
   place of the `*_local` ones. Don't commit them.
3. Store the connection details as secrets. Enter the values yourself; never commit them:
   - **GitHub Actions**, for the hourly ingest job: run `gh secret set EASTWIRE_DB_URL`, then the same for `EASTWIRE_DB_USER` (value `ingest_writer`) and `EASTWIRE_DB_PASSWORD`. Each command prompts for its value.
   - **Render:** `EASTWIRE_DB_URL`, `EASTWIRE_DB_USER=api_reader`, `EASTWIRE_DB_PASSWORD`.
4. Turn the hourly job on: `gh variable set INGEST_ENABLED --body true`. Until then the workflow is skipped, not failed.
5. Start the first run by hand from the Actions tab ("Ingest" → "Run workflow"). It creates the schema.

The JDBC URL format is `jdbc:postgresql://<host>/eastwire?sslmode=require`.
