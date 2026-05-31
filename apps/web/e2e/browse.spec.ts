import { expect, test } from '@playwright/test'

/**
 * Phase 6 §6.4 — "browse" web E2E slot.
 *
 * Exercises the Discovery (`/discover`) surface end-to-end:
 *
 *   1. Empty-state copy renders without authentication (citizens browse
 *      anonymously by default — ADR-0010).
 *   2. The filters bar is a plain `<form method="get">` and round-trips
 *      filter changes through the URL.
 *   3. Pagination metadata renders (page / total count strip).
 *   4. The ADR-0017 combobox + breadcrumb picker — which lives on the
 *      composer alongside the discovery feature — exposes the correct
 *      a11y roles (`combobox` + `<nav aria-label="Constituency selection">`)
 *      so screen-reader navigation works without sighted assistance.
 *
 * The picker assertions live in this file (and not in `complaint.spec`)
 * because ADR-0017 ties the picker to the Discovery domain even though
 * the host surface is the composer.
 *
 * ## Anonymity contract (ADR-0010)
 *
 * E2E specs MUST NOT log proof inputs, nullifiers, or PII. The browse
 * feed is public, so no session is seeded here.
 */
test.describe('discovery / browse', () => {
  test('renders the browse header without auth', async ({ page }) => {
    await page.goto('/discover')
    await expect(page.getByRole('heading', { name: /browse complaints/i })).toBeVisible()
    // Either the empty state or one or more `<ComplaintCard />`s — both
    // are valid; we just assert the section exists and the helper copy
    // ("filter by state, district, ...") is present.
    await expect(page.getByText(/filter by state, district/i)).toBeVisible()
  })

  test('pagination metadata renders', async ({ page }) => {
    await page.goto('/discover')
    await expect(page.getByRole('navigation', { name: /pagination/i })).toBeVisible()
    await expect(page.getByText(/page \d+ of \d+/i)).toBeVisible()
    await expect(page.getByText(/\d+ total/i)).toBeVisible()
  })

  test('filters round-trip through the URL', async ({ page }) => {
    await page.goto('/discover')
    const filters = page.getByTestId('discovery-filters')
    await expect(filters).toBeVisible()

    await filters.locator('input[name="q"]').fill('water')
    await filters.locator('select[name="sort"]').selectOption('most-commented')

    await Promise.all([
      page.waitForURL(/q=water/),
      filters.locator('button[type="submit"]').click(),
    ])

    await expect(page).toHaveURL(/sort=most-commented/)
    await expect(filters.locator('input[name="q"]')).toHaveValue('water')
  })

  test('ADR-0017 combobox + breadcrumb picker exposes the correct a11y roles', async ({ page }) => {
    // The picker mounts on `/compose` per CreateComplaintForm — it's a
    // discovery-domain surface re-used by the composer.
    await page.goto('/compose')

    // The composer renders the "submissions paused" notice when the
    // feature flag is OFF; the picker only mounts when the form is
    // shown. Skip the picker assertion in the paused branch — that
    // branch is covered by the dedicated complaint.spec test.
    const paused = page.getByTestId('composer-paused')
    if ((await paused.count()) > 0) {
      test.info().annotations.push({
        type: 'flag-state',
        description: 'S1_COMPLAINT_SUBMIT=OFF — picker not mounted; skipping a11y assertion.',
      })
      return
    }

    await expect(page.getByRole('navigation', { name: /constituency selection/i })).toBeVisible()
    await expect(page.getByRole('combobox')).toBeVisible()
  })
})
