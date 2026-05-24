/**
 * Audit log page — Phase 5 Pipeline C.
 *
 * Server Component. Renders the append-only audit log with a date-range
 * filter (plain HTML `<form method="get">` so it works without JS).
 *
 * The backing `GET /admin/audit-log` endpoint is on the wave-2 roadmap;
 * a 404 from the API resolves into an empty page rather than an
 * exception so operators can navigate the shell before the endpoint is
 * live.
 */

import { AuditLogTable } from '../../../features/admin/AuditLogTable.tsx'
import type { ApiAuditLogPage } from '../../../lib/api/client.ts'
import { ApiError, apiClient } from '../../../lib/api/client.ts'
import { getServerSession } from '../../../lib/auth/server.ts'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Audit log — Factivist Admin',
}

interface PageProps {
  readonly searchParams: Promise<Readonly<Record<string, string | undefined>>>
}

const DEFAULT_PAGE_SIZE = 50 as const

const emptyPage: ApiAuditLogPage = {
  items: [],
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  hasNext: false,
}

const parsePageNumber = (raw: string | undefined): number => {
  if (!raw) return 1
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n >= 1 ? n : 1
}

export default async function AuditPage({ searchParams }: PageProps) {
  const session = await getServerSession()
  const params = await searchParams
  const token = session?.token ?? null

  let result: ApiAuditLogPage = emptyPage
  let warning: string | null = null
  try {
    result = await apiClient.listAuditLog(
      token,
      {
        from: params.from,
        to: params.to,
        page: parsePageNumber(params.page),
        pageSize: DEFAULT_PAGE_SIZE,
      },
      { cache: 'no-store' },
    )
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      // Endpoint not yet shipped — degrade gracefully.
      warning = 'Audit log endpoint is not yet live in this environment.'
    } else if (err instanceof ApiError && err.status === 401) {
      warning = 'You are not authorised to view the audit log.'
    } else {
      warning = err instanceof Error ? err.message : 'Unexpected error loading the audit log.'
    }
  }

  return (
    <section aria-labelledby="audit-heading" className="flex flex-col gap-4">
      <header className="flex items-baseline justify-between">
        <h1 id="audit-heading" className="text-2xl font-semibold tracking-tight">
          Audit log
        </h1>
      </header>

      <form
        method="get"
        action="/admin/audit"
        className="flex flex-wrap items-end gap-3 rounded-md border border-divider p-3"
        aria-label="Filter audit log"
        data-testid="audit-filter-form"
      >
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">From</span>
          <input
            type="date"
            name="from"
            defaultValue={params.from ?? ''}
            className="rounded-md border bg-background px-2 py-1 text-sm"
            data-testid="audit-from"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">To</span>
          <input
            type="date"
            name="to"
            defaultValue={params.to ?? ''}
            className="rounded-md border bg-background px-2 py-1 text-sm"
            data-testid="audit-to"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
          data-testid="audit-filter-submit"
        >
          Apply
        </button>
      </form>

      {warning ? (
        <p
          role="status"
          className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm"
          data-testid="audit-warning"
        >
          {warning}
        </p>
      ) : null}

      <AuditLogTable page={result} basePath="/admin/audit" searchParams={params} />
    </section>
  )
}
