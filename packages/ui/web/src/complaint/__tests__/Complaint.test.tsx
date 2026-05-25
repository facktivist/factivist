import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Complaint, formatComplaintDate, formatComplaintLocation } from '../Complaint.tsx'
import type { ComplaintSummary } from '../Complaint.types.ts'

const summary: ComplaintSummary = {
  id: 'cmp_1',
  title: 'Broken streetlight on MG Road',
  bodyExcerpt: 'Light has been out since last Tuesday',
  categoryId: 4,
  geo: { state: 'KA', district: 'BLR-Urban', constituency: 'shanthi-nagar' },
  photoUrls: [],
  createdAt: '2026-05-15T10:30:00.000Z',
  commentCount: 0,
  flagged: false,
}

describe('Complaint.Composer', () => {
  it('renders a form with the children slot + aria-label', () => {
    render(
      <Complaint.Composer onSubmit={() => {}}>
        <p>body</p>
      </Complaint.Composer>,
    )
    expect(screen.getByRole('form', { name: 'File a complaint' })).toBeInTheDocument()
    expect(screen.getByText('body')).toBeInTheDocument()
  })
})

describe('Complaint.PhotoTray', () => {
  it('shows the count and the + button when below maxPhotos', () => {
    render(<Complaint.PhotoTray photos={[]} onAdd={() => {}} onRemove={() => {}} />)
    expect(screen.getByText('Photos (0/3)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add photo' })).toBeInTheDocument()
  })

  it('hides the + button when at the cap', () => {
    render(
      <Complaint.PhotoTray
        photos={[
          { id: '1', url: 'u1', uploadState: 'uploaded' },
          { id: '2', url: 'u2', uploadState: 'uploaded' },
          { id: '3', url: 'u3', uploadState: 'uploaded' },
        ]}
        onAdd={() => {}}
        onRemove={() => {}}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Add photo' })).toBeNull()
  })

  it('emits onRemove with the photo id when × is clicked', () => {
    const onRemove = vi.fn()
    render(
      <Complaint.PhotoTray
        photos={[{ id: 'p1', url: 'u', uploadState: 'uploaded' }]}
        onAdd={() => {}}
        onRemove={onRemove}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Remove photo p1' }))
    expect(onRemove).toHaveBeenCalledWith('p1')
  })

  it('renders a progress bar when an item is uploading + has progress', () => {
    const { container } = render(
      <Complaint.PhotoTray
        photos={[{ id: 'p1', url: 'u', uploadState: 'uploading', progress: 0.4 }]}
        onAdd={() => {}}
        onRemove={() => {}}
      />,
    )
    // The progress div is aria-hidden, so we sample via the data-upload attr.
    expect(container.querySelector('[data-upload="uploading"]')).toBeInTheDocument()
  })

  it('tones the border red when an upload failed', () => {
    const { container } = render(
      <Complaint.PhotoTray
        photos={[{ id: 'p1', url: 'u', uploadState: 'failed' }]}
        onAdd={() => {}}
        onRemove={() => {}}
      />,
    )
    expect(container.querySelector('[data-upload="failed"]')).toBeInTheDocument()
  })
})

describe('Complaint.CategoryPicker', () => {
  const cats = [
    { id: 1, slug: 'roads', label: 'Roads' },
    { id: 2, slug: 'water', label: 'Water' },
  ]

  it('renders one radio input per category + marks the selected', () => {
    render(<Complaint.CategoryPicker categories={cats} selectedId={2} onChange={() => {}} />)
    expect(screen.getByRole('radio', { name: 'Roads' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'Water' })).toBeChecked()
  })

  it('emits onChange with the id when a radio is selected', () => {
    const onChange = vi.fn()
    render(<Complaint.CategoryPicker categories={cats} selectedId={null} onChange={onChange} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Roads' }))
    expect(onChange).toHaveBeenCalledWith(1)
  })
})

describe('Complaint.SubmitBar', () => {
  it('disables submit when canSubmit=false', () => {
    render(
      <Complaint.SubmitBar
        canSubmit={false}
        submitting={false}
        bodyLength={10}
        bodyLimit={500}
        onSubmit={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled()
  })

  it('disables submit + shows a spinner when submitting=true', () => {
    render(
      <Complaint.SubmitBar
        canSubmit
        submitting
        bodyLength={10}
        bodyLimit={500}
        onSubmit={() => {}}
      />,
    )
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('disables submit when over the body budget', () => {
    render(
      <Complaint.SubmitBar
        canSubmit
        submitting={false}
        bodyLength={600}
        bodyLimit={500}
        onSubmit={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled()
    expect(screen.getByText('600/500')).toBeInTheDocument()
  })

  it('emits onSubmit when the button is clicked', () => {
    const onSubmit = vi.fn()
    render(
      <Complaint.SubmitBar
        canSubmit
        submitting={false}
        bodyLength={10}
        bodyLimit={500}
        onSubmit={onSubmit}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('renders Save draft only when onSaveDraft is provided', () => {
    const onSaveDraft = vi.fn()
    const { rerender } = render(
      <Complaint.SubmitBar
        canSubmit
        submitting={false}
        bodyLength={10}
        bodyLimit={500}
        onSubmit={() => {}}
        onSaveDraft={onSaveDraft}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
    expect(onSaveDraft).toHaveBeenCalledOnce()
    rerender(
      <Complaint.SubmitBar
        canSubmit
        submitting={false}
        bodyLength={10}
        bodyLimit={500}
        onSubmit={() => {}}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Save draft' })).toBeNull()
  })
})

describe('Complaint.Card', () => {
  it('renders title, excerpt, geo, and date', () => {
    render(<Complaint.Card complaint={summary} onOpen={() => {}} />)
    expect(screen.getByRole('button', { name: summary.title })).toBeInTheDocument()
    expect(screen.getByText(summary.bodyExcerpt)).toBeInTheDocument()
    expect(screen.getByText(/KA \/ BLR-Urban/)).toBeInTheDocument()
  })

  it('emits onOpen when the title button is clicked', () => {
    const onOpen = vi.fn()
    render(<Complaint.Card complaint={summary} onOpen={onOpen} />)
    fireEvent.click(screen.getByRole('button', { name: summary.title }))
    expect(onOpen).toHaveBeenCalledWith(summary.id)
  })

  it('only renders the flag button when onFlag is supplied', () => {
    const onFlag = vi.fn()
    const { rerender } = render(<Complaint.Card complaint={summary} onOpen={() => {}} />)
    expect(screen.queryByRole('button', { name: `Flag ${summary.title}` })).toBeNull()
    rerender(<Complaint.Card complaint={summary} onOpen={() => {}} onFlag={onFlag} />)
    fireEvent.click(screen.getByRole('button', { name: `Flag ${summary.title}` }))
    expect(onFlag).toHaveBeenCalledWith(summary.id)
  })

  it('surfaces a "Flagged for review" pill when flagged=true', () => {
    render(<Complaint.Card complaint={{ ...summary, flagged: true }} onOpen={() => {}} />)
    expect(screen.getByText('Flagged for review')).toBeInTheDocument()
  })
})

describe('Complaint.List', () => {
  it('renders an empty hint when items are zero + not loading', () => {
    render(<Complaint.List items={[]} loading={false} onItemOpen={() => {}} />)
    expect(screen.getByText('No complaints yet.')).toBeInTheDocument()
  })

  it('honours a custom empty hint', () => {
    render(
      <Complaint.List
        items={[]}
        loading={false}
        emptyHint="Nothing here in your constituency yet."
        onItemOpen={() => {}}
      />,
    )
    expect(screen.getByText('Nothing here in your constituency yet.')).toBeInTheDocument()
  })

  it('renders one card per item', () => {
    render(
      <Complaint.List
        items={[summary, { ...summary, id: 'cmp_2', title: 'Second' }]}
        onItemOpen={() => {}}
      />,
    )
    // <ul role="list"> + <li role="listitem"> implicit
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('Second')).toBeInTheDocument()
  })

  it('emits onItemOpen via the inner card', () => {
    const onOpen = vi.fn()
    render(<Complaint.List items={[summary]} onItemOpen={onOpen} />)
    fireEvent.click(screen.getByRole('button', { name: summary.title }))
    expect(onOpen).toHaveBeenCalledWith(summary.id)
  })

  it('shows a loading spinner when loading=true and items already present', () => {
    render(<Complaint.List items={[summary]} loading onItemOpen={() => {}} />)
    expect(screen.getByLabelText('Loading more')).toBeInTheDocument()
  })

  it('renders Load more only when items exist + not loading + handler supplied', () => {
    const onLoadMore = vi.fn()
    const { rerender } = render(
      <Complaint.List items={[summary]} onItemOpen={() => {}} onLoadMore={onLoadMore} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }))
    expect(onLoadMore).toHaveBeenCalledOnce()
    rerender(
      <Complaint.List items={[summary]} loading onItemOpen={() => {}} onLoadMore={onLoadMore} />,
    )
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull()
  })
})

describe('helper formatters', () => {
  it('formatComplaintLocation joins state / district / constituency', () => {
    expect(formatComplaintLocation(summary.geo)).toBe('KA / BLR-Urban / shanthi-nagar')
  })

  it('formatComplaintDate produces a localised en-IN day-month-year string', () => {
    expect(formatComplaintDate(summary.createdAt)).toMatch(/2026/)
  })

  it('formatComplaintDate falls back to the first 10 chars when the input is unparseable', () => {
    // Date does not throw on garbage — it returns an Invalid Date.
    // The helper guards via getTime() NaN and returns the 10-char slice.
    expect(formatComplaintDate('not-a-date')).toBe('not-a-date')
    expect(formatComplaintDate('nonsense-string-here')).toBe('nonsense-s')
  })
})

describe('Complaint compound namespace', () => {
  it('exposes the six slots on the Complaint object', () => {
    expect(typeof Complaint.Composer).toBe('function')
    expect(typeof Complaint.PhotoTray).toBe('function')
    expect(typeof Complaint.CategoryPicker).toBe('function')
    expect(typeof Complaint.SubmitBar).toBe('function')
    expect(typeof Complaint.Card).toBe('function')
    expect(typeof Complaint.List).toBe('function')
  })
})
