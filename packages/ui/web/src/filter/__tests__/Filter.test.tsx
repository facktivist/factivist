import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { ConstituencyNode } from '../../complaint/Complaint.types.ts'
import { DEFAULT_SORT, Filter, isFilterActive, SORT_OPTIONS } from '../Filter.tsx'

const states: ConstituencyNode[] = [
  { code: 'KA', label: 'Karnataka', level: 'state' },
  { code: 'MH', label: 'Maharashtra', level: 'state' },
]

const districts: ConstituencyNode[] = [
  { code: 'KA-BLR', label: 'Bengaluru Urban', level: 'district' },
]

const constituencies: ConstituencyNode[] = [
  { code: 'KA-BLR-SHANTI', label: 'Shanthi Nagar', level: 'constituency' },
]

const loaderFor =
  (
    root: ConstituencyNode[] = states,
    byParent: Record<string, ConstituencyNode[]> = {
      KA: districts,
      'KA-BLR': constituencies,
    },
  ) =>
  async (parentCode: string | null) => {
    if (parentCode === null) return root
    return byParent[parentCode] ?? []
  }

describe('Filter.ConstituencyTree', () => {
  it('renders the root level after the initial load', async () => {
    render(<Filter.ConstituencyTree value={null} onChange={() => {}} loadChildren={loaderFor()} />)
    await waitFor(() => expect(screen.getByText('Karnataka')).toBeInTheDocument())
  })

  it('drills into the next level when a parent is picked', async () => {
    render(<Filter.ConstituencyTree value={null} onChange={() => {}} loadChildren={loaderFor()} />)
    await waitFor(() => screen.getByText('Karnataka'))
    fireEvent.click(screen.getByText('Karnataka'))
    await waitFor(() => expect(screen.getByText('Bengaluru Urban')).toBeInTheDocument())
  })

  it('emits onChange(constituencyCode) only when a leaf is picked', async () => {
    const onChange = vi.fn()
    render(<Filter.ConstituencyTree value={null} onChange={onChange} loadChildren={loaderFor()} />)
    await waitFor(() => screen.getByText('Karnataka'))
    fireEvent.click(screen.getByText('Karnataka'))
    expect(onChange).toHaveBeenLastCalledWith(null) // parent picks don't change the value
    await waitFor(() => screen.getByText('Bengaluru Urban'))
    fireEvent.click(screen.getByText('Bengaluru Urban'))
    expect(onChange).toHaveBeenLastCalledWith(null)
    await waitFor(() => screen.getByText('Shanthi Nagar'))
    fireEvent.click(screen.getByText('Shanthi Nagar'))
    expect(onChange).toHaveBeenLastCalledWith('KA-BLR-SHANTI')
  })

  it('renders the Clear button only when a value is set, and clears on click', async () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <Filter.ConstituencyTree value={null} onChange={onChange} loadChildren={loaderFor()} />,
    )
    await waitFor(() => screen.getByText('Karnataka'))
    expect(screen.queryByText('Clear constituency filter')).toBeNull()
    rerender(
      <Filter.ConstituencyTree
        value="KA-BLR-SHANTI"
        onChange={onChange}
        loadChildren={loaderFor()}
      />,
    )
    fireEvent.click(screen.getByText('Clear constituency filter'))
    expect(onChange).toHaveBeenLastCalledWith(null)
  })
})

describe('Filter.CategoryChips', () => {
  const cats = [
    { id: 1, slug: 'roads', label: 'Roads' },
    { id: 2, slug: 'water', label: 'Water' },
  ]

  it('renders a chip per category + an aria-pressed reflection', () => {
    render(<Filter.CategoryChips categories={cats} selectedIds={[1]} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Roads' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Water' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('toggles a category in/out of selectedIds', () => {
    const onChange = vi.fn()
    render(<Filter.CategoryChips categories={cats} selectedIds={[1]} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Water' }))
    expect(onChange).toHaveBeenCalledWith([1, 2])
    fireEvent.click(screen.getByRole('button', { name: 'Roads' }))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('Clear button appears only when at least one is selected', () => {
    const { rerender } = render(
      <Filter.CategoryChips categories={cats} selectedIds={[]} onChange={() => {}} />,
    )
    expect(screen.queryByRole('button', { name: /Clear all category filters/ })).toBeNull()
    rerender(<Filter.CategoryChips categories={cats} selectedIds={[1, 2]} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: /Clear all category filters/ })).toHaveTextContent(
      'Clear (2)',
    )
  })

  it('Clear button emits onChange([])', () => {
    const onChange = vi.fn()
    render(<Filter.CategoryChips categories={cats} selectedIds={[1]} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /Clear all category filters/ }))
    expect(onChange).toHaveBeenCalledWith([])
  })
})

describe('Filter.SortToggle', () => {
  it('marks the active sort + emits onChange', () => {
    const onChange = vi.fn()
    render(<Filter.SortToggle value="newest" onChange={onChange} />)
    expect(screen.getByRole('radio', { name: 'Newest' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Most commented' })).not.toBeChecked()
    fireEvent.click(screen.getByRole('radio', { name: 'Most commented' }))
    expect(onChange).toHaveBeenCalledWith('most-commented')
  })
})

describe('helpers', () => {
  it('DEFAULT_SORT is newest', () => {
    expect(DEFAULT_SORT).toBe('newest')
  })

  it('SORT_OPTIONS covers exactly the three ComplaintSort variants', () => {
    expect(SORT_OPTIONS.map((o) => o.value)).toEqual(['newest', 'most-commented', 'most-flagged'])
  })

  it('isFilterActive returns true when any axis is non-default', () => {
    expect(isFilterActive(null, [], 'newest')).toBe(false)
    expect(isFilterActive('KA', [], 'newest')).toBe(true)
    expect(isFilterActive(null, [1], 'newest')).toBe(true)
    expect(isFilterActive(null, [], 'most-flagged')).toBe(true)
  })
})

describe('Filter compound', () => {
  it('exposes ConstituencyTree, CategoryChips, SortToggle', () => {
    expect(typeof Filter.ConstituencyTree).toBe('function')
    expect(typeof Filter.CategoryChips).toBe('function')
    expect(typeof Filter.SortToggle).toBe('function')
  })
})
