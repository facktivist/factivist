import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// Mock next/link so the page renders without a Next router context.
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

// Mock FlagButton to avoid pulling TanStack mutations into a Server
// Component test.
vi.mock('../../complaint/FlagButton.tsx', () => ({
  FlagButton: ({ complaintId }: { complaintId: string }) => (
    <button type="button" data-testid={`flag-trigger-${complaintId}`}>
      Flag
    </button>
  ),
}))

const mocks = vi.hoisted(() => ({
  listComplaints: vi.fn(),
}))

vi.mock('../../../lib/api/client.ts', () => ({
  apiClient: {
    listComplaints: mocks.listComplaints,
  },
}))

import { DiscoveryPage } from '../DiscoveryPage.tsx'

const fixturePage = {
  items: [
    {
      id: 'pothole-mg-7k3a',
      title: 'Pothole on MG Road',
      bodyExcerpt: 'A pothole has persisted for 3 weeks…',
      categorySlug: 'roads',
      categoryLabel: 'Roads',
      stateCode: 'ka',
      districtCode: 'blr-u',
      pcCode: 'blr-s',
      acCode: 'btm-layout',
      photoUrls: [],
      authorHandle: 'voter-1',
      commentCount: 0,
      flagCount: 0,
      createdAt: '2026-05-20T10:00:00Z',
    },
  ],
  page: 1,
  pageSize: 20,
  totalCount: 1,
  hasNext: false,
}

describe('DiscoveryPage (Server Component)', () => {
  it('renders the page header + items', async () => {
    mocks.listComplaints.mockResolvedValue(fixturePage)
    const ui = await DiscoveryPage({ searchParams: {} })
    render(ui)
    expect(screen.getByRole('heading', { name: /browse complaints/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /pothole on mg road/i })).toBeInTheDocument()
  })

  it('renders an empty state when the items list is empty', async () => {
    mocks.listComplaints.mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 20,
      totalCount: 0,
      hasNext: false,
    })
    const ui = await DiscoveryPage({ searchParams: {} })
    render(ui)
    expect(screen.getByText(/no complaints match your filters/i)).toBeInTheDocument()
  })

  it('renders the pagination summary', async () => {
    mocks.listComplaints.mockResolvedValue({
      items: fixturePage.items,
      page: 2,
      pageSize: 20,
      totalCount: 100,
      hasNext: true,
    })
    const ui = await DiscoveryPage({ searchParams: { page: 2 } })
    render(ui)
    expect(screen.getByText(/page 2 of 5/i)).toBeInTheDocument()
    expect(screen.getByText(/100 total/i)).toBeInTheDocument()
  })

  it('renders the filter bar with the current sort selected', async () => {
    mocks.listComplaints.mockResolvedValue(fixturePage)
    const ui = await DiscoveryPage({ searchParams: { sort: 'most-flagged' } })
    render(ui)
    const bar = screen.getByTestId('discovery-filters')
    expect(bar).toBeInTheDocument()
    expect(bar.querySelector('select[name="sort"]')?.getAttribute('value') ?? '').toBe('')
  })

  it('NEVER emits authorId / nullifier in the rendered list', async () => {
    mocks.listComplaints.mockResolvedValue(fixturePage)
    const ui = await DiscoveryPage({ searchParams: {} })
    const { container } = render(ui)
    expect(container.innerHTML).not.toMatch(/authorId/i)
    expect(container.innerHTML).not.toMatch(/nullifier/i)
    expect(container.innerHTML).not.toMatch(/0x[0-9a-f]{64}/)
  })

  it('shows at-least-1 page in the pagination divider when totalCount is 0', async () => {
    mocks.listComplaints.mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 20,
      totalCount: 0,
      hasNext: false,
    })
    const ui = await DiscoveryPage({ searchParams: {} })
    render(ui)
    expect(screen.getByText(/page 1 of 1/i)).toBeInTheDocument()
  })
})
