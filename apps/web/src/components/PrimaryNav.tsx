'use client'

/**
 * Primary navigation — web parity for the mobile bottom-tab bar.
 *
 * ## Tab order (locked)
 *
 * Per ADR-0019 ("same bottom-tab order on iOS + Android, no FAB"), the
 * canonical mobile shell at `apps/mobile/app/(tabs)/_layout.tsx` declares:
 *
 *   1. Home    → `(tabs)/index`
 *   2. Search  → `(tabs)/search`
 *   3. Compose → `(tabs)/compose`
 *   4. Profile → `(tabs)/profile`
 *
 * The web app mirrors that order, link-for-link:
 *
 *   1. Home    → `/`
 *   2. Search  → `/discover`
 *   3. Compose → `/compose`
 *   4. Profile → `/profile`
 *
 * `apps/web/src/__tests__/web-mobile-tab-parity.test.ts` parses BOTH source
 * files and locks the ordering in CI so a future tab reorder on either
 * platform breaks the test loudly.
 *
 * ## Why a Client Component
 *
 * Active-link styling relies on `usePathname()`, which is a client hook.
 * The component itself is cheap (four `<Link>`s + a Tailwind class string)
 * so the hydration cost is negligible; the Server Component
 * `<RootLayout>` mounts a single instance once and the nav persists
 * across navigations via the App Router's persistent layout boundary.
 *
 * ## No FAB
 *
 * Compose is rendered as a NAV LINK, never a floating action button.
 * The parity test explicitly asserts the Compose target is an
 * `<a>`/link and there is no `role=button` overlay called "Compose" in
 * the rendered tree.
 *
 * ## Responsive layout
 *
 * - Small viewports (`< md`): bottom-anchored tab bar — mirrors the mobile
 *   shell's thumb-zone placement.
 * - Medium and up (`md+`): top horizontal nav — desktop-conventional.
 *
 * Both layouts emit the SAME DOM order, so the parity test (which only
 * checks order, not visual placement) passes on every viewport.
 *
 * ## Accessibility (ADR-0021, WCAG 2.2 AA)
 *
 * - `<nav aria-label="Primary">` wraps the link list so assistive tech
 *   distinguishes this nav from any sibling `<nav>` (e.g. admin sidebar).
 * - The active link carries `aria-current="page"` so screen readers
 *   announce the current location.
 * - Every link surfaces a visible focus ring (`focus-visible:ring-*`)
 *   that meets the 3:1 contrast ratio against the surrounding surface.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * The locked tab order. Each entry's `label` MUST match the
 * corresponding mobile `tabBarLabel` exactly so the parity test passes.
 *
 * Exported so the parity test can import it directly without re-parsing
 * this file's source — and so contributors editing this list see the
 * test file's import break in their editor before CI runs.
 */
export const PRIMARY_NAV_ITEMS = [
  { href: '/', label: 'Home', testId: 'primary-nav-home' },
  { href: '/discover', label: 'Search', testId: 'primary-nav-search' },
  { href: '/compose', label: 'Compose', testId: 'primary-nav-compose' },
  { href: '/profile', label: 'Profile', testId: 'primary-nav-profile' },
] as const

/**
 * Returns `true` when `pathname` resolves to the same primary-nav slot
 * as `href`. The Home tab matches `/` exactly; every other tab matches
 * its href as a prefix (so `/discover?q=foo` still highlights Search).
 */
const isActive = (href: string, pathname: string | null): boolean => {
  if (pathname === null) return false
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function PrimaryNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Primary"
      data-testid="primary-nav"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-divider bg-background md:static md:border-t-0 md:border-b"
    >
      <ul className="mx-auto flex max-w-3xl items-stretch justify-around md:justify-start md:gap-2 md:px-4 md:py-2">
        {PRIMARY_NAV_ITEMS.map((item) => {
          const active = isActive(item.href, pathname)
          return (
            <li key={item.href} className="flex-1 md:flex-none">
              <Link
                href={item.href}
                data-testid={item.testId}
                aria-current={active ? 'page' : undefined}
                className={[
                  'flex h-12 items-center justify-center rounded-md px-3 text-sm font-medium',
                  'transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground hover:bg-default-100 hover:text-foreground',
                ].join(' ')}
              >
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
