/**
 * Audit log table — Server Component.
 *
 * Renders an `audit_log` page. Columns:
 *
 *   - ts          ISO timestamp
 *   - actor       role-only (NOT name) — derived from the actor id
 *                 prefix. Per ADR-0010 the operator UI does not surface
 *                 the personal identity of the actor in the table; that
 *                 information is reachable via the dedicated profile
 *                 surface (out of scope for S1).
 *   - action      enum
 *   - targetKind  enum
 *   - targetId    opaque id
 *
 * Server-side pagination via URL query params (`page`, `pageSize`). The
 * containing page also accepts `from` / `to` date-range params; the
 * filter form is a plain HTML `<form method="get">` so it works without
 * JS and stays a pure RSC.
 *
 * The function is `async` so it can fetch inside the component; this is
 * still a Server Component (no client island).
 */

import type { ApiAuditLogEntry, ApiAuditLogPage } from '../../lib/api/client.ts'

/**
 * Best-effort role inference. Until the wave-2 Supabase decoder ships a
 * `role` column on `audit_log`, the role is derived heuristically from
 * the actor id prefix:
 *
 *   - `system.*`  → 'system'
 *   - `usr_*`     → 'admin'
 *   - anything else → 'operator'
 *
 * This is intentionally coarse — the goal is to NOT surface a personal
 * name in the audit table, not to enumerate the operator role space.
 */
const inferRole = (actor: string): string => {
  if (actor.startsWith('system.')) return 'system'
  if (actor.startsWith('usr_')) return 'admin'
  return 'operator'
}

export interface AuditLogTableProps {
  readonly page: ApiAuditLogPage
  /** Echoed back into the pagination links to preserve filters. */
  readonly basePath: string
  readonly searchParams: Readonly<Record<string, string | undefined>>
}

const buildHref = (
  basePath: string,
  searchParams: Readonly<Record<string, string | undefined>>,
  overrides: Readonly<Record<string, string | number | undefined>>,
): string => {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(searchParams)) {
    if (v !== undefined && v !== '') params.set(k, v)
  }
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined || v === '') {
      params.delete(k)
    } else {
      params.set(k, String(v))
    }
  }
  const query = params.toString()
  return query ? `${basePath}?${query}` : basePath
}

export function AuditLogTable({ page, basePath, searchParams }: AuditLogTableProps) {
  if (page.items.length === 0) {
    return (
      <p
        role="status"
        className="rounded-md border border-divider bg-default-50 p-6 text-sm text-muted-foreground"
        data-testid="audit-empty"
      >
        No audit entries in this window.
      </p>
    )
  }

  const prevHref = page.page > 1 ? buildHref(basePath, searchParams, { page: page.page - 1 }) : null
  const nextHref = page.hasNext ? buildHref(basePath, searchParams, { page: page.page + 1 }) : null

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm" data-testid="audit-table">
          <caption className="sr-only">Append-only operator audit log.</caption>
          <thead className="bg-default-50 text-left text-xs uppercase tracking-wide">
            <tr>
              <th scope="col" className="px-3 py-2">
                Timestamp
              </th>
              <th scope="col" className="px-3 py-2">
                Actor role
              </th>
              <th scope="col" className="px-3 py-2">
                Action
              </th>
              <th scope="col" className="px-3 py-2">
                Target kind
              </th>
              <th scope="col" className="px-3 py-2">
                Target id
              </th>
            </tr>
          </thead>
          <tbody>
            {page.items.map((row: ApiAuditLogEntry) => (
              <tr key={row.id} className="border-b border-divider" data-testid="audit-row">
                <td className="px-3 py-2 font-mono text-xs">{new Date(row.ts).toISOString()}</td>
                <td className="px-3 py-2">
                  <span
                    className="rounded-full bg-default-100 px-2 py-0.5 text-xs uppercase"
                    data-testid="audit-actor-role"
                  >
                    {inferRole(row.actor)}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono text-xs">{row.action}</td>
                <td className="px-3 py-2 font-mono text-xs">{row.targetKind}</td>
                <td className="px-3 py-2 font-mono text-xs">{row.targetId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <nav
        aria-label="Audit log pagination"
        className="flex items-center justify-between text-sm"
        data-testid="audit-pagination"
      >
        <span className="text-muted-foreground">
          Page {page.page} · {page.pageSize}/page
        </span>
        <div className="flex gap-3">
          {prevHref ? (
            <a href={prevHref} className="underline-offset-2 hover:underline" rel="prev">
              ← Previous
            </a>
          ) : (
            <span className="text-muted-foreground">← Previous</span>
          )}
          {nextHref ? (
            <a href={nextHref} className="underline-offset-2 hover:underline" rel="next">
              Next →
            </a>
          ) : (
            <span className="text-muted-foreground">Next →</span>
          )}
        </div>
      </nav>
    </div>
  )
}
