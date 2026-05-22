# Factivist — Project Setup

A Bun + Turborepo monorepo containing the Factivist web app, public API,
mobile app, and the shared packages they depend on. Everything except
Postgres-with-AGE runs natively under Bun — no container required.

For day-to-day database lifecycle see [local-dev.md](./local-dev.md).
For policy enforcement details see [guardrails.md](./guardrails.md) and
[agent-acl.md](./agent-acl.md).

## Prerequisites

| Tool | Version | Why |
|------|---------|-----|
| [Bun](https://bun.com) | ≥ 1.3.14 | Sole package manager and runtime for apps/api + scripts |
| Node | ≥ 24 | Next.js + Expo toolchain rely on a modern Node for some sub-processes |
| Docker + Docker Compose | recent | Runs Postgres-with-AGE locally |
| Xcode / Android Studio | latest | Only if you build `apps/mobile` for a simulator/device |

`bun install` will refuse to use npm/pnpm/yarn. The repo declares
`packageManager: bun@1.3.14`.

## First-time setup

```bash
# 1. Clone and install everything
git clone <repo> factivist
cd factivist
bun install

# 2. Environment — copy template, edit if needed
cp .env.example .env

# 3. Boot Postgres (AGE-enabled image)
bun run db:up

# 4. Apply schema (relational + AGE knowledge graph)
bun run db:migrate
bun run db:migrate:age

# 5. (optional) seed dev data
bun run db:seed

# 6. Verify everything builds + tests pass
bun run check
```

`bun run check` runs `turbo lint test:coverage build` across the workspace.
Expect the first run to take a minute; subsequent runs are cached by Turbo.

## Monorepo layout

```
apps/
  web/              Next.js 16 + HeroUI v3 — public UI
  api/              Hono on Bun — REST + RPC backend
  mobile/           Expo + HeroUI Native — iOS/Android client
packages/
  shared/           Zod schemas + types (zero deps except Zod)
  db/               Drizzle ORM schema, Postgres client, AGE helpers
  ui/theme/         Primitive + semantic oklch design tokens
  ui/web/           HeroUI v3 wrappers used by apps/web
  ui/native/        HeroUI Native wrappers used by apps/mobile
  codegraph/        Embedded Kuzu graph built from this monorepo's source
  guardrails/       Policy checks (secret leak, AGE-DDL, cross-app imports…)
  agent-acl/        Per-agent file ACLs enforced by ruflo's pre-task hook
tooling/
  tsconfig/         base.json, react.json, node.json
  tailwind-config/  Shared Tailwind v4 preset + HeroUI plugin
  vitest-config/    base.ts, react.ts, node.ts (95% coverage thresholds)
```

Dependency graph (apps depend on packages; packages never depend on apps):

```
tooling/* ─────────────────┐
packages/shared ───────────┤
                           ▼
                    packages/db
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
          apps/api    packages/ui   (parallel)
              │            │
              ▼            ▼
          apps/web ◄── packages/ui/web
          apps/mobile ◄── packages/ui/native
```

## What each app does

### apps/web — public UI (port 3000)

Next.js 16 App Router with Turbopack. Server Components by default,
HeroUI v3 for the component library, TanStack Query for server state,
Zustand for client state. Playwright for E2E in `e2e/`, Vitest +
Testing Library in `__tests__/`.

```bash
bun run dev          # all apps via turbo (web on :3000, api on :8787)
# or, single app:
cd apps/web && bun run dev
```

### apps/api — REST + RPC (port 8787)

Hono on Bun. Exports `AppType` for the typed RPC client used by web and
mobile. Zod validators imported from `@factivist/shared` for input
validation; Drizzle queries via `@factivist/db`. Integration tests use
`app.request()` — no HTTP server needed.

```bash
cd apps/api && bun run dev    # bun --hot src/index.ts
```

### apps/mobile — Expo (iOS + Android)

Expo Router for file-based navigation. HeroUI Native + Uniwind for
styling (shares the oklch tokens with web via `@factivist/ui-theme`).
Detox for E2E in `e2e/`, Vitest + Testing Library RN in `__tests__/`.

```bash
cd apps/mobile && bunx expo start
# Press 'i' for iOS sim, 'a' for Android emulator, or scan the QR
# with Expo Go for a physical device.

# Native builds (require Xcode / Android Studio):
bun run ios
bun run android
```

## What each package does

| Package | One-liner |
|---------|-----------|
| `@factivist/shared` | Zod schemas + TypeScript types shared between client, server, and mobile. Validators live in `src/validators/`. |
| `@factivist/db` | Drizzle ORM schema (one file per domain in `src/schema/`), Postgres client, and AGE knowledge-graph helpers (`./age`). Re-exports types via `./types`. |
| `@factivist/ui-theme` | Primitive + semantic design tokens (oklch). The single source of truth for colors, spacing, radii. Imported by both web and native UI layers. |
| `@factivist/ui-web` | HeroUI v3 component wrappers tailored for Next.js Server Components. |
| `@factivist/ui-native` | HeroUI Native wrappers used by Expo screens. |
| `@factivist/codegraph` | Builds an embedded Kuzu code knowledge graph from the monorepo source (`graph:ingest`). Exports an Obsidian vault, supports Cypher queries, and pairs with the AGE domain graph in `@factivist/db`. |
| `@factivist/guardrails` | Pure-function policy checks (`secret-leak`, `cross-app-import`, `age-ddl-outside-migration`, `migration-port`, `env-file`) wired into Lefthook git hooks and ruflo's pre-task hook. Bypass requires `BYPASS_GUARDRAILS=<class> BYPASS_REASON="…"` and is audited. |
| `@factivist/agent-acl` | Declarative per-agent file ACLs. Root `.agent-acl.yaml` defines identities; `packages/*/.agent-acl.yaml` and `apps/*/.agent-acl.yaml` add overlays. `checkAcl(agent, path, action)` returns pass/deny. |

## Daily workflow

```bash
# Run everything (web + api in parallel, mobile started separately)
bun run dev

# Or work on one app
cd apps/web && bun run dev

# Test the package you're touching
cd packages/shared && bun run test

# Full repo gate before pushing
bun run check        # lint → test:coverage → build
```

## All root scripts

| Script | What it does |
|--------|--------------|
| `bun run dev` | `turbo run dev` — every workspace with a `dev` script in parallel |
| `bun run build` | `turbo run build` — typecheck/bundle everything |
| `bun run test` | `turbo run test` — Vitest in every package |
| `bun run test:coverage` | Same as `test` with v8 coverage; CI fails below 95% line/fn/stmt or 90% branch |
| `bun run lint` | `biome check .` across the repo |
| `bun run format` | `biome format --write .` |
| `bun run check` | `turbo run lint test:coverage build` — the CI gate |
| `bun run db:up` / `db:down` | Docker compose for the Postgres+AGE container |
| `bun run db:logs` | Tail the Postgres container logs |
| `bun run db:generate` | `drizzle-kit generate` — emit a new migration from schema changes |
| `bun run db:migrate` | Apply Drizzle relational migrations (sources `.env`) |
| `bun run db:migrate:age` | Apply AGE knowledge-graph migrations (sources `.env`) |
| `bun run db:seed` | Run `packages/db/src/seed/index.ts` (sources `.env`) |
| `bun run kuzu:explorer` | `docker compose --profile tools up -d kuzu-explorer` (http://localhost:8000) |

## Per-package CLIs

| Command | Effect |
|---------|--------|
| `cd packages/codegraph && bun run graph:ingest` | Rebuild `.codegraph/graph.kuzu` from source |
| `cd packages/codegraph && bun run graph:query "<cypher>"` | One-off Cypher query |
| `cd packages/codegraph && bun run graph:export:obsidian` | Emit an Obsidian vault at `.codegraph/vault/` |
| `cd packages/guardrails && bun run guardrails -- --help` | CLI wrapping the policy checks |
| `cd packages/agent-acl && bun run acl -- --help` | CLI for ACL inspection and `checkAcl` |
| `cd packages/db && bun run db:studio` | Drizzle Studio (browser UI for the DB) |

## Testing

| Tier | Tool | Location |
|------|------|----------|
| Unit + integration | Vitest | `**/__tests__/*.test.ts` |
| Web E2E | Playwright | `apps/web/e2e/*.spec.ts` |
| Mobile E2E | Detox | `apps/mobile/e2e/*.spec.ts` |

Coverage thresholds (enforced by `tooling/vitest-config`):

- Lines / functions / statements ≥ 95 %
- Branches ≥ 90 %

```bash
bun run test                                # all packages
bun run test:coverage                       # same, with coverage
cd apps/web && bun run test:e2e             # Playwright
cd apps/mobile && bun run test:e2e:ios      # Detox (needs ios simulator built)
```

## Git hooks (Lefthook)

`lefthook.yml` wires `biome` + the guardrails to `pre-commit` and refreshes
the code graph on `post-commit`. To bypass a guardrail temporarily:

```bash
BYPASS_GUARDRAILS=hotfix BYPASS_REASON="prod outage, ticket #123" git commit ...
```

Bypass classes: `hotfix`, `experiment`, `local`, `sudo`.
`secret-leak` is unbypassable.

## Production notes

- Supabase hosts Postgres in production. Request **AGE enablement** in the
  Supabase dashboard before running `bun run db:migrate:age` against a
  production URL.
- Use the direct (`:5432`) connection URL for migrations. The pooled
  (`:6543`) endpoint rejects DDL and prepared statements — the
  `migration-port` guardrail blocks the mistake.
- The mobile app and web app share API contracts via `@factivist/shared`.
  Bump that package whenever a Zod schema changes and rebuild downstream
  workspaces.

## Troubleshooting

| Symptom | Likely fix |
|---------|------------|
| `bun install` complains about lockfile | `rm -rf node_modules bun.lock && bun install` |
| `db:migrate:age` errors with `extension "age" is not available` | Wrong Postgres image (must be `apache/age:*`), or Supabase project hasn't enabled AGE |
| Connection refused on `:5432` | `bun run db:up`, or set `POSTGRES_PORT=5433` if you already have local Postgres on 5432 |
| Migrations hang on prepared-statement errors | You're hitting Supabase's pooled `:6543` endpoint — switch to the direct URL |
| `kuzu-explorer` shows "database not found" | Run `cd packages/codegraph && bun run graph:ingest` first |
| Pre-commit hook fails on `secret-leak` | A real secret is staged — purge it; this guardrail is unbypassable |

## Further reading

- [docs/local-dev.md](./local-dev.md) — Postgres + Kuzu Explorer lifecycle
- [docs/guardrails.md](./guardrails.md) — guardrail catalog and bypass policy
- [docs/agent-acl.md](./agent-acl.md) — per-agent ACL design
- [docs/tech-stack-evaluation.md](./tech-stack-evaluation.md) — why these tools were picked
- Root `CLAUDE.md` — project rules + agent routing
- `packages/*/CLAUDE.md` — domain-specific rules for each package
