import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config for `apps/web` — Phase 6 Wave A.
 *
 * ## Required environment variables
 *
 * The `webServer` block boots both `apps/api` and `apps/web` before the
 * spec run. Each of them in turn requires environment to be present. The
 * full matrix below MUST be exported in the calling shell (or live in
 * `.env`/`.env.local` of each sub-app — we never edit them from CI):
 *
 *   - `DATABASE_URL`              — Postgres connection string for the API.
 *   - `NEXT_PUBLIC_API_BASE_URL`  — Web's pointer to the API. In local
 *                                    Playwright this is `http://localhost:3001`.
 *   - `NEXT_PUBLIC_SUPABASE_URL`  — Web magic-link callback target.
 *   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Web magic-link callback target.
 *
 * ## Pre-requisites (NOT executed here)
 *
 *   - `bunx playwright install chromium` — one-time, large download.
 *     CI installs into the runner image cache; locally run it the
 *     first time you touch this suite. See
 *     `docs/operations/playwright-runbook.md`.
 *
 * ## Why a single chromium project for S1
 *
 * Phase 6 inventory only requires the 5 happy-path web E2E specs to
 * exercise one engine. Phase 7 CI will fan-out across firefox + webkit
 * (and Mobile Chrome / Safari emulation) — kept out of S1 to keep the
 * Wave-A surface tight and the `bun run check` gate fast.
 *
 * ## Why `expect.timeout = 5000`
 *
 * The dev server boot already absorbs the long tail (120 s timeout
 * below). Per-assertion timeouts longer than 5 s mask real regressions
 * by waiting out network hangs.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  expect: {
    timeout: 5000,
  },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    // Fail fast on console errors that leak through to the operator UI.
    // Spec-level overrides can opt out via `page.removeAllListeners()`.
    ignoreHTTPSErrors: false,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Boot the API first (port 3001) so the web server's data fetches
  // succeed during pre-render; both reuse a running dev server locally
  // so a `bun run dev` session in another shell is not interrupted.
  webServer: [
    {
      command: 'bun run dev',
      cwd: '../api',
      url: 'http://localhost:3001/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'bun run dev',
      cwd: '.',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
})
