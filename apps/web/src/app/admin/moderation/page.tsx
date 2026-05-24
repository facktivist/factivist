/**
 * Moderation queue page — Phase 5 Pipeline C.
 *
 * Server Component. Fetches the pending queue server-side; each row is
 * already sanitised through `queueItemSchema` at the API client boundary
 * (`apps/web/src/lib/api/client.ts#sanitiseQueueItem`) so anonymity
 * invariants (ADR-0010) are enforced *twice*: once by the API's explicit
 * SELECT column list, again here.
 *
 * The destructure below additionally pins the set of fields the UI is
 * allowed to render — a regression that adds `nullifier` to the API
 * response cannot leak into the markup because the destructure simply
 * does not bind it.
 */

import Link from 'next/link'

import { SlaCountdownBadge } from '../../../features/admin/SlaCountdownBadge.tsx'
import { apiClient } from '../../../lib/api/client.ts'
import { getServerSession } from '../../../lib/auth/server.ts'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Moderation queue — Factivist Admin',
}

export default async function ModerationQueuePage() {
  // Layout RBAC gate already redirected non-operators; `session` is
  // non-null here but TypeScript cannot prove that across the boundary.
  const session = await getServerSession()
  const token = session?.token ?? null

  const page = await apiClient.listModerationQueue(token, { cache: 'no-store' })

  return (
    <section aria-labelledby="queue-heading" className="flex flex-col gap-4">
      <header className="flex items-baseline justify-between">
        <h1 id="queue-heading" className="text-2xl font-semibold tracking-tight">
          Moderation queue
        </h1>
        <p className="text-sm text-muted-foreground" data-testid="queue-count">
          {page.items.length} pending
        </p>
      </header>

      {page.items.length === 0 ? (
        <p
          role="status"
          className="rounded-md border border-divider bg-default-50 p-6 text-sm text-muted-foreground"
          data-testid="queue-empty"
        >
          No pending cases. The queue is clear.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm" data-testid="queue-table">
            <caption className="sr-only">
              Pending moderation cases ordered by SLA deadline ascending.
            </caption>
            <thead className="bg-default-50 text-left text-xs uppercase tracking-wide">
              <tr>
                <th scope="col" className="px-3 py-2">
                  Case
                </th>
                <th scope="col" className="px-3 py-2">
                  Complaint
                </th>
                <th scope="col" className="px-3 py-2">
                  Reason
                </th>
                <th scope="col" className="px-3 py-2">
                  Target
                </th>
                <th scope="col" className="px-3 py-2">
                  SLA
                </th>
                <th scope="col" className="px-3 py-2">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {page.items.map((row) => {
                // Destructure ONLY the columns the UI is allowed to bind.
                // Anonymity invariant: a future API change that bolts on
                // `nullifier` cannot leak — this destructure never reads it.
                const { id, complaintSlug, reason, targetKind, slaDueAt } = row
                return (
                  <tr key={id} className="border-b border-divider" data-testid="queue-row">
                    <td className="px-3 py-2 font-mono text-xs">
                      <Link
                        href={`/admin/moderation/${encodeURIComponent(id)}`}
                        className="underline-offset-2 hover:underline"
                      >
                        {id}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      {/* Slug only — never an excerpt that could carry PII. */}
                      <Link
                        href={`/complaints/${encodeURIComponent(complaintSlug)}`}
                        className="font-mono text-xs underline-offset-2 hover:underline"
                      >
                        {complaintSlug}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{reason}</td>
                    <td className="px-3 py-2">{targetKind}</td>
                    <td className="px-3 py-2">
                      <SlaCountdownBadge slaDueAt={slaDueAt} />
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/moderation/${encodeURIComponent(id)}`}
                        className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
