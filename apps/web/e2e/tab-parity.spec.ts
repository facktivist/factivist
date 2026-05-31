import { expect, test } from '@playwright/test'

/**
 * Phase 6 §6.4 — slot originally allocated to "comment" is replaced by
 * the ADR-0019 tab-parity check.
 *
 * ## Why no comment spec
 *
 * Per `[[s1-phase-5-done]]` + the Pipeline G scope note: S1 ships
 * without a `comments` table — comments land in S2. A `.skip` placeholder
 * would be dead weight in the suite. The Phase 6 inventory still needs
 * five web E2E specs, so this slot covers a contract that S1 *does*
 * make and that has historically broken silently: the canonical web
 * tab order locked by ADR-0019.
 *
 * ## What this spec asserts
 *
 *   1. The PrimaryNav mounts on every primary route.
 *   2. The four tabs appear in the canonical order: Home → Search →
 *      Compose → Profile.
 *   3. The active tab on each route carries `aria-current="page"`
 *      (WCAG 2.2 AA — screen readers announce the current location).
 *   4. Compose is rendered as an `<a>` link, NEVER a FAB / role=button.
 *
 * The Vitest parity test
 * (`apps/web/src/__tests__/web-mobile-tab-parity.test.ts`) covers the
 * source-parse comparison with the mobile shell; this spec covers the
 * rendered DOM in a real browser.
 *
 * ## Anonymity contract (ADR-0010)
 *
 * E2E specs MUST NOT log proof inputs, nullifiers, or PII. This spec
 * only reads structural nav DOM, never user state.
 */

const CANONICAL_ORDER = ['Home', 'Search', 'Compose', 'Profile'] as const
const PRIMARY_ROUTES = ['/', '/discover', '/compose', '/profile'] as const

test.describe('ADR-0019 tab-order parity (web)', () => {
  for (const route of PRIMARY_ROUTES) {
    test(`PrimaryNav renders the canonical 4-tab order on ${route}`, async ({ page }) => {
      await page.goto(route)
      const nav = page.getByTestId('primary-nav')
      await expect(nav).toBeVisible()
      const labels = await nav.getByRole('link').allTextContents()
      expect(labels.map((s) => s.trim())).toEqual([...CANONICAL_ORDER])
    })
  }

  test('active tab carries aria-current="page"', async ({ page }) => {
    await page.goto('/discover')
    const searchTab = page.getByTestId('primary-nav-search')
    await expect(searchTab).toHaveAttribute('aria-current', 'page')
    // No other tab may carry the active marker.
    await expect(page.getByTestId('primary-nav-home')).not.toHaveAttribute('aria-current', 'page')
    await expect(page.getByTestId('primary-nav-compose')).not.toHaveAttribute(
      'aria-current',
      'page',
    )
    await expect(page.getByTestId('primary-nav-profile')).not.toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  test('Compose is a link, not a floating action button', async ({ page }) => {
    await page.goto('/')
    const compose = page.getByTestId('primary-nav-compose')
    // It must be an anchor (Next.js `<Link>` renders to `<a>`).
    await expect(compose).toHaveJSProperty('tagName', 'A')
    await expect(compose).toHaveAttribute('href', '/compose')
    // And there must be NO sibling role=button with the same label,
    // which would indicate a FAB regression.
    await expect(page.getByRole('button', { name: /^compose$/i })).toHaveCount(0)
  })
})
