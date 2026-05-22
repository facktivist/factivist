# Local development

Factivist runs almost everything natively under Bun. The only service that
needs Docker is Postgres-with-AGE, because the AGE extension isn't shipped in
the stock postgres image.

## Services

| Service | Container | When you need it |
|---------|-----------|-------------------|
| `postgres` | `apache/age:PG16_latest` | Always (DB + AGE knowledge graph) |
| `kuzu-explorer` | `kuzudb/explorer:latest` | Opt-in; lets you browse the code KG in a web UI |

Everything else (`apps/web`, `apps/api`, `apps/mobile`, all `packages/*`) is
plain Bun. No container required.

## First run

```bash
# 1. Copy environment template (creates a .env you can edit)
cp .env.example .env

# 2. Boot Postgres
bun run db:up

# 3. Wait until healthy (usually <5s); confirm with:
docker compose ps

# 4. Apply migrations — first the Drizzle relational schema, then AGE.
bun run db:migrate
bun run db:migrate:age
```

After this, the DB has the relational tables (`users`, …) and the
`factivist_kg` graph with its vertex/edge labels. Re-run `bun run db:migrate`
or `db:migrate:age` after pulling new migrations.

## Optional: Kuzu Explorer

```bash
# 1. Make sure the code graph has been ingested at least once
cd packages/codegraph && bun run graph:ingest

# 2. Boot the explorer
cd ../.. && bun run kuzu:explorer

# 3. Open http://localhost:8000
```

The explorer mounts `.codegraph/` read-only — it sees whatever the most recent
`bun run graph:ingest` wrote.

## Tearing down

```bash
bun run db:down          # stops the containers, KEEPS the data volume
docker compose down -v   # nuclear option — drops the data volume too
```

## Environment

`.env.example` documents the variables; copy to `.env` and edit. The defaults
are wired to match `docker-compose.yml` so the happy-path "just works":

| Variable | Default | Notes |
|----------|---------|-------|
| `POSTGRES_USER` | `factivist` | |
| `POSTGRES_PASSWORD` | `factivist_local` | Local-only. Never commit a real value. |
| `POSTGRES_DB` | `factivist` | |
| `POSTGRES_PORT` | `5432` | Map a different host port if you already run Postgres on 5432. |
| `DATABASE_URL` | derived | `postgres://factivist:factivist_local@localhost:5432/factivist` |
| `KUZU_EXPLORER_PORT` | `8000` | |

## Production

Supabase hosts Postgres in production — request AGE enablement via the
Supabase dashboard or support ticket before applying `bun run db:migrate:age`.
The pooled (6543) endpoint cannot run DDL; the `migration-port` guardrail
blocks accidental misuse. Use the direct (5432) URL for migrations.

## Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| `db:migrate:age` fails with `extension "age" is not available` | Container isn't the AGE image, or the dashboard hasn't enabled AGE in your Supabase project. |
| Connection refused on 5432 | Container not running (`bun run db:up`), or local Postgres already bound to 5432 (set `POSTGRES_PORT=5433` and update `DATABASE_URL`). |
| Migrations hang on prepared-statement errors | You're hitting the Supabase pooled endpoint (port 6543). Switch to the direct URL. |
| Kuzu Explorer shows "database not found" | No graph yet — run `bun run graph:ingest` first. |
