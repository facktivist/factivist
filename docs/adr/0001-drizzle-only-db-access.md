# ADR-001: Drizzle as the only DB access path

## Status
Accepted

## Context
Factivist S1 needs a single, type-safe, migration-friendly DB layer across `apps/api`, seed scripts, and tests. Mixing ORMs (Prisma + Drizzle), raw `pg`/`postgres-js` clients, and Supabase RPC calls would fragment the schema-of-truth, break type-inference at the Hono boundary, and complicate Supabase RLS coexistence. The monorepo already standardises on Drizzle in `packages/db/`.

## Decision
**Drizzle ORM is the only sanctioned DB access path in S1.** No raw SQL string concatenation in app code. No Prisma. No Knex. Supabase client is permitted for **auth and Storage only**, never for table reads/writes from `apps/api`. Drizzle migrations are the single source of schema truth; Supabase Studio is read-only for engineers.

## Consequences

### Positive
- One schema artefact (`packages/db/schema.ts`) → end-to-end types from DB to Hono RPC to UI.
- Drizzle Kit migrations are diff-able in PRs; no out-of-band Supabase Studio edits.
- Easier RLS-policy review: all queries observable through one tracer.

### Negative
- Engineers used to Prisma's generated client lose `prisma.user.findUnique` ergonomics; Drizzle's query builder is more verbose.
- Some Postgres extensions (e.g., `pg_trgm` tuning) need raw SQL inside Drizzle migrations — allowed only there.

### Neutral
- Raw SQL inside `db.execute(sql\`…\`)` is permitted for FTS and gist/gin index DDL; this is still under Drizzle's umbrella.

## Alternatives considered
- **Prisma**: rejected — runtime overhead, separate client generation step, weaker Postgres-extension story (FTS, RLS).
- **Kysely**: rejected — strong typing but smaller ecosystem; team velocity favoured Drizzle.
- **Raw `postgres-js` + Zod parse**: rejected — every query becomes bespoke; no migration tool.

## References
- Action plan §4.3 ADR-001
- `packages/db/CLAUDE.md`
- Related: [[ADR-002]] (Zod schemas), [[ADR-005]] (FTS via tsvector), [[ADR-007]] (seed dataset)
