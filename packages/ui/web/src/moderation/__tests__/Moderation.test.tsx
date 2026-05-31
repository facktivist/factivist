import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Mod } from '../Moderation.tsx'
import type { ModAuditEntry, ModQueueItem } from '../Moderation.types.ts'

const item: ModQueueItem = {
  id: 'mq_1',
  target: { kind: 'complaint', id: 'cmp_99' },
  reason: 'spam',
  reportedAt: '2026-05-15T10:00:00.000Z',
  reporterCount: 2,
  excerpt: 'Buy our amazing offer',
}

describe('Mod.QueueList', () => {
  it('shows the empty hint when items=0 + not loading', () => {
    render(<Mod.QueueList items={[]} loading={false} onItemOpen={() => {}} />)
    expect(screen.getByText('Queue is empty.')).toBeInTheDocument()
  })

  it('renders one row per item with target id + reporter count', () => {
    render(<Mod.QueueList items={[item]} onItemOpen={() => {}} />)
    expect(screen.getByText(/Complaint · cmp_99/)).toBeInTheDocument()
    expect(screen.getByText('2 reports')).toBeInTheDocument()
    expect(screen.getByText('spam')).toBeInTheDocument()
  })

  it('shows "1 report" (singular) when reporterCount=1', () => {
    render(<Mod.QueueList items={[{ ...item, reporterCount: 1 }]} onItemOpen={() => {}} />)
    expect(screen.getByText('1 report')).toBeInTheDocument()
  })

  it('renders the reporter count in destructive tone when ≥3', () => {
    const { container } = render(
      <Mod.QueueList items={[{ ...item, reporterCount: 3 }]} onItemOpen={() => {}} />,
    )
    expect(container.querySelector('.bg-\\[var\\(--color-destructive\\)\\]')).toBeInTheDocument()
  })

  it('emits onItemOpen via the target row', () => {
    const onItemOpen = vi.fn()
    render(<Mod.QueueList items={[item]} onItemOpen={onItemOpen} />)
    fireEvent.click(screen.getByRole('button', { name: /Complaint · cmp_99/ }))
    expect(onItemOpen).toHaveBeenCalledWith(item.id)
  })

  it('shows a Loading more spinner when loading=true and items exist', () => {
    render(<Mod.QueueList items={[item]} loading onItemOpen={() => {}} />)
    expect(screen.getByLabelText('Loading more')).toBeInTheDocument()
  })
})

describe('Mod.DecisionBar', () => {
  it('renders the four decisions', () => {
    render(<Mod.DecisionBar itemId="mq_1" onDecide={() => {}} />)
    for (const label of ['Keep', 'Hide', 'Delete', 'Escalate']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('emits onDecide with itemId + decision + trimmed note', async () => {
    const onDecide = vi.fn()
    render(<Mod.DecisionBar itemId="mq_1" onDecide={onDecide} />)
    fireEvent.change(screen.getByLabelText('Moderation rationale'), {
      target: { value: '  spam-bot signature  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onDecide).toHaveBeenCalledWith({
      itemId: 'mq_1',
      decision: 'delete',
      note: 'spam-bot signature',
    })
  })

  it('omits note when the textarea is empty / whitespace-only', () => {
    const onDecide = vi.fn()
    render(<Mod.DecisionBar itemId="mq_1" onDecide={onDecide} />)
    fireEvent.click(screen.getByRole('button', { name: 'Keep' }))
    expect(onDecide).toHaveBeenCalledWith({ itemId: 'mq_1', decision: 'keep', note: undefined })
  })

  it('disables every button when submitting=true', () => {
    render(<Mod.DecisionBar itemId="mq_1" submitting onDecide={() => {}} />)
    for (const label of ['Keep', 'Hide', 'Delete', 'Escalate']) {
      expect(screen.getByRole('button', { name: label })).toBeDisabled()
    }
  })
})

describe('Mod.AuditTrail', () => {
  it('shows "No prior decisions." when entries are empty', () => {
    render(<Mod.AuditTrail entries={[]} />)
    expect(screen.getByText('No prior decisions.')).toBeInTheDocument()
  })

  it('renders each entry with moderator handle, decision, and note', () => {
    const entries: ModAuditEntry[] = [
      {
        id: 'ma_1',
        itemId: 'mq_1',
        decision: 'hide',
        moderatorHandle: 'mod-fox',
        note: 'borderline',
        at: '2026-05-15T10:00:00.000Z',
      },
      {
        id: 'ma_2',
        itemId: 'mq_1',
        decision: 'delete',
        moderatorHandle: 'mod-owl',
        at: '2026-05-16T10:00:00.000Z',
      },
    ]
    render(<Mod.AuditTrail entries={entries} />)
    expect(screen.getByText(/mod-fox · hide/)).toBeInTheDocument()
    expect(screen.getByText('borderline')).toBeInTheDocument()
    expect(screen.getByText(/mod-owl · delete/)).toBeInTheDocument()
  })
})

describe('Mod compound', () => {
  it('exposes QueueList, DecisionBar, AuditTrail', () => {
    expect(typeof Mod.QueueList).toBe('function')
    expect(typeof Mod.DecisionBar).toBe('function')
    expect(typeof Mod.AuditTrail).toBe('function')
  })
})
