import { discoveryFiltersSchema } from '@factivist/shared/validators'

import { SearchView } from '../../features/search/SearchView.tsx'
import { apiClient } from '../../lib/api/client.ts'

/**
 * `/search` — Surface 5 (Postgres FTS results).
 *
 * S1 reuses the existing `GET /complaints?q=…` `ilike` search; the
 * Meilisearch-backed full-text path lands in S2 per
 * `docs/action-plans/season-2/s2-action-plan.md` §5.4.
 *
 * Server Component — reads `?q=` from URL, fetches results up-front so
 * the page is render-ready on first paint and crawlable. The
 * interactive Search.Bar lives in the `SearchView` client island so
 * keystrokes don't round-trip through the server.
 */
export default async function SearchPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const rawQ = Array.isArray(sp.q) ? sp.q[0] : sp.q
  const query = (rawQ ?? '').trim()

  // No query → empty state without spending a fetch.
  if (!query) {
    return (
      <main id="main" className="mx-auto max-w-3xl px-4 py-8" data-testid="search-page">
        <SearchView initialQuery="" initialResults={[]} variant="no-query" />
      </main>
    )
  }

  const filters = discoveryFiltersSchema.parse({ q: query, sort: 'newest' })
  const page = await apiClient.listComplaints(filters)

  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-8" data-testid="search-page">
      <SearchView
        initialQuery={query}
        initialResults={page.items}
        variant={page.items.length === 0 ? 'no-matches' : 'has-matches'}
      />
    </main>
  )
}
