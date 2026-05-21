# packages/db — Drizzle ORM + Supabase

## Commands
- Generate: `bun run db:generate` | Migrate: `bun run db:migrate`
- Studio: `bun run db:studio` | Seed: `bun run db:seed`

## Rules
- Schema in `src/schema/`. One file per domain.
- snake_case columns. Plural table names. UUID PKs with ID prefixes (e.g., `usr_`, `post_`).
- Explicit onDelete on all foreign keys.
- Never edit migrations manually. Regenerate with `drizzle-kit generate`.
- Seed data in `src/seed/` for dev and test environments.
- Test against dedicated test DB, never production.

## Skills
@skills/drizzle-best-practices
@skills/supabase-postgres-best-practices
@skills/supabase
@skills/database-designer
@skills/database-schema-designer
@skills/sql-database-assistant
@skills/vitest