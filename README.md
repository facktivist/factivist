# Factivist

A Bun + Turborepo monorepo: Next.js 16 web app, Hono-on-Bun API, Expo mobile
app, and the shared packages they depend on (design system, Drizzle schema,
embedded code knowledge graph, project guardrails, per-agent ACLs).

## Quick start

```bash
bun install
cp .env.example .env
bun run db:up              # Postgres + Apache AGE
bun run db:migrate         # relational schema
bun run db:migrate:age     # knowledge-graph schema
bun run dev                # web on :3000, api on :8787
```

Mobile is started separately because it owns the Metro/Expo Dev Server:

```bash
cd apps/mobile && bunx expo start
```

Verify the workspace is green:

```bash
bun run check              # lint → test:coverage → build
```

## Layout

```
apps/      web (Next.js)   api (Hono/Bun)   mobile (Expo)
packages/  shared  db  ui/{theme,web,native}  codegraph  guardrails  agent-acl
tooling/   tsconfig  tailwind-config  vitest-config
```

## Where to read more

- **[docs/setup.md](docs/setup.md)** — full setup, what every app and package
  does, all root and per-package scripts, testing, hooks, production notes.
- [docs/local-dev.md](docs/local-dev.md) — Postgres + Kuzu Explorer lifecycle.
- [docs/guardrails.md](docs/guardrails.md) — policy checks and bypass policy.
- [docs/agent-acl.md](docs/agent-acl.md) — per-agent file ACL design.
- [docs/tech-stack-evaluation.md](docs/tech-stack-evaluation.md) — stack
  rationale.
- `CLAUDE.md` (root and per-package) — project rules + agent routing.

## Requirements

Bun ≥ 1.3.14, Node ≥ 24, Docker (for Postgres-with-AGE). Xcode / Android
Studio only if you build `apps/mobile` natively.

## Package manager

Bun, exclusively. `bun install`, `bun run …`, `bunx …`. Do not use npm,
yarn, or pnpm — the repo declares `packageManager: bun@1.3.14`.
