import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { pushMock, getMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  getMock: vi.fn().mockReturnValue(''),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => ({ toString: getMock }),
}))

const { listCategoriesMock } = vi.hoisted(() => ({
  listCategoriesMock: vi.fn(async () => [
    { slug: 'roads', label: 'Roads' },
    { slug: 'health', label: 'Health' },
  ]),
}))

vi.mock('../../../lib/api/client.ts', () => ({
  apiClient: {
    listCategories: listCategoriesMock,
  },
}))

import { DiscoveryFiltersClient } from '../DiscoveryFiltersClient.tsx'

const renderWithClient = (node: ReactNode) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>)
}

beforeEach(() => {
  pushMock.mockClear()
  getMock.mockReturnValue('')
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('DiscoveryFiltersClient', () => {
  it('renders the Filter.SortToggle slot with the current sort selected', () => {
    renderWithClient(<DiscoveryFiltersClient filters={{ sort: 'newest' }} />)
    // SortToggle renders the three labels — assert "Newest" shows up.
    expect(screen.getByText(/newest/i)).toBeInTheDocument()
  })

  it('renders the Filter.CategoryChips slot with the loaded categories', async () => {
    renderWithClient(<DiscoveryFiltersClient filters={{}} />)
    await waitFor(() => {
      expect(screen.getByText(/^roads$/i)).toBeInTheDocument()
      expect(screen.getByText(/^health$/i)).toBeInTheDocument()
    })
  })

  it('pushes a new URL when the user picks a different sort', async () => {
    const user = userEvent.setup()
    renderWithClient(<DiscoveryFiltersClient filters={{ sort: 'newest' }} />)
    await user.click(screen.getByText(/most commented/i))
    await waitFor(() => expect(pushMock).toHaveBeenCalled())
    const url = pushMock.mock.calls[0]?.[0] as string
    expect(url).toContain('sort=most-commented')
  })

  it('pushes a new URL with the chosen category slug', async () => {
    const user = userEvent.setup()
    renderWithClient(<DiscoveryFiltersClient filters={{}} />)
    const roadsChip = await screen.findByText(/^roads$/i)
    await user.click(roadsChip)
    await waitFor(() => expect(pushMock).toHaveBeenCalled())
    const url = pushMock.mock.calls[0]?.[0] as string
    expect(url).toContain('category=roads')
  })

  it('drops the category param when no chip is selected', async () => {
    const user = userEvent.setup()
    renderWithClient(<DiscoveryFiltersClient filters={{ categorySlug: 'roads' }} />)
    // Re-clicking the already-selected chip toggles it off in
    // Filter.CategoryChips → selectedIds becomes empty.
    const roadsChip = await screen.findByText(/^roads$/i)
    await user.click(roadsChip)
    await waitFor(() => expect(pushMock).toHaveBeenCalled())
    const url = pushMock.mock.calls[0]?.[0] as string
    // No `category=` segment in the pushed URL.
    expect(url).not.toMatch(/category=/)
  })
})
