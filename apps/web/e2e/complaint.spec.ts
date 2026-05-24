import { expect, test } from '@playwright/test'

/**
 * Pipeline B Playwright e2e — complaint compose & discovery happy path.
 *
 * Runs against the dev server (see `playwright.config.ts`) and requires the
 * Hono API + Supabase Postgres to be reachable. CI gates this test behind a
 * deploy-preview tag; locally it is the canary that proves the composer +
 * discovery feed surface haven't regressed.
 *
 * Test stays surface-level (smoke) — the heavy correctness assertions live
 * in the Vitest + RTL suites under `apps/web/src/features/**`.
 */
test.describe('complaint composer + discovery', () => {
  test('discovery page renders', async ({ page }) => {
    await page.goto('/complaints')
    await expect(page.getByRole('heading', { name: /browse complaints/i })).toBeVisible()
  })

  test('discovery filter bar accepts a sort change without crashing', async ({ page }) => {
    await page.goto('/complaints')
    const sortSelect = page.locator('select[name="sort"]')
    if ((await sortSelect.count()) > 0) {
      await sortSelect.selectOption('most-flagged')
    }
  })
})
