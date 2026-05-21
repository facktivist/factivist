# apps/api — Hono on Bun

## Commands
- Dev: `bun run --hot src/index.ts` | Test: `bun run test`

## Rules
- Hono framework. Export `AppType` for typed RPC client.
- Use `app.request()` for integration tests — no HTTP server needed.
- Zod validation on all inputs. Import schemas from @repo/shared.
- Drizzle queries via @repo/db. Composable middleware: auth → cors → rate-limit → logger.
- Bun built-in bundler for production builds.

## Skills
@skills/hono
@skills/api-design-reviewer
@skills/api-test-suite-builder
@skills/senior-backend
@skills/vitest
@skills/security-guidance