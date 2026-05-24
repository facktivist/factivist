import type { DiscoveryFiltersInput } from '@factivist/shared/validators'

import { DiscoveryPage } from '../../features/discovery/DiscoveryPage.tsx'

/**
 * `/discover` — Search/browse tab target.
 *
 * Per ADR-0019, web tab order mirrors mobile (`Home → Search → Compose
 * → Profile`). This route is the Search tab landing.
 *
 * Next.js 15+ passes `searchParams` as a Promise on Server Components;
 * we await it and forward the parsed shape to `<DiscoveryPage />`
 * (which re-validates with the canonical Zod schema before fetching).
 */
export default async function DiscoverPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  // Coerce array values down to the first entry — Discovery's filter
  // shape is single-valued. Anything we don't recognise is dropped
  // server-side by `discoveryFiltersSchema.parse` inside DiscoveryPage.
  const filters: DiscoveryFiltersInput = Object.fromEntries(
    Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  ) as DiscoveryFiltersInput
  return <DiscoveryPage searchParams={filters} />
}
