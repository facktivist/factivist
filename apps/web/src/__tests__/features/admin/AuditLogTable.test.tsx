/**
 * AuditLogTable — Server Component unit tests.
 *
 * Render the pure component with synthetic pages and assert it never
 * surfaces a personal name (only a coarse inferred role badge).
 */

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AuditLogTable } from '../../../features/admin/AuditLogTable.tsx'
import type { ApiAuditLogPage } from '../../../lib/api/client.ts'

const makeEntry = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'al_1',
  actor: 'usr_admin',
  action: 'moderation.decide' as const,
  targetKind: 'moderation_case' as const,
  targetId: 'mq_1',
  payloadHash: '0'.repeat(64),
  rationale: null,
  ts: new Date('2026-05-23T12:00:00Z').toISOString(),
  ...over,
})

describe('<AuditLogTable />', () => {
  it('renders the empty state on an empty page', () => {
    const page: ApiAuditLogPage = { items: [], page: 1, pageSize: 50, hasNext: false }
    const { getByTestId } = render(
      <AuditLogTable page={page} basePath="/admin/audit" searchParams={{}} />,
    )
    expect(getByTestId('audit-empty')).toBeInTheDocument()
  })

  it('renders a row per item with timestamp + role badge', () => {
    const page: ApiAuditLogPage = {
      items: [makeEntry()],
      page: 1,
      pageSize: 50,
      hasNext: false,
    }
    const { getAllByTestId, getByTestId } = render(
      <AuditLogTable page={page} basePath="/admin/audit" searchParams={{}} />,
    )
    expect(getByTestId('audit-table')).toBeInTheDocument()
    expect(getAllByTestId('audit-row')).toHaveLength(1)
    expect(getAllByTestId('audit-actor-role')[0]?.textContent?.toLowerCase()).toBe('admin')
  })

  it('does NOT surface a personal actor id anywhere in the rendered table', () => {
    const page: ApiAuditLogPage = {
      items: [makeEntry({ actor: 'usr_personal_x' })],
      page: 1,
      pageSize: 50,
      hasNext: false,
    }
    const { getByTestId } = render(
      <AuditLogTable page={page} basePath="/admin/audit" searchParams={{}} />,
    )
    expect(getByTestId('audit-table').textContent).not.toContain('usr_personal_x')
  })

  it('renders pagination links honouring filters via querystring', () => {
    const page: ApiAuditLogPage = {
      items: [makeEntry()],
      page: 2,
      pageSize: 50,
      hasNext: true,
    }
    const { container } = render(
      <AuditLogTable
        page={page}
        basePath="/admin/audit"
        searchParams={{ from: '2026-05-01', to: '2026-05-23' }}
      />,
    )
    const prev = container.querySelector('a[rel="prev"]')
    const next = container.querySelector('a[rel="next"]')
    expect(prev?.getAttribute('href')).toContain('from=2026-05-01')
    expect(prev?.getAttribute('href')).toContain('page=1')
    expect(next?.getAttribute('href')).toContain('page=3')
  })

  it('disables prev on page=1, disables next when hasNext=false', () => {
    const page: ApiAuditLogPage = {
      items: [makeEntry()],
      page: 1,
      pageSize: 50,
      hasNext: false,
    }
    const { container } = render(
      <AuditLogTable page={page} basePath="/admin/audit" searchParams={{}} />,
    )
    expect(container.querySelector('a[rel="prev"]')).toBeNull()
    expect(container.querySelector('a[rel="next"]')).toBeNull()
  })

  it('renders an href without trailing `?` when no filters and on page 1 with next', () => {
    const page: ApiAuditLogPage = {
      items: [makeEntry()],
      page: 1,
      pageSize: 50,
      hasNext: true,
    }
    const { container } = render(
      <AuditLogTable page={page} basePath="/admin/audit" searchParams={{}} />,
    )
    const next = container.querySelector('a[rel="next"]')
    expect(next?.getAttribute('href')).toBe('/admin/audit?page=2')
  })

  it('drops empty-string overrides from the querystring (page=0/empty filter)', () => {
    const page: ApiAuditLogPage = {
      items: [makeEntry()],
      page: 2,
      pageSize: 50,
      hasNext: true,
    }
    const { container } = render(
      <AuditLogTable
        page={page}
        basePath="/admin/audit"
        searchParams={{ from: '', to: '2026-05-23' }}
      />,
    )
    const prev = container.querySelector('a[rel="prev"]')
    // empty `from` should be dropped from the querystring
    expect(prev?.getAttribute('href')).not.toContain('from=')
    expect(prev?.getAttribute('href')).toContain('to=2026-05-23')
  })
})
