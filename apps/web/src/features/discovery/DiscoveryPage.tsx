import { type DiscoveryFiltersInput, discoveryFiltersSchema } from '@factivist/shared/validators'
import { Card } from '@factivist/ui-web/components'

import { apiClient } from '../../lib/api/client.ts'
import { ComplaintCard } from '../complaint/ComplaintCard.tsx'
import { DiscoveryFiltersClient } from './DiscoveryFiltersClient.tsx'

/**
 * Discovery (browse) page. Server Component.
 *
 * Renders the filtered complaint list. Filters arrive as URL search
 * params (Next.js convention) — `?q=&state=&district=&pc=&ac=&category=&sort=&page=`.
 * The combobox + breadcrumb interaction is a Client Component island
 * mounted on the composer; the browse list itself stays server-rendered
 * for SEO + cacheability.
 *
 * The data fetch is a plain async function (apps/web rule — async work
 * lives outside the component tree for Vitest testability) and revalidates
 * every 30s.
 */
export interface DiscoveryPageProps {
  readonly searchParams: DiscoveryFiltersInput
}

const fetchDiscovery = async (filters: DiscoveryFiltersInput) => {
  const parsed = discoveryFiltersSchema.parse(filters)
  // Next.js extends RequestInit with `next.{ revalidate, tags }`; TS narrows
  // it via the declaration merge so we don't need a cast at the call site.
  return apiClient.listComplaints(parsed, {
    next: { revalidate: 30, tags: ['complaints'] },
  })
}

export async function DiscoveryPage({ searchParams }: DiscoveryPageProps) {
  const page = await fetchDiscovery(searchParams)

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Browse complaints</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Filter by state, district, PC, AC or category.
        </p>
      </header>

      <DiscoveryFiltersClient filters={searchParams} />

      <section className="mt-6 flex flex-col gap-3" aria-label="Complaint list">
        {page.items.length === 0 ? (
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">No complaints match your filters.</p>
          </Card>
        ) : (
          page.items.map((c) => <ComplaintCard key={c.id} complaint={c} />)
        )}
      </section>

      <nav
        aria-label="Pagination"
        className="mt-6 flex items-center justify-between text-sm text-muted-foreground"
      >
        <span>
          Page {page.page} of {Math.max(1, Math.ceil(page.totalCount / page.pageSize))}
        </span>
        <span>{page.totalCount} total</span>
      </nav>
    </main>
  )
}
