import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('expo-router', () => ({
  router: { push: vi.fn(), replace: vi.fn(), back: vi.fn() },
}))

const mocks = vi.hoisted(() => ({
  listComplaints: vi.fn(),
}))

vi.mock('../../../lib/api/client.ts', () => ({
  apiClient: {
    listComplaints: mocks.listComplaints,
  },
}))

import { DiscoveryScreen } from '../DiscoveryScreen.tsx'

const fixturePage = {
  items: [
    {
      id: 'pothole-mg-7k3a',
      title: 'Pothole on MG Road',
      bodyExcerpt: 'A pothole has persisted…',
      categorySlug: 'roads',
      categoryLabel: 'Roads',
      stateCode: 'ka',
      districtCode: 'blr-u',
      pcCode: 'blr-s',
      acCode: 'btm-layout',
      photoUrls: [],
      authorHandle: 'voter-1',
      commentCount: 0,
      flagCount: 2,
      createdAt: '2026-05-20T10:00:00Z',
    },
  ],
  page: 1,
  pageSize: 20,
  totalCount: 1,
  hasNext: false,
}

const renderWithClient = (node: ReactNode) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>)
}

describe('DiscoveryScreen', () => {
  beforeEach(() => {
    mocks.listComplaints.mockReset()
  })

  it('shows the loading state', () => {
    mocks.listComplaints.mockReturnValue(new Promise(() => undefined))
    renderWithClient(<DiscoveryScreen />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
    expect(screen.getByTestId('discovery-screen')).toBeInTheDocument()
  })

  it('renders the items once the query resolves', async () => {
    mocks.listComplaints.mockResolvedValue(fixturePage)
    renderWithClient(<DiscoveryScreen />)
    await waitFor(() => {
      expect(screen.getByTestId('complaint-row-pothole-mg-7k3a')).toBeInTheDocument()
    })
  })

  it('renders an empty card when items.length === 0', async () => {
    mocks.listComplaints.mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 20,
      totalCount: 0,
      hasNext: false,
    })
    renderWithClient(<DiscoveryScreen />)
    await waitFor(() => {
      expect(screen.getByText(/no complaints match your filters/i)).toBeInTheDocument()
    })
  })

  it('surfaces an error alert when the query rejects', async () => {
    mocks.listComplaints.mockRejectedValue(new Error('Network down'))
    renderWithClient(<DiscoveryScreen />)
    await waitFor(() => {
      expect(screen.getByText(/network down/i)).toBeInTheDocument()
    })
  })

  it('renders flag count suffix when > 0', async () => {
    mocks.listComplaints.mockResolvedValue(fixturePage)
    renderWithClient(<DiscoveryScreen />)
    await waitFor(() => {
      expect(screen.getByText(/2 flags/i)).toBeInTheDocument()
    })
  })

  it('NEVER renders the raw nullifier in DOM', async () => {
    mocks.listComplaints.mockResolvedValue(fixturePage)
    const { container } = renderWithClient(<DiscoveryScreen />)
    await waitFor(() => {
      expect(container.innerHTML).not.toMatch(/0x[0-9a-f]{64}/)
      expect(container.innerHTML).not.toMatch(/nullifier/i)
    })
  })

  it('uses singular "comment" when commentCount === 1', async () => {
    mocks.listComplaints.mockResolvedValue({
      ...fixturePage,
      items: [{ ...fixturePage.items[0], commentCount: 1, flagCount: 0 }],
    })
    renderWithClient(<DiscoveryScreen />)
    await waitFor(() => {
      expect(screen.getByText(/1 comment(?!s)/i)).toBeInTheDocument()
    })
  })

  it('falls back to a generic message when error is not an Error instance', async () => {
    mocks.listComplaints.mockRejectedValue('a string, not an Error')
    renderWithClient(<DiscoveryScreen />)
    await waitFor(() => {
      expect(screen.getByText(/could not load complaints/i)).toBeInTheDocument()
    })
  })
})
