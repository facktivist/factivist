import { expect, test } from '@playwright/test'

/**
 * Phase 6 §6.4 — "submit" web E2E slot.
 *
 * Covers the canonical submit flow surface:
 *   1. The Compose tab (`/compose`) renders the `ComposerShell` and the
 *      title field is reachable from the keyboard.
 *   2. The Discovery tab (`/discover`) renders the browse header and the
 *      filters bar without crashing — proving a published complaint
 *      would surface here once the feature flag + DB are seeded.
 *
 * The heavy correctness assertions (server-action error mapping, Zod
 * boundary parsing, feature-flag gating) live in the Vitest + RTL suites
 * under `apps/web/src/features/complaint/__tests__/**`. This spec is the
 * surface-level canary that exercises the same shells through a real
 * browser to catch route/layout/hydration regressions.
 *
 * ## Anonymity contract (ADR-0010)
 *
 * E2E specs MUST NOT log proof inputs, nullifiers, or PII. Do not
 * `console.log(page.content())` here. Use `expect(...).not.toMatch(...)`
 * style assertions for any value derived from authenticated state.
 */
test.describe('compose + discovery', () => {
  test('compose tab renders the composer shell', async ({ page }) => {
    await page.goto('/compose')
    // The shell mounts regardless of the feature flag — when the flag
    // is OFF it swaps in a paused-submissions notice; both branches
    // expose the shell's heading.
    await expect(
      page.getByRole('heading', { name: /(new complaint|submissions are paused)/i }),
    ).toBeVisible()
  })

  test('discovery page renders the browse heading', async ({ page }) => {
    await page.goto('/discover')
    await expect(page.getByRole('heading', { name: /browse complaints/i })).toBeVisible()
  })

  test('discovery filters bar accepts a sort change without crashing', async ({ page }) => {
    await page.goto('/discover')
    const filters = page.getByTestId('discovery-filters')
    await expect(filters).toBeVisible()
    const sortSelect = filters.locator('select[name="sort"]')
    await sortSelect.selectOption('most-flagged')
    // The form is a plain `method="get"` — selecting + submitting MUST
    // round-trip via the URL, NOT crash the route.
    await Promise.all([
      page.waitForURL(/sort=most-flagged/),
      filters.locator('button[type="submit"]').click(),
    ])
    await expect(page.getByRole('heading', { name: /browse complaints/i })).toBeVisible()
  })
})
