/**
 * Web ↔ mobile tab-order parity lock.
 *
 * ADR-0019: "same bottom-tab order on iOS + Android, no FAB". The web
 * shell extends that decision — the four-tab primary nav at
 * `apps/web/src/components/PrimaryNav.tsx` must declare the SAME
 * destinations in the SAME order as the mobile shell at
 * `apps/mobile/app/(tabs)/_layout.tsx`.
 *
 * This test parses both source files as text and locks the order at
 * the contract level (file content), not just at the rendered-DOM
 * level. Either a mobile or web reorder will FAIL this test and force
 * an ADR amendment.
 *
 * Mapping (mobile `name=` → web `label`):
 *
 *   index   → Home
 *   search  → Search
 *   compose → Compose
 *   profile → Profile
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/** Repo root resolved from the apps/web/__tests__ location. */
const REPO_ROOT = join(__dirname, '..', '..', '..', '..')

const MOBILE_TABS_PATH = join(REPO_ROOT, 'apps', 'mobile', 'app', '(tabs)', '_layout.tsx')
const WEB_NAV_PATH = join(REPO_ROOT, 'apps', 'web', 'src', 'components', 'PrimaryNav.tsx')

/**
 * Mobile-tab → web-label map. Keep in sync with `PRIMARY_NAV_ITEMS`
 * inside `PrimaryNav.tsx`. A reorder on either side breaks the test.
 */
const MOBILE_TO_WEB_LABEL: Record<string, string> = {
  index: 'Home',
  search: 'Search',
  compose: 'Compose',
  profile: 'Profile',
}

/**
 * Extracts the ordered list of `Tabs.Screen name="..."` values from
 * the mobile layout source. We use a global regex (not an AST) on
 * purpose — the test is the source of truth for ordering and stays
 * resilient to formatting changes that an AST walker would notice but
 * a contributor would not.
 */
const extractMobileTabOrder = (source: string): ReadonlyArray<string> => {
  const pattern = /<Tabs\.Screen\s+name=["']([^"']+)["']/g
  const out: string[] = []
  let match: RegExpExecArray | null = pattern.exec(source)
  while (match !== null) {
    out.push(match[1] ?? '')
    match = pattern.exec(source)
  }
  return out
}

/**
 * Extracts the ordered list of web tab labels from the literal
 * `PRIMARY_NAV_ITEMS` array declaration. We match `label: '…'` lines
 * inside the array so adding metadata fields (testId, badge, etc.)
 * doesn't break the parse.
 */
const extractWebTabOrder = (source: string): ReadonlyArray<string> => {
  const arrayMatch = source.match(/PRIMARY_NAV_ITEMS\s*=\s*\[([\s\S]*?)\]\s*as\s+const/u)
  if (!arrayMatch) return []
  const body = arrayMatch[1] ?? ''
  const pattern = /label:\s*['"]([^'"]+)['"]/g
  const out: string[] = []
  let match: RegExpExecArray | null = pattern.exec(body)
  while (match !== null) {
    out.push(match[1] ?? '')
    match = pattern.exec(body)
  }
  return out
}

describe('Web ↔ mobile tab-order parity (ADR-0019)', () => {
  it('mobile (tabs) layout declares the locked order', () => {
    const source = readFileSync(MOBILE_TABS_PATH, 'utf8')
    const mobileOrder = extractMobileTabOrder(source)
    expect(mobileOrder).toEqual(['index', 'search', 'compose', 'profile'])
  })

  it('web PrimaryNav declares the locked order', () => {
    const source = readFileSync(WEB_NAV_PATH, 'utf8')
    const webOrder = extractWebTabOrder(source)
    expect(webOrder).toEqual(['Home', 'Search', 'Compose', 'Profile'])
  })

  it('mobile + web tabs map 1:1 via MOBILE_TO_WEB_LABEL', () => {
    const mobileOrder = extractMobileTabOrder(readFileSync(MOBILE_TABS_PATH, 'utf8'))
    const webOrder = extractWebTabOrder(readFileSync(WEB_NAV_PATH, 'utf8'))

    expect(mobileOrder).toHaveLength(webOrder.length)

    const expectedWebFromMobile = mobileOrder.map((name) => {
      const mapped = MOBILE_TO_WEB_LABEL[name]
      if (!mapped) {
        throw new Error(
          `Mobile tab "${name}" has no web-label mapping in MOBILE_TO_WEB_LABEL. ` +
            `Add it here AND in apps/web/src/components/PrimaryNav.tsx (PRIMARY_NAV_ITEMS), ` +
            `or amend ADR-0019.`,
        )
      }
      return mapped
    })

    expect(webOrder).toEqual(expectedWebFromMobile)
  })
})
