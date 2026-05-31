import { Card } from '@factivist/ui-web/components'
import Link from 'next/link'

import type { ApiComplaintSummary } from '../../lib/api/client.ts'
import { FlagButton } from './FlagButton.tsx'

/**
 * Browse / discovery card. Server Component — renders read-only summary
 * data and delegates the flag interaction to a `FlagButton` island.
 *
 * Public surface only — author identity is `authorHandle` (deterministic
 * Poseidon-derived handle, ATID-COMPL-006).
 *
 * Visually mirrors `@factivist/ui-web/complaint` → `Complaint.Card`
 * (same `<Card>` primitive, same token set, same line layout), but
 * stays bespoke for two app-specific contracts the generic compound
 * deliberately does not encode:
 *   1. uppercased state/AC codes in the meta line (en-IN convention
 *      across the rest of the web app)
 *   2. a parseable `<time datetime={iso}>` element for Open Graph
 *      crawlers + the search-engine schema in `apps/web/src/lib/seo`
 *   3. a Next.js `<Link>` (not a `<button>`) so prefetching works
 *
 * If you change this card, run `bun run test --filter @factivist/web`
 * — the contract tests in `__tests__/ComplaintCard.test.tsx` pin the
 * three contracts above.
 */
export interface ComplaintCardProps {
  readonly complaint: ApiComplaintSummary
}

const formatTimestamp = (iso: string): string => {
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function ComplaintCard({ complaint }: ComplaintCardProps) {
  return (
    <Card className="p-4" data-testid={`complaint-card-${complaint.id}`}>
      <article className="flex flex-col gap-3">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold leading-tight text-[var(--color-foreground)]">
              <Link
                href={`/complaints/${complaint.id}`}
                className="hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
                data-testid={`complaint-link-${complaint.id}`}
              >
                {complaint.title}
              </Link>
            </h2>
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              <span>{complaint.categoryLabel}</span>
              <span aria-hidden="true"> · </span>
              <span>
                {complaint.stateCode.toUpperCase()} / {complaint.acCode.toUpperCase()}
              </span>
              <span aria-hidden="true"> · </span>
              <time dateTime={complaint.createdAt}>{formatTimestamp(complaint.createdAt)}</time>
            </p>
          </div>
          <FlagButton complaintId={complaint.id} />
        </header>

        <p className="text-sm text-[var(--color-foreground)]">{complaint.bodyExcerpt}</p>

        <footer className="flex items-center justify-between text-xs text-[var(--color-muted-foreground)]">
          <span>by {complaint.authorHandle}</span>
          <span>
            {complaint.commentCount} comment{complaint.commentCount === 1 ? '' : 's'}
            {complaint.flagCount > 0 ? ` · ${complaint.flagCount} flags` : null}
          </span>
        </footer>
      </article>
    </Card>
  )
}
