/**
 * Grievance inbox — Server Component.
 *
 * Lists open grievances ordered by SLA deadline ascending. Each row
 * carries an SLA countdown badge — the window itself is set server-side
 * by `computeSlaDueAt()` per the reason class (ADR-0014 / ADR-0020):
 *
 *   - ncii        → 24h
 *   - pii-leak    → 24h
 *   - defamation  → 24h
 *   - communal    → 24h
 *   - all others  → 36h
 *
 * The inbox does NOT expose complainant name / email — those land in
 * the audit row's rationale, reachable only via the audit surface.
 */

import type { ApiGrievanceSummary } from '../../lib/api/client.ts'

import { SlaCountdownBadge } from './SlaCountdownBadge.tsx'

export interface GrievanceInboxProps {
  readonly items: ReadonlyArray<ApiGrievanceSummary>
}

export function GrievanceInbox({ items }: GrievanceInboxProps) {
  if (items.length === 0) {
    return (
      <p
        role="status"
        className="rounded-md border border-divider bg-default-50 p-6 text-sm text-muted-foreground"
        data-testid="grievance-empty"
      >
        No open grievances. The inbox is clear.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm" data-testid="grievance-table">
        <caption className="sr-only">Open grievances ordered by SLA deadline.</caption>
        <thead className="bg-default-50 text-left text-xs uppercase tracking-wide">
          <tr>
            <th scope="col" className="px-3 py-2">
              Grievance
            </th>
            <th scope="col" className="px-3 py-2">
              Complaint
            </th>
            <th scope="col" className="px-3 py-2">
              Reason
            </th>
            <th scope="col" className="px-3 py-2">
              Status
            </th>
            <th scope="col" className="px-3 py-2">
              SLA
            </th>
            <th scope="col" className="px-3 py-2">
              Received
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id} className="border-b border-divider" data-testid="grievance-row">
              <td className="px-3 py-2 font-mono text-xs">{row.id}</td>
              <td className="px-3 py-2 font-mono text-xs">{row.complaintSlug}</td>
              <td className="px-3 py-2">{row.reason}</td>
              <td className="px-3 py-2">{row.status}</td>
              <td className="px-3 py-2">
                <SlaCountdownBadge slaDueAt={row.slaDueAt} />
              </td>
              <td className="px-3 py-2 font-mono text-xs">
                {new Date(row.createdAt).toISOString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
