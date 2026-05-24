import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

/**
 * ADR-0019 — same tab order both platforms, NO FAB.
 *
 * The mobile tab shell at `app/(tabs)/_layout.tsx` defines four tabs in
 * this order: Home → Search → Compose → Profile. This test asserts the
 * order via the expo-router `<Tabs>` factory call sequence so the contract
 * is enforced regardless of how the production renderer mounts them.
 *
 * NOTE: the test lives under src/__tests__/ because the Vitest include
 * glob src/star-star/__tests__/star-star/star.test.tsx does not pick up
 * files under app/. The asserted module is loaded by absolute path.
 */

const recordedTabs: { name: string; tabBarLabel?: string; title?: string }[] = []

vi.mock('expo-router', () => {
  // Mirror the contract — Tabs renders a wrapper, Tabs.Screen records the
  // name + options into a top-level array we assert against.
  const TabsRoot = ({ children }: { children?: ReactNode }) => (
    <div data-testid="tabs-root">{children}</div>
  )
  const TabsScreen = ({
    name,
    options,
  }: {
    name: string
    options?: { tabBarLabel?: string; title?: string }
  }) => {
    recordedTabs.push({ name, ...options })
    return <div data-testid={`tab-${name}`} />
  }
  return {
    Tabs: Object.assign(TabsRoot, { Screen: TabsScreen }),
  }
})

import TabsLayout from '../../app/(tabs)/_layout.tsx'

describe('mobile tabs layout (ADR-0019 parity)', () => {
  it('renders exactly four tabs', () => {
    recordedTabs.length = 0
    render(<TabsLayout />)
    expect(recordedTabs.length).toBe(4)
  })

  it('honours the locked order: Home → Search → Compose → Profile', () => {
    recordedTabs.length = 0
    render(<TabsLayout />)
    expect(recordedTabs.map((t) => t.name)).toEqual(['index', 'search', 'compose', 'profile'])
  })

  it('labels each tab as expected', () => {
    recordedTabs.length = 0
    render(<TabsLayout />)
    const byName = new Map(recordedTabs.map((t) => [t.name, t]))
    expect(byName.get('index')?.tabBarLabel).toBe('Home')
    expect(byName.get('search')?.tabBarLabel).toBe('Search')
    expect(byName.get('compose')?.tabBarLabel).toBe('Compose')
    expect(byName.get('profile')?.tabBarLabel).toBe('Profile')
  })

  it('does NOT register a floating action button slot (ADR-0019)', () => {
    recordedTabs.length = 0
    render(<TabsLayout />)
    const names = recordedTabs.map((t) => t.name)
    for (const banned of ['fab', 'floating', 'plus', 'add']) {
      expect(names).not.toContain(banned)
    }
  })

  it('mounts a tab DOM node for each registered screen', () => {
    recordedTabs.length = 0
    render(<TabsLayout />)
    expect(screen.getByTestId('tab-index')).toBeInTheDocument()
    expect(screen.getByTestId('tab-search')).toBeInTheDocument()
    expect(screen.getByTestId('tab-compose')).toBeInTheDocument()
    expect(screen.getByTestId('tab-profile')).toBeInTheDocument()
  })
})
