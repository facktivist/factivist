import { expect, test } from '@playwright/test'

/**
 * Phase 6 §6.4 — "onboarding" web E2E slot.
 *
 * Factivist S1 has two onboarding surfaces, both exercised here:
 *
 *   1. Citizen anonymous landing — `/` renders the welcome shell and
 *      the CTA toggles. Citizens browse anonymously by default; no
 *      account or session is created on this path.
 *
 *   2. Operator magic-link onboarding — `/login` renders the magic-link
 *      form and the `/profile` shell announces the anonymous default
 *      state for unauthenticated visitors. The full link-exchange flow
 *      requires Supabase env (`NEXT_PUBLIC_SUPABASE_*`) so we assert
 *      the surface mounts + the error-banner contract, NOT the
 *      cross-domain redirect.
 *
 * The citizen ZKP verification flow (`<IdentityShell />` + `<VerifyForm />`)
 * is NOT yet mounted on a stable URL — Phase 5 wave 2 will add the
 * route. When it lands, append a third `test()` here that drives the
 * pre-generated-proof envelope path.
 *
 * ## Anonymity contract (ADR-0010)
 *
 * E2E specs MUST NOT log proof inputs, nullifiers, or PII. This file
 * does not generate or submit proofs; the operator session it asserts
 * against carries a UUID actor id (outside the citizen anonymity floor)
 * and the rendered Profile card scrubs nullifiers by construction.
 */
test.describe('onboarding surfaces', () => {
  test('citizen lands on the welcome shell and the CTA is reachable', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Welcome to Factivist' })).toBeVisible()
    const cta = page.getByTestId('cta-button')
    await expect(cta).toBeVisible()
    await expect(cta).toHaveAttribute('aria-pressed', 'false')
  })

  test('operator login surface renders the magic-link form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByTestId('login-page')).toBeVisible()
    // The LoginForm island renders an email field and a submit. We do
    // NOT actually submit (no inbox in CI) — the assertion is that the
    // surface mounts cleanly and the magic-link affordance is reachable
    // from the keyboard.
    const emailField = page.getByRole('textbox', { name: /email/i })
    await expect(emailField).toBeVisible()
  })

  test('operator login surface respects the known error-code contract', async ({ page }) => {
    await page.goto('/login?error=invalid_code')
    const banner = page.getByTestId('login-banner-error')
    await expect(banner).toBeVisible()
    await expect(banner).toHaveAttribute('data-error-code', 'invalid_code')
    // The banner copy MUST be the canonical message, not the raw code —
    // /login renders the code through a switch table so an unknown code
    // never injects raw markup.
    await expect(banner).toContainText(/sign-in link was incomplete/i)
  })

  test('anonymous visitor on /profile sees the privacy-first default', async ({ page }) => {
    await page.goto('/profile')
    await expect(page.getByTestId('profile-shell')).toBeVisible()
    // No `factivist-session` cookie set → anonymous branch must render.
    await expect(page.getByTestId('profile-anonymous')).toBeVisible()
    await expect(page.getByText(/browsing anonymously/i)).toBeVisible()
    // Operator-only DOM must NOT appear.
    await expect(page.getByTestId('profile-operator')).toHaveCount(0)
  })
})
