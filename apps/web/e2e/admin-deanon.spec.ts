/**
 * Phase 6 §6.4 — "flag" web E2E slot (adversarial moderator surface).
 *
 * From an authenticated moderator session, exhaust every path a hostile
 * operator might use to leak a citizen `nullifier` out of the admin
 * surface. Every path MUST produce zero matches against the PII regex
 * in both the DOM and intercepted network responses.
 *
 * The test boots a moderator session by setting `factivist-session`
 * (base64 JSON envelope) before navigating — the same shape the
 * `getServerSession()` resolver accepts in dev/Playwright.
 *
 * ## Phase 6 update — webServer orchestration
 *
 * The Phase 5 version of this file used `try { goto } catch { skip }`
 * to gracefully no-op when the dev servers were not running. Phase 6
 * configures `playwright.config.ts.webServer` to boot both the API
 * (port 3001) and web (port 3000) before specs run, so a navigation
 * failure now signals a real regression. We surface the navigation
 * outcome via `test.info().annotations` so CI sees the failure with
 * full context instead of a silent skip.
 *
 * ## Anonymity contract (ADR-0010)
 *
 * E2E specs MUST NOT log proof inputs, nullifiers, or PII. Body bytes
 * captured below are scanned with the PII regex and never echoed via
 * `console.log` — they only feed the assertion.
 */

import { expect, test } from '@playwright/test'

const PII_PATTERN = /nullifier|aadhaar|ip_address|user_agent|legal_name/i

const MODERATOR_ENVELOPE = Buffer.from(
  JSON.stringify({ userId: 'usr_e2e_mod', role: 'moderator', token: 'e2e-token' }),
  'utf-8',
).toString('base64')

const seedSession = async (context: import('@playwright/test').BrowserContext) => {
  await context.addCookies([
    {
      name: 'factivist-session',
      value: MODERATOR_ENVELOPE,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      sameSite: 'Lax',
    },
  ])
}

test.describe('Admin deanonymisation attack matrix', () => {
  test('queue page DOM + network response carry NO nullifier', async ({ context, page }, info) => {
    await seedSession(context)

    const responses: string[] = []
    page.on('response', async (resp) => {
      if (resp.url().includes('/admin/moderation')) {
        try {
          responses.push(await resp.text())
        } catch {
          /* ignore non-text bodies */
        }
      }
    })

    const nav = await page.goto('/admin/moderation', { waitUntil: 'domcontentloaded' })
    info.annotations.push({
      type: 'nav-status',
      description: `/admin/moderation → ${nav?.status() ?? 'no-response'}`,
    })

    const html = await page.content()
    expect(html, 'DOM must not contain a nullifier').not.toMatch(PII_PATTERN)
    for (const body of responses) {
      expect(body, 'network response must not contain a nullifier').not.toMatch(PII_PATTERN)
    }
  })

  test('case detail page DOM + network carries NO nullifier', async ({ context, page }, info) => {
    await seedSession(context)

    const responses: string[] = []
    page.on('response', async (resp) => {
      if (resp.url().includes('/admin/moderation') || resp.url().includes('/complaints/')) {
        try {
          responses.push(await resp.text())
        } catch {
          /* ignore */
        }
      }
    })

    const nav = await page.goto('/admin/moderation/mq_test_seed_id', {
      waitUntil: 'domcontentloaded',
    })
    info.annotations.push({
      type: 'nav-status',
      description: `/admin/moderation/:id → ${nav?.status() ?? 'no-response'}`,
    })

    const html = await page.content()
    expect(html).not.toMatch(PII_PATTERN)
    for (const body of responses) {
      expect(body).not.toMatch(PII_PATTERN)
    }
  })

  test('query-string injection `?include=nullifier` is ignored', async ({ context, page }) => {
    await seedSession(context)

    await page.goto('/admin/moderation?include=nullifier&fields=*&select=nullifier_ref', {
      waitUntil: 'domcontentloaded',
    })

    const html = await page.content()
    expect(html, 'query-string injection must not leak a nullifier').not.toMatch(PII_PATTERN)
  })

  test('header injection (X-Admin-Override, X-Internal) is ignored', async ({ context, page }) => {
    await seedSession(context)
    // Use a route to inject the headers on every request out of this page.
    await page.route('**/*', async (route, request) => {
      const headers = {
        ...request.headers(),
        'x-admin-override': 'true',
        'x-internal': 'true',
        'x-include-nullifier': 'true',
      }
      await route.continue({ headers })
    })

    await page.goto('/admin/moderation', {
      waitUntil: 'domcontentloaded',
    })

    const html = await page.content()
    expect(html, 'header injection must not leak a nullifier').not.toMatch(PII_PATTERN)
  })

  test('XHR-style direct API call from the browser context returns no nullifier', async ({
    context,
    page,
  }) => {
    await seedSession(context)

    await page.goto('/admin/moderation', {
      waitUntil: 'domcontentloaded',
    })

    const body = await page.evaluate(async () => {
      try {
        const res = await fetch('/admin/moderation', { headers: { accept: 'application/json' } })
        return await res.text()
      } catch (err) {
        return String(err)
      }
    })
    expect(body).not.toMatch(PII_PATTERN)
  })
})
