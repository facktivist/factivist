# packages/codegraph — Embedded Code Knowledge Graph (Kuzu)

## Purpose

A code/folder/symbol knowledge graph derived from the monorepo. Rebuilt from
source on every CI run — never hand-edited. Pairs with:

- `@factivist/db` — Apache AGE domain knowledge graph (claims, evidence, sources)
- Ruflo `agentdb_causal-*` — agent reasoning trajectories

Cross-references between layers travel by stable IDs (file path hash, package name).

## Commands

| Action | Command |
|--------|---------|
| Ingest monorepo into graph | `bun run graph:ingest` |
| Query graph | `bun run graph:query "<cypher>"` |
| Test | `bun run test` |

## Rules

- The Kuzu DB file (`.codegraph/graph.kuzu`) is **gitignored** — always regenerable.
- Ingest is deterministic: same source → same graph (sorted iteration, content hashes).
- Never extend the schema in ad-hoc migrations. Bump `SCHEMA_VERSION` and reingest.
- Resolver MUST treat workspace packages (`@factivist/*`) as first-class — never
  emit them as external "NodeModule" placeholders.
- Files outside the workspace root are ignored entirely.

## Schema

Node tables: `Package`, `File`, `Symbol`
Rel tables: `CONTAINS` (pkg→file), `DEPENDS_ON` (pkg→pkg), `IMPORTS` (file→file),
`DEFINES` (file→symbol), `REFERENCES` (symbol→symbol).

## Skills
@skills/tdd-guide
@skills/coverage
