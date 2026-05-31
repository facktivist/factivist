# ADR-002: Zod schemas in packages/shared, validate client + server

## Status
Accepted

## Context
Validation logic split across `apps/api` (Hono input parsers), `apps/web` (React Hook Form resolvers), and `apps/mobile` (Expo forms) drifts within weeks: a phone-format tweak server-side leaves mobile silently accepting invalid input. We need one parser definition that travels.

## Decision
**All shared validation schemas live in `packages/shared/`.** Both `apps/api` (via `@hono/zod-validator`) and clients (`apps/web`, `apps/mobile` via `@hookform/resolvers/zod`) import the same `z.object(...)` definitions. `packages/shared` has **zero dependencies except `zod`** so it remains import-safe from any runtime (Bun, Node, Expo Hermes, browser).

## Consequences

### Positive
- One change → both ends update at compile time.
- `z.infer<typeof Schema>` becomes the canonical TS type, eliminating duplicate interfaces.
- Cheaper code review: validation diff is one file.

### Negative
- Tight coupling of client and server release cadence; mobile cannot ship a stale `packages/shared` for long.
- Schemas must stay framework-agnostic — no React/Hono imports inside.

### Neutral
- Drizzle schema (in `packages/db/`) remains separate; Zod schemas mirror DB shape but are not generated from it (manual sync, with tests that diff the two).

## Alternatives considered
- **Generate Zod from Drizzle (`drizzle-zod`)**: partially used for select shapes, but write-path schemas have UX rules (trim, lowercase, error messages) that pure DB generation cannot express. We use `drizzle-zod` only as a starting scaffold.
- **JSON Schema + AJV**: rejected — worse TS inference, larger client bundle.
- **tRPC inferred validators**: rejected — Hono RPC chosen for project (see action plan §4.2); tRPC not in stack.

## References
- Action plan §4.3 ADR-002
- `packages/shared/CLAUDE.md`
- Related: [[ADR-001]] (Drizzle), [[ADR-010]] (anonymity floor — schemas must reject PII fields)
