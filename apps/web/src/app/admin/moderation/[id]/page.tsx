/**
 * Moderation case detail — Phase 5 Pipeline C.
 *
 * Server Component. Resolves the case from the queue, then fetches the
 * linked complaint via the public discovery surface. The complaint shape
 * returned by `GET /complaints/:id` is already public-safe — it carries
 * no nullifier, no Aadhaar, only the published title/body/photos and an
 * opaque `authorHandle`.
 *
 * The decision form is a Client Component island; the server action is
 * bound here so the form never sees a client-mutable `caseId`.
 */

import { notFound } from 'next/navigation'
import { ModerationDecisionForm } from '../../../../features/admin/ModerationDecisionForm.tsx'
import { submitModerationDecision } from '../../../../features/admin/moderationActions.ts'
import { SlaCountdownBadge } from '../../../../features/admin/SlaCountdownBadge.tsx'
import type { ApiComplaint } from '../../../../lib/api/client.ts'
import { ApiError, apiClient } from '../../../../lib/api/client.ts'
import { getServerSession } from '../../../../lib/auth/server.ts'

export const dynamic = 'force-dynamic'

interface PageProps {
  readonly params: Promise<{ readonly id: string }>
}

const loadCase = async (
  id: string,
  token: string | null,
): Promise<{
  readonly item: Awaited<ReturnType<typeof apiClient.listModerationQueue>>['items'][number]
  readonly complaint: ApiComplaint | null
}> => {
  const page = await apiClient.listModerationQueue(token, { cache: 'no-store' })
  const item = page.items.find((row) => row.id === id)
  if (!item) {
    notFound()
  }

  let complaint: ApiComplaint | null = null
  try {
    complaint = await apiClient.getComplaint(item.complaintSlug, { cache: 'no-store' })
  } catch (err) {
    // The complaint may already be removed by a sibling decision; the
    // moderator still needs to see the case to decide. Swallow 404.
    if (err instanceof ApiError && err.status === 404) {
      complaint = null
    } else {
      throw err
    }
  }

  return { item, complaint }
}

export default async function ModerationCasePage({ params }: PageProps) {
  const { id } = await params
  const session = await getServerSession()
  const token = session?.token ?? null

  const { item, complaint } = await loadCase(id, token)

  // Bind the case id server-side so the client form can never spoof it.
  const boundAction = submitModerationDecision.bind(null, item.id)

  return (
    <article aria-labelledby="case-heading" className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 id="case-heading" className="text-2xl font-semibold tracking-tight">
            Case {item.id}
          </h1>
          <SlaCountdownBadge slaDueAt={item.slaDueAt} />
        </div>
        <dl className="grid gap-2 text-sm sm:grid-cols-2" data-testid="case-meta">
          <div>
            <dt className="text-muted-foreground">Reason</dt>
            <dd className="font-medium">{item.reason}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Target kind</dt>
            <dd className="font-medium">{item.targetKind}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd className="font-medium">{item.status}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">SLA due</dt>
            <dd className="font-medium">{new Date(item.slaDueAt).toISOString()}</dd>
          </div>
        </dl>
      </header>

      <section aria-labelledby="complaint-heading" className="flex flex-col gap-3">
        <h2 id="complaint-heading" className="text-lg font-semibold">
          Linked complaint
        </h2>
        {complaint === null ? (
          <p
            role="status"
            className="rounded-md border border-divider bg-default-50 p-4 text-sm text-muted-foreground"
            data-testid="complaint-missing"
          >
            The linked complaint <code>{item.complaintSlug}</code> is no longer retrievable. It may
            have been removed by a sibling decision. You can still apply a decision to close out
            this case.
          </p>
        ) : (
          <div className="rounded-md border border-divider p-4" data-testid="complaint-view">
            <h3 className="text-base font-semibold">{complaint.title}</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{complaint.body}</p>
            <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-3 text-muted-foreground">
              <div>
                <dt>Author</dt>
                <dd className="font-mono">{complaint.authorHandle}</dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{complaint.categoryLabel}</dd>
              </div>
              <div>
                <dt>Flags</dt>
                <dd>{complaint.flagCount}</dd>
              </div>
            </dl>
            {complaint.photoUrls.length > 0 ? (
              <ul
                className="mt-4 flex flex-wrap gap-2"
                aria-label="Attached photos"
                data-testid="complaint-photos"
              >
                {complaint.photoUrls.map((url) => (
                  <li key={url}>
                    {/*
                      Plain anchor — operator opens the asset in a new
                      tab. We deliberately do NOT render `<img>` inline
                      to keep PII content (faces, IDs) out of the
                      operator's default viewport unless they opt in.
                    */}
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary underline-offset-2 hover:underline"
                    >
                      Open photo
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
      </section>

      <section aria-labelledby="decision-heading" className="flex flex-col gap-3">
        <h2 id="decision-heading" className="text-lg font-semibold">
          Apply decision
        </h2>
        <ModerationDecisionForm caseId={item.id} action={boundAction} />
      </section>
    </article>
  )
}
