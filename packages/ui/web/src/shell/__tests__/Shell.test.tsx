import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Shell } from '../Shell.tsx'

describe('Shell.TabBar', () => {
  const items = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'browse', label: 'Browse', icon: '🔎' },
    { id: 'me', label: 'Me', icon: '👤', badge: 0 },
    { id: 'alerts', label: 'Alerts', icon: '🔔', badge: 3 },
  ]

  it('renders one tab per item + marks the active', () => {
    render(<Shell.TabBar items={items} activeId="browse" onSelect={() => {}} />)
    expect(screen.getByRole('tab', { name: /Browse/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /Home/ })).toHaveAttribute('aria-selected', 'false')
  })

  it('renders a dot badge for badge=0 and a numeric badge for badge>0', () => {
    render(<Shell.TabBar items={items} activeId="home" onSelect={() => {}} />)
    expect(screen.getByLabelText('new')).toBeInTheDocument()
    expect(screen.getByLabelText('3 unread')).toHaveTextContent('3')
  })

  it('emits onSelect with the id when a tab is clicked', () => {
    const onSelect = vi.fn()
    render(<Shell.TabBar items={items} activeId="home" onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('tab', { name: /Browse/ }))
    expect(onSelect).toHaveBeenCalledWith('browse')
  })
})

describe('Shell.OfflineBanner', () => {
  it('renders the offline message for mode=offline', () => {
    render(<Shell.OfflineBanner mode="offline" />)
    expect(screen.getByText(/You are offline/)).toBeInTheDocument()
  })

  it('renders the cached-read-only message + a Retry button when handler supplied', () => {
    const onRetry = vi.fn()
    render(<Shell.OfflineBanner mode="cached-read-only" onRetry={onRetry} />)
    expect(screen.getByText(/Network unavailable/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('omits Retry when onRetry is undefined', () => {
    render(<Shell.OfflineBanner mode="offline" />)
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull()
  })
})

describe('Shell.SkeletonRow', () => {
  it('defaults to 2 lines, no avatar, no thumbnail', () => {
    const { container } = render(<Shell.SkeletonRow />)
    expect(container.querySelectorAll('.h-3.rounded-full')).toHaveLength(2)
  })

  it('honours the lines prop (1 / 2 / 3)', () => {
    const { container, rerender } = render(<Shell.SkeletonRow lines={1} />)
    expect(container.querySelectorAll('.h-3.rounded-full')).toHaveLength(1)
    rerender(<Shell.SkeletonRow lines={3} />)
    expect(container.querySelectorAll('.h-3.rounded-full')).toHaveLength(3)
  })

  it('renders an avatar placeholder when withAvatar=true', () => {
    const { container } = render(<Shell.SkeletonRow withAvatar />)
    expect(container.querySelector('.w-10.h-10.rounded-full')).toBeInTheDocument()
  })

  it('renders a thumbnail placeholder when withThumbnail=true', () => {
    const { container } = render(<Shell.SkeletonRow withThumbnail />)
    expect(container.querySelector('.w-16.h-16.rounded-md')).toBeInTheDocument()
  })
})

describe('Shell compound', () => {
  it('exposes TabBar, OfflineBanner, SkeletonRow', () => {
    expect(typeof Shell.TabBar).toBe('function')
    expect(typeof Shell.OfflineBanner).toBe('function')
    expect(typeof Shell.SkeletonRow).toBe('function')
  })
})
