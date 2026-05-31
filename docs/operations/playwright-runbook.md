# Playwright (web E2E) — runbook

Operator-facing instructions for running the five web E2E specs that gate
Phase 6 §6.4. Authoritative config lives at `apps/web/playwright.config.ts`.

## One-time setup

```bash
# From repo root or apps/web — either works; bunx hits the workspace install.
bunx playwright install chromium
```

`apps/web` already declares `@playwright/test` as a `devDependency`, so a
`bun install` at the workspace root makes the runner binary available;
the browser binary itself is a separate ~150 MB download that the
command above handles.

## Required environment

The `webServer` block in `playwright.config.ts` boots BOTH the API and
the web app before specs run. Each needs its own env:

| Variable                          | Consumer    | Notes                                       |
|-----------------------------------|-------------|---------------------------------------------|
| `DATABASE_URL`                    | `apps/api`  | Postgres connection string.                 |
| `NEXT_PUBLIC_API_BASE_URL`        | `apps/web`  | Locally `http://localhost:3001`.            |
| `NEXT_PUBLIC_SUPABASE_URL`        | `apps/web`  | Magic-link target — login spec uses it.     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | `apps/web`  | Magic-link target — login spec uses it.     |

Set these in `apps/api/.env.local` and `apps/web/.env.local`; never edit
`.env` files from automation.

## Running the suite

From `apps/web`:

```bash
bun run test:e2e        # headless, list reporter
bun run test:e2e:ui     # interactive UI mode, for local debugging
```

`reuseExistingServer` is on outside CI, so a `bun run dev` session in
another shell is not interrupted by the runner.

## CI (Phase 7)

Phase 6 ships chromium-only. Phase 7 CI will:

1. Cache `~/.cache/ms-playwright` keyed on `bun.lock` hash so the
   browser install only runs once per dependency bump.
2. Boot a preview deploy (Vercel preview URL for web, fly.io / Render
   preview for the API) and run the suite against
   `PLAYWRIGHT_BASE_URL=https://preview-...` instead of the local
   `webServer`.
3. Fan out across firefox + webkit + Mobile Chrome / Safari emulation.

## Known limitations (S1)

- **Mocked Supabase Storage uploads.** The composer spec does not
  exercise the real S3 / Supabase upload path; the API stubs in
  `apps/api/src/routes/uploads.ts` are sufficient for the surface check.
- **No real ZKP proving.** `IdentityShell` / `VerifyForm` are not yet
  mounted on a stable route. When Phase 5 wave 2 wires the route, append
  a `test()` to `onboarding.spec.ts` that posts a pre-generated proof
  envelope; the server returns 503 today.
- **No comments table.** Per `[[s1-phase-5-done]]` comments land in S2.
  The "comment" slot in the §6.4 inventory is filled by
  `tab-parity.spec.ts` instead — see the spec header for the rationale.
- **PII guard.** Specs MUST NOT `console.log(page.content())` or echo
  intercepted response bodies. Use `expect(...).not.toMatch(PII_PATTERN)`
  assertions only — see `admin-deanon.spec.ts` for the canonical pattern.
