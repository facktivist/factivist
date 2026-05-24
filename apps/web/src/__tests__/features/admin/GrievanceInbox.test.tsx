/**
 * GrievanceInbox — Server Component unit tests.
 */

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { GrievanceInbox } from '../../../features/admin/GrievanceInbox.tsx'
import type { ApiGrievanceSummary } from '../../../lib/api/client.ts'

const makeRow = (over: Partial<ApiGrievanceSummary> = {}): ApiGrievanceSummary => ({
  id: 'mq_g1',
  complaintSlug: 'pothole-on-mg-road',
  reason: 'ncii',
  status: 'pending',
  slaDueAt: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(),
  createdAt: new Date('2026-05-23T12:00:00Z').toISOString(),
  ...over,
})

describe('<GrievanceInbox />', () => {
  it('renders the empty state when there are no items', () => {
    const { getByTestId } = render(<GrievanceInbox items={[]} />)
    expect(getByTestId('grievance-empty')).toBeInTheDocument()
  })

  it('renders the table with one row per item + SLA badge', () => {
    const items = [makeRow(), makeRow({ id: 'mq_g2', reason: 'other' })]
    const { getAllByTestId, getByTestId } = render(<GrievanceInbox items={items} />)
    expect(getByTestId('grievance-table')).toBeInTheDocument()
    expect(getAllByTestId('grievance-row')).toHaveLength(2)
    expect(getAllByTestId('sla-countdown-badge')).toHaveLength(2)
  })

  it('does NOT render complainant name / email in the row', () => {
    const items = [
      {
        ...makeRow(),
        // Cast through unknown to plant the forbidden fields; the
        // component must NOT bind them into the DOM.
        ...({
          complainantName: 'A. Journalist',
          complainantEmail: 'journo@example.com',
        } as unknown as Record<string, unknown>),
      },
    ]
    const { container } = render(<GrievanceInbox items={items as ApiGrievanceSummary[]} />)
    expect(container.innerHTML).not.toContain('A. Journalist')
    expect(container.innerHTML).not.toContain('journo@example.com')
  })

  it('renders the createdAt as an ISO string', () => {
    const items = [makeRow({ createdAt: '2026-05-23T12:00:00.000Z' })]
    const { container } = render(<GrievanceInbox items={items} />)
    expect(container.textContent).toContain('2026-05-23T12:00:00.000Z')
  })
})
