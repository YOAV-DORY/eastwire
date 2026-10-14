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

Live since 2026-10-14: Neon project `eastwire`, branch `production`, database `eastwire`.

1. Create a project, then a database named `eastwire` (**Databases → New database**).
2. Open the **SQL editor** and check both dropdowns at the top: **branch `production`**, **database `eastwire`**. Roles belong to one branch, and schema grants to one database. Running the script in the default `neondb` database or another branch is the most common mistake.
3. Run `backend/db/local-init.sql` with new passwords in place of the `*_local` ones. Neon **rejects weak passwords**: the statement fails, and the editor stops at the first error, so the roles and grants after it never run. Check that every result tab says success, with no ERROR tab. Generate passwords with `openssl rand -hex 24`.
4. Check the roles and grants. Neon's "Connect" dialog lists only roles created in its console, so use SQL:

   ```sql
   SELECT rolname, rolcanlogin FROM pg_roles WHERE rolname IN ('ingest_writer', 'api_reader');
   SELECT has_schema_privilege('ingest_writer', 'public', 'CREATE'),
          has_schema_privilege('api_reader', 'public', 'USAGE');
   ```

   You want two rows, then `true`, `true`.
5. Store the secrets. Never commit them.
   - **GitHub Actions** (hourly ingest job): `EASTWIRE_DB_URL`, `EASTWIRE_DB_USER=ingest_writer`, `EASTWIRE_DB_PASSWORD`.
   - **Render** (API): the same URL, `EASTWIRE_DB_USER=api_reader`, and that role's password.

   Set a password in Neon and in GitHub from **one** generated value, so they cannot drift apart. In your own terminal:

   ```bash
   P=$(openssl rand -hex 24) && gh secret set EASTWIRE_DB_PASSWORD --body "$P" && printf "ALTER ROLE ingest_writer WITH PASSWORD '%s';" "$P" | pbcopy
   ```

   Then paste and run the copied statement in the Neon SQL editor. For Render, use `api_reader` in the `ALTER ROLE`, then run `printf '%s' "$P" | pbcopy` and paste the password into Render's `EASTWIRE_DB_PASSWORD`.
6. Turn the hourly job on: `gh variable set INGEST_ENABLED --body true`. Until then the workflow is skipped, not failed.
7. Start the first run by hand: `gh workflow run ingest.yml`, or Actions → "Ingest" → "Run workflow". It creates the schema. The first run looks back one hour; later runs continue from where it stopped.

The JDBC URL format is `jdbc:postgresql://<host>/eastwire?sslmode=require`.
Use the **direct** host: turn "Connection pooling" off in Neon's Connect dialog, so the host has no `-pooler`. Flyway and the job's advisory lock need a real session.

What the errors mean:

| Log line | Cause |
|---|---|
| `password authentication failed for user …` | The role does not exist (`CREATE ROLE` failed), or the password differs from the secret |
| `permission denied for schema public` | The `GRANT … ON SCHEMA public` lines did not run in database `eastwire` |
| API answers 503 "temporarily unavailable" | Same causes for `api_reader`; Render's log shows which |
