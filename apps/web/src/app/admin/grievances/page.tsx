/**
 * Grievance inbox page — Phase 5 Pipeline C.
 *
 * Server Component. `GET /admin/grievances` shipped in wave 3 (see
 * `apps/api/src/routes/admin/grievances.ts`). 401 remains a graceful
 * warning so an admin without a valid session sees a stable message;
 * other errors surface a generic banner. The wave-2 "not yet live"
 * 404 degradation path is gone — a 404 now indicates a routing
 * regression and is treated as any other error.
 */

import { GrievanceInbox } from '../../../features/admin/GrievanceInbox.tsx'
import type { ApiGrievancePage } from '../../../lib/api/client.ts'
import { ApiError, apiClient } from '../../../lib/api/client.ts'
import { getServerSession } from '../../../lib/auth/server.ts'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Grievances — Factivist Admin',
}

const emptyPage: ApiGrievancePage = { items: [] }

export default async function GrievancesPage() {
  const session = await getServerSession()
  const token = session?.token ?? null

  let page: ApiGrievancePage = emptyPage
  let warning: string | null = null
  try {
    page = await apiClient.listGrievances(token, { cache: 'no-store' })
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      warning = 'You are not authorised to view the grievance inbox.'
    } else {
      warning = err instanceof Error ? err.message : 'Unexpected error loading the grievance inbox.'
    }
  }

  return (
    <section aria-labelledby="grievance-heading" className="flex flex-col gap-4">
      <header className="flex items-baseline justify-between">
        <h1 id="grievance-heading" className="text-2xl font-semibold tracking-tight">
          Grievance inbox
        </h1>
        <p className="text-sm text-muted-foreground" data-testid="grievance-count">
          {page.items.length} open
        </p>
      </header>

      {warning ? (
        <p
          role="status"
          className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm"
          data-testid="grievance-warning"
        >
          {warning}
        </p>
      ) : null}

      <GrievanceInbox items={page.items} />
    </section>
  )
}
