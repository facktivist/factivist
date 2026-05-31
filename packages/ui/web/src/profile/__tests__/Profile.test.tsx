import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { ComplaintSummary } from '../../complaint/Complaint.types.ts'
import { Profile } from '../Profile.tsx'

const summary: ComplaintSummary = {
  id: 'cmp_1',
  title: 'Pothole on MG Road',
  bodyExcerpt: 'Eight inches deep',
  categoryId: 4,
  geo: { state: 'KA', district: 'BLR', constituency: 'shanti' },
  photoUrls: [],
  createdAt: '2026-05-15T10:00:00.000Z',
  commentCount: 0,
  flagged: false,
}

describe('Profile.Handle', () => {
  it('renders handle + the first 8 chars of nullifier only', () => {
    render(<Profile.Handle handle="anon-rabbit-9214" nullifierExcerpt="0x123456789abcdef" />)
    expect(screen.getByText('anon-rabbit-9214')).toBeInTheDocument()
    expect(screen.getByText('0x123456…')).toBeInTheDocument()
    expect(screen.queryByText(/9abcdef/)).toBeNull()
  })
})

describe('Profile.Stats', () => {
  it('renders the three count fields', () => {
    render(<Profile.Stats stats={{ complaintCount: 7, commentCount: 13, flagsReceived: 0 }} />)
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('13')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('renders flagsReceived in destructive tone when > 0', () => {
    const { container } = render(
      <Profile.Stats stats={{ complaintCount: 1, commentCount: 0, flagsReceived: 3 }} />,
    )
    const flags = container.querySelector('.text-\\[var\\(--color-destructive\\)\\]')
    expect(flags).toHaveTextContent('3')
  })
})

describe('Profile.ComplaintList', () => {
  it('shows an empty hint that names the handle', () => {
    render(
      <Profile.ComplaintList
        handle="anon-rabbit"
        items={[]}
        loading={false}
        onItemOpen={() => {}}
      />,
    )
    expect(screen.getByText(/anon-rabbit has not filed a complaint yet/)).toBeInTheDocument()
  })

  it('renders one card per item + emits onItemOpen', () => {
    const onItemOpen = vi.fn()
    render(<Profile.ComplaintList handle="anon-rabbit" items={[summary]} onItemOpen={onItemOpen} />)
    fireEvent.click(screen.getByRole('button', { name: summary.title }))
    expect(onItemOpen).toHaveBeenCalledWith(summary.id)
  })

  it('shows a Loading more spinner when loading=true with existing items', () => {
    render(<Profile.ComplaintList handle="anon" items={[summary]} loading onItemOpen={() => {}} />)
    expect(screen.getByLabelText('Loading more')).toBeInTheDocument()
  })
})

describe('Profile compound', () => {
  it('exposes Handle, Stats, ComplaintList', () => {
    expect(typeof Profile.Handle).toBe('function')
    expect(typeof Profile.Stats).toBe('function')
    expect(typeof Profile.ComplaintList).toBe('function')
  })
})
