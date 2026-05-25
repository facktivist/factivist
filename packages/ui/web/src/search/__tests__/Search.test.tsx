import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { ComplaintSummary } from '../../complaint/Complaint.types.ts'
import { Search } from '../Search.tsx'

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

describe('Search.Bar', () => {
  it('renders the input with the controlled value', () => {
    render(<Search.Bar value="potholes" onChange={() => {}} onSubmit={() => {}} />)
    expect(screen.getByLabelText('Search complaints', { selector: 'input' })).toHaveValue(
      'potholes',
    )
  })

  it('emits onChange when typing', () => {
    const onChange = vi.fn()
    render(<Search.Bar value="" onChange={onChange} onSubmit={() => {}} />)
    fireEvent.change(screen.getByLabelText('Search complaints', { selector: 'input' }), {
      target: { value: 'water' },
    })
    expect(onChange).toHaveBeenCalledWith('water')
  })

  it('disables the Search button when value is whitespace-only', () => {
    render(<Search.Bar value="   " onChange={() => {}} onSubmit={() => {}} />)
    expect(screen.getByRole('button', { name: 'Search' })).toBeDisabled()
  })

  it('emits onSubmit with the trimmed query on form submit', () => {
    const onSubmit = vi.fn()
    render(<Search.Bar value="  hello  " onChange={() => {}} onSubmit={onSubmit} />)
    // role="search" is on a <search> landmark wrapping a form
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    expect(onSubmit).toHaveBeenCalledWith('hello')
  })

  it('shows a Clear (×) button only when value is non-empty + clears on click', () => {
    const onChange = vi.fn()
    const onSubmit = vi.fn()
    const { rerender } = render(<Search.Bar value="" onChange={onChange} onSubmit={onSubmit} />)
    expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull()
    rerender(<Search.Bar value="x" onChange={onChange} onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(onChange).toHaveBeenCalledWith('')
    expect(onSubmit).toHaveBeenCalledWith('')
  })
})

describe('Search.EmptyState', () => {
  it('shows the no-query hint when variant=no-query', () => {
    render(<Search.EmptyState variant="no-query" />)
    expect(screen.getByText(/Type something above/)).toBeInTheDocument()
  })

  it('shows the no-matches hint with the quoted query when supplied', () => {
    render(<Search.EmptyState variant="no-matches" query="frogs" />)
    expect(screen.getByText(/No matches/)).toBeInTheDocument()
    expect(screen.getByText('frogs')).toBeInTheDocument()
  })

  it('shows a generic no-matches hint when query is absent', () => {
    render(<Search.EmptyState variant="no-matches" />)
    expect(screen.getByText(/No matches/)).toBeInTheDocument()
  })
})

describe('Search.Results', () => {
  it('shows the no-query empty state when query is empty', () => {
    render(<Search.Results query="" results={[]} onItemOpen={() => {}} />)
    expect(screen.getByText(/Type something above/)).toBeInTheDocument()
  })

  it('shows the no-matches empty state when query is present but results are zero', () => {
    render(<Search.Results query="frogs" results={[]} onItemOpen={() => {}} />)
    expect(screen.getByText(/No matches/)).toBeInTheDocument()
  })

  it('renders one Complaint.Card per result', () => {
    render(<Search.Results query="pot" results={[summary]} onItemOpen={() => {}} />)
    expect(screen.getByRole('button', { name: summary.title })).toBeInTheDocument()
  })

  it('emits onItemOpen via the card title', () => {
    const onItemOpen = vi.fn()
    render(<Search.Results query="pot" results={[summary]} onItemOpen={onItemOpen} />)
    fireEvent.click(screen.getByRole('button', { name: summary.title }))
    expect(onItemOpen).toHaveBeenCalledWith(summary.id)
  })

  it('shows a Loading more spinner when loading=true with existing results', () => {
    render(<Search.Results query="pot" results={[summary]} loading onItemOpen={() => {}} />)
    expect(screen.getByLabelText('Loading more search results')).toBeInTheDocument()
  })
})

describe('Search compound', () => {
  it('exposes Bar, Results, EmptyState', () => {
    expect(typeof Search.Bar).toBe('function')
    expect(typeof Search.Results).toBe('function')
    expect(typeof Search.EmptyState).toBe('function')
  })
})
