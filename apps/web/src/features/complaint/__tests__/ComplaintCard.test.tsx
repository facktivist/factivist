import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// Mock next/link so the Card renders without a Next router context.
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

// Mock FlagButton — it brings @tanstack/react-query mutations that need
// a QueryClient context. We only want to assert the card surface here.
vi.mock('../FlagButton.tsx', () => ({
  FlagButton: ({ complaintId }: { complaintId: string }) => (
    <button type="button" data-testid={`flag-trigger-${complaintId}`}>
      Flag
    </button>
  ),
}))

import { ComplaintCard } from '../ComplaintCard.tsx'

const baseComplaint = {
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
  authorHandle: 'voter-7k3a',
  commentCount: 0,
  flagCount: 0,
  createdAt: '2026-05-20T10:00:00Z',
}

describe('ComplaintCard', () => {
  it('renders the title, body excerpt, and author handle', () => {
    render(<ComplaintCard complaint={baseComplaint} />)
    expect(screen.getByRole('heading', { name: /pothole on mg road/i })).toBeInTheDocument()
    expect(screen.getByText(baseComplaint.bodyExcerpt)).toBeInTheDocument()
    expect(screen.getByText(/voter-7k3a/i)).toBeInTheDocument()
  })

  it('NEVER renders the raw nullifier or authorId', () => {
    const { container } = render(<ComplaintCard complaint={baseComplaint} />)
    const html = container.innerHTML
    expect(html).not.toMatch(/nullifier/i)
    expect(html).not.toMatch(/authorId/i)
    expect(html).not.toMatch(/0x[0-9a-f]{64}/)
  })

  it('renders the deep-link to /complaints/:id', () => {
    render(<ComplaintCard complaint={baseComplaint} />)
    const link = screen.getByRole('link', { name: /pothole on mg road/i })
    expect(link).toHaveAttribute('href', `/complaints/${baseComplaint.id}`)
  })

  it('singularises "comment" when count is 1', () => {
    render(<ComplaintCard complaint={{ ...baseComplaint, commentCount: 1 }} />)
    expect(screen.getByText(/1 comment/)).toBeInTheDocument()
  })

  it('pluralises "comments" when count is 0 or > 1', () => {
    render(<ComplaintCard complaint={{ ...baseComplaint, commentCount: 0 }} />)
    expect(screen.getByText(/0 comments/)).toBeInTheDocument()
  })

  it('shows flag count when > 0', () => {
    render(<ComplaintCard complaint={{ ...baseComplaint, flagCount: 3 }} />)
    expect(screen.getByText(/3 flags/i)).toBeInTheDocument()
  })

  it('omits the flag block when flagCount is 0', () => {
    render(<ComplaintCard complaint={{ ...baseComplaint, flagCount: 0 }} />)
    expect(screen.queryByText(/0 flags/i)).not.toBeInTheDocument()
  })

  it('uppercases state and AC codes in metadata', () => {
    render(<ComplaintCard complaint={baseComplaint} />)
    expect(screen.getByText(/KA \/ BTM-LAYOUT/)).toBeInTheDocument()
  })

  it('renders a parseable <time> with the createdAt ISO string', () => {
    render(<ComplaintCard complaint={baseComplaint} />)
    const time = screen.getByText(/may/i, { selector: 'time' })
    expect(time).toHaveAttribute('datetime', baseComplaint.createdAt)
  })

  it('renders the FlagButton with the complaint id', () => {
    render(<ComplaintCard complaint={baseComplaint} />)
    expect(screen.getByTestId(`flag-trigger-${baseComplaint.id}`)).toBeInTheDocument()
  })
})
