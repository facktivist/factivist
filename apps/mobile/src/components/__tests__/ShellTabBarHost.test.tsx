import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ShellTabBarHost } from '../ShellTabBarHost.tsx'

/**
 * BottomTabBarProps in @react-navigation/bottom-tabs is broad and
 * mostly internal. We pass only the fields the host actually reads
 * and cast to satisfy the prop shape.
 */
// biome-ignore lint/suspicious/noExplicitAny: see comment above
const asAny = <T,>(value: T): any => value

const buildProps = (overrides: Partial<{ activeIndex: number }> = {}) => {
  const routes = [
    { key: 'home-1', name: 'index', params: undefined },
    { key: 'search-2', name: 'search', params: undefined },
    { key: 'compose-3', name: 'compose', params: undefined },
    { key: 'profile-4', name: 'profile', params: undefined },
  ]
  const descriptors = {
    'home-1': { options: { tabBarLabel: 'Home' } },
    'search-2': { options: { tabBarLabel: 'Search' } },
    'compose-3': { options: { tabBarLabel: 'Compose' } },
    'profile-4': { options: { tabBarLabel: 'Profile' } },
  }
  const navigate = vi.fn()
  const emit = vi.fn().mockReturnValue({ defaultPrevented: false })
  return {
    state: { routes, index: overrides.activeIndex ?? 0 },
    descriptors,
    navigation: { emit, navigate },
    insets: { top: 0, right: 0, bottom: 24, left: 0 },
  }
}

describe('ShellTabBarHost', () => {
  it('maps Expo Router tabs into the Shell.TabBar slot', () => {
    const props = buildProps()
    render(<ShellTabBarHost {...asAny(props)} />)
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Search')).toBeInTheDocument()
    expect(screen.getByText('Compose')).toBeInTheDocument()
    expect(screen.getByText('Profile')).toBeInTheDocument()
  })

  it('falls back to options.title when tabBarLabel is missing', () => {
    const props = buildProps()
    // biome-ignore lint/suspicious/noExplicitAny: test override
    ;(props.descriptors as any)['home-1'] = { options: { title: 'Browse' } }
    render(<ShellTabBarHost {...asAny(props)} />)
    expect(screen.getByText('Browse')).toBeInTheDocument()
  })

  it('falls back to the route name when neither label nor title is set', () => {
    const props = buildProps()
    // biome-ignore lint/suspicious/noExplicitAny: test override
    ;(props.descriptors as any)['home-1'] = { options: {} }
    render(<ShellTabBarHost {...asAny(props)} />)
    // Compound renders the label twice (icon glyph fallback + label text);
    // assert via accessibility label instead so we don't trip the
    // multiple-match guard.
    expect(screen.getByLabelText('index')).toBeInTheDocument()
  })

  it('calls navigation.navigate for the selected route when defaultPrevented is false', async () => {
    const { fireEvent } = await import('@testing-library/react')
    const props = buildProps()
    render(<ShellTabBarHost {...asAny(props)} />)
    fireEvent.click(screen.getByText('Search'))
    expect(props.navigation.emit).toHaveBeenCalled()
    expect(props.navigation.navigate).toHaveBeenCalledWith('search', undefined)
  })

  it('honours defaultPrevented and skips navigation', async () => {
    const { fireEvent } = await import('@testing-library/react')
    const props = buildProps()
    props.navigation.emit.mockReturnValue({ defaultPrevented: true })
    render(<ShellTabBarHost {...asAny(props)} />)
    fireEvent.click(screen.getByText('Profile'))
    expect(props.navigation.emit).toHaveBeenCalled()
    expect(props.navigation.navigate).not.toHaveBeenCalled()
  })
})
