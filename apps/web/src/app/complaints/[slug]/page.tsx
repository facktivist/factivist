/**
 * `/complaints/[slug]` — Surface 3 (Complaint detail), web.
 *
 * Server Component that fetches the complaint + the published comments
 * up-front, then hands the client-island `<ComplaintDetailView>` the
 * pre-loaded TanStack initial data so the page is rendered server-side
 * (good for crawlers + cold-start latency) and hydrates without a
 * second fetch.
 *
 * Mirrors `apps/mobile/app/complaint/[id].tsx`. The two screens fan out
 * the same compound:
 *
 *   `Complaint.PhotoGallery` — photo strip + lightbox (lightbox is a
 *                              future-wave concern; the gallery is
 *                              already render-ready).
 *   `Complaint.FlagAction`   — flag-for-moderation control with a
 *                              fixed reason enum (no LLM mod in S1).
 *   `Comment.Thread`         — threaded comments + reply composer.
 *
 * The 404 path: a non-existent or unpublished complaint surfaces the
 * same not-found copy regardless. The API returns 404 for either case
 * (`apps/api/src/routes/complaint.ts`), so the page-level error UI is
 * intentionally indistinguishable from the unpublished-slug case (probe
 * defence — no enumeration of moderation state).
 */
import { notFound } from 'next/navigation'

import { ApiError, apiClient } from '../../../lib/api/client.ts'

import { ComplaintDetailView } from './ComplaintDetailView.tsx'

interface PageProps {
  readonly params: Promise<{ slug: string }>
}

export default async function ComplaintDetailPage({ params }: PageProps) {
  const { slug } = await params
  if (!slug) notFound()

  try {
    const [complaint, commentsResponse] = await Promise.all([
      apiClient.getComplaint(slug),
      apiClient.listComments(slug),
    ])
    return (
      <main id="main" className="mx-auto max-w-3xl px-4 py-8" data-testid="complaint-detail-page">
        <ComplaintDetailView complaint={complaint} initialComments={commentsResponse.items} />
      </main>
    )
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound()
    }
    // Surface a generic error — the client island handles transient
    // failures on its own retries, so the only path here is a real
    // outage. Throw so the App Router error boundary takes over.
    throw err
  }
}
