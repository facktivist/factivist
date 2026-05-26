import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { getMyProfileMock } = vi.hoisted(() => ({
  getMyProfileMock: vi.fn(),
}))

vi.mock('../../../lib/api/client.ts', async () => {
  const real = await vi.importActual<typeof import('../../../lib/api/client.ts')>(
    '../../../lib/api/client.ts',
  )
  return {
    ...real,
    apiClient: {
      ...real.apiClient,
      getMyProfile: (...args: unknown[]) => getMyProfileMock(...args),
    },
  }
})

import { MyProfileView, noopOpen } from '../MyProfileView.tsx'

const renderWithClient = (node: ReactNode) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>)
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('MyProfileView', () => {
  it('shows the loading state on first paint', () => {
    getMyProfileMock.mockReturnValue(new Promise(() => undefined))
    renderWithClient(<MyProfileView />)
    expect(screen.getByTestId('profile-loading')).toBeInTheDocument()
  })

  it('renders Profile.Handle + Profile.Stats once the query resolves', async () => {
    getMyProfileMock.mockResolvedValue({
      handle: 'anon_alpha',
      nullifierExcerpt: '0xabcdef01',
      stats: { complaintCount: 3, commentCount: 5, flagsReceived: 1 },
      joinedAt: '2026-05-26',
    })
    renderWithClient(<MyProfileView />)
    await waitFor(() => {
      expect(screen.getByTestId('profile-citizen')).toBeInTheDocument()
    })
    // Compound rendered the handle in the H1 + the empty-list hint.
    expect(screen.getAllByText(/anon_alpha/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('anon_alpha')
  })

  it('falls back to the anonymous CTA on 401', async () => {
    const { ApiError } = await import('../../../lib/api/client.ts')
    getMyProfileMock.mockRejectedValue(new ApiError('no_session', 401, null))
    renderWithClient(<MyProfileView />)
    await waitFor(() => {
      expect(screen.getByTestId('profile-anonymous')).toBeInTheDocument()
    })
    // Anonymity invariant: no nullifier / aadhaar text on this path.
    expect(screen.queryByTestId('profile-citizen')).toBeNull()
  })

  it('NEVER renders the full nullifier on either path', async () => {
    const fullNullifier = `0x${'a'.repeat(64)}`
    getMyProfileMock.mockResolvedValue({
      handle: 'anon_x',
      nullifierExcerpt: fullNullifier,
      stats: { complaintCount: 0, commentCount: 0, flagsReceived: 0 },
      joinedAt: '2026-05-26',
    })
    const { container } = renderWithClient(<MyProfileView />)
    await waitFor(() => {
      expect(screen.getByTestId('profile-citizen')).toBeInTheDocument()
    })
    // Compound + island clamp to 8 chars — the full 64-char value
    // never reaches the DOM.
    expect(container.innerHTML).not.toMatch(fullNullifier)
  })

  it('exports the noopOpen helper so the ComplaintList callback is testable', () => {
    expect(noopOpen('cmp_unused')).toBeUndefined()
  })
})
