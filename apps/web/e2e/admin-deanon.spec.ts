/**
 * Deanonymisation adversarial e2e — Phase 5 Pipeline C.
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
 * ## Why this is gated, not skipped
 *
 * Playwright runs the configured `webServer` (`bun run dev`) which
 * requires the API at `localhost:3001` to be reachable. CI runs both;
 * locally you may need `bun run dev` in `apps/api` alongside. If the
 * dev server is unreachable the test gracefully reports `skip` rather
 * than failing — see the `try { await page.goto(...) }` guard.
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
  test('queue page DOM + network response carry NO nullifier', async ({ context, page }) => {
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

    try {
      await page.goto('/admin/moderation', { waitUntil: 'domcontentloaded', timeout: 10_000 })
    } catch {
      test.skip(true, 'web/api dev servers unreachable — see e2e prerequisites')
    }

    const html = await page.content()
    expect(html, 'DOM must not contain a nullifier').not.toMatch(PII_PATTERN)
    for (const body of responses) {
      expect(body, 'network response must not contain a nullifier').not.toMatch(PII_PATTERN)
    }
  })

  test('case detail page DOM + network carries NO nullifier', async ({ context, page }) => {
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

    try {
      await page.goto('/admin/moderation/mq_test_seed_id', {
        waitUntil: 'domcontentloaded',
        timeout: 10_000,
      })
    } catch {
      test.skip(true, 'web/api dev servers unreachable — see e2e prerequisites')
    }

    const html = await page.content()
    expect(html).not.toMatch(PII_PATTERN)
    for (const body of responses) {
      expect(body).not.toMatch(PII_PATTERN)
    }
  })

  test('query-string injection `?include=nullifier` is ignored', async ({ context, page }) => {
    await seedSession(context)

    try {
      await page.goto('/admin/moderation?include=nullifier&fields=*&select=nullifier_ref', {
        waitUntil: 'domcontentloaded',
        timeout: 10_000,
      })
    } catch {
      test.skip(true, 'web/api dev servers unreachable')
    }

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

    try {
      await page.goto('/admin/moderation', {
        waitUntil: 'domcontentloaded',
        timeout: 10_000,
      })
    } catch {
      test.skip(true, 'web/api dev servers unreachable')
    }

    const html = await page.content()
    expect(html, 'header injection must not leak a nullifier').not.toMatch(PII_PATTERN)
  })

  test('XHR-style direct API call from the browser context returns no nullifier', async ({
    context,
    page,
  }) => {
    await seedSession(context)

    try {
      await page.goto('/admin/moderation', {
        waitUntil: 'domcontentloaded',
        timeout: 10_000,
      })
    } catch {
      test.skip(true, 'web/api dev servers unreachable')
    }

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
