/**
 * `<PrimaryNav />` — render + active-state + no-FAB invariants.
 *
 * The web nav mirrors the mobile bottom-tab order locked by
 * ADR-0019 (`Home → Search → Compose → Profile`). Tests here cover:
 *
 *   - DOM order matches the locked list.
 *   - `usePathname` drives `aria-current="page"` on the right link.
 *   - Compose is rendered as a LINK, never a floating button (no FAB).
 *   - The Home link only highlights on the literal `/` path (avoids
 *     accidentally swallowing every child route).
 */

import { render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const pathnameRef: { current: string | null } = { current: '/' }

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameRef.current,
}))

import { PRIMARY_NAV_ITEMS, PrimaryNav } from '../components/PrimaryNav.tsx'

beforeEach(() => {
  pathnameRef.current = '/'
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('PrimaryNav — structure', () => {
  it('renders exactly the four locked tabs in order', () => {
    render(<PrimaryNav />)
    const nav = screen.getByRole('navigation', { name: /primary/i })
    const links = within(nav).getAllByRole('link')
    expect(links).toHaveLength(4)
    expect(links.map((a) => a.textContent?.trim())).toEqual([
      'Home',
      'Search',
      'Compose',
      'Profile',
    ])
  })

  it('points each tab at the locked href', () => {
    render(<PrimaryNav />)
    expect(screen.getByTestId('primary-nav-home')).toHaveAttribute('href', '/')
    expect(screen.getByTestId('primary-nav-search')).toHaveAttribute('href', '/discover')
    expect(screen.getByTestId('primary-nav-compose')).toHaveAttribute('href', '/compose')
    expect(screen.getByTestId('primary-nav-profile')).toHaveAttribute('href', '/profile')
  })

  it('exposes the locked tab list for the parity test to import', () => {
    expect(PRIMARY_NAV_ITEMS.map((i) => i.label)).toEqual(['Home', 'Search', 'Compose', 'Profile'])
  })
})

describe('PrimaryNav — active state', () => {
  it('marks Home as current when pathname is "/"', () => {
    pathnameRef.current = '/'
    render(<PrimaryNav />)
    expect(screen.getByTestId('primary-nav-home')).toHaveAttribute('aria-current', 'page')
    expect(screen.getByTestId('primary-nav-search')).not.toHaveAttribute('aria-current')
  })

  it('marks Search as current when pathname is "/discover"', () => {
    pathnameRef.current = '/discover'
    render(<PrimaryNav />)
    expect(screen.getByTestId('primary-nav-search')).toHaveAttribute('aria-current', 'page')
    expect(screen.getByTestId('primary-nav-home')).not.toHaveAttribute('aria-current')
  })

  it('marks Search as current on a deep discover subpath', () => {
    pathnameRef.current = '/discover/some-slug'
    render(<PrimaryNav />)
    expect(screen.getByTestId('primary-nav-search')).toHaveAttribute('aria-current', 'page')
  })

  it('marks Compose as current when pathname is "/compose"', () => {
    pathnameRef.current = '/compose'
    render(<PrimaryNav />)
    expect(screen.getByTestId('primary-nav-compose')).toHaveAttribute('aria-current', 'page')
  })

  it('marks Profile as current when pathname is "/profile"', () => {
    pathnameRef.current = '/profile'
    render(<PrimaryNav />)
    expect(screen.getByTestId('primary-nav-profile')).toHaveAttribute('aria-current', 'page')
  })

  it('does NOT mark Home as current on a non-root path', () => {
    pathnameRef.current = '/discover'
    render(<PrimaryNav />)
    expect(screen.getByTestId('primary-nav-home')).not.toHaveAttribute('aria-current')
  })

  it('survives a null pathname without crashing or marking any tab current', () => {
    pathnameRef.current = null
    render(<PrimaryNav />)
    for (const item of PRIMARY_NAV_ITEMS) {
      expect(screen.getByTestId(item.testId)).not.toHaveAttribute('aria-current')
    }
  })
})

describe('PrimaryNav — no FAB invariant (ADR-0019)', () => {
  it('renders Compose as a link, not a floating button overlay', () => {
    render(<PrimaryNav />)
    const compose = screen.getByTestId('primary-nav-compose')
    // Anchor element (Link from next/link) — NEVER a <button>.
    expect(compose.tagName.toLowerCase()).toBe('a')
    // No role="button" element labelled "compose" exists in the nav tree.
    const nav = screen.getByRole('navigation', { name: /primary/i })
    expect(within(nav).queryByRole('button', { name: /compose/i })).toBeNull()
  })

  it('the nav itself is the only top-level primary nav landmark', () => {
    render(<PrimaryNav />)
    expect(screen.getAllByRole('navigation', { name: /primary/i })).toHaveLength(1)
  })
})

describe('PrimaryNav — a11y', () => {
  it('labels the nav landmark for assistive tech', () => {
    render(<PrimaryNav />)
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
  })

  it('every link carries a visible focus-ring utility class', () => {
    render(<PrimaryNav />)
    for (const item of PRIMARY_NAV_ITEMS) {
      const link = screen.getByTestId(item.testId)
      expect(link.className).toMatch(/focus-visible:ring/)
    }
  })
})
