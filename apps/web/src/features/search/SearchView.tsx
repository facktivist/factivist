'use client'

import { Search } from '@factivist/ui-web/search'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import type { ApiComplaintSummary } from '../../lib/api/client.ts'

interface SearchViewProps {
  readonly initialQuery: string
  readonly initialResults: ReadonlyArray<ApiComplaintSummary>
  readonly variant: 'no-query' | 'no-matches' | 'has-matches'
}

/**
 * Search results client island.
 *
 * Renders the trio `Search.Bar` + `Search.Results` + `Search.EmptyState`
 * from `@factivist/ui-web/search`. The Server Component above did the
 * initial fetch; this island only owns:
 *
 *   - controlled input state for the Bar
 *   - URL push on submit so the page is shareable / linkable
 *   - clicking a result navigates to the detail page
 *
 * Reactive re-querying on every keystroke is intentionally OFF — S1's
 * Postgres `ilike` is too slow for that. Submitting (Enter / Search
 * button) pushes a new URL and the page re-renders server-side.
 */
export function SearchView({ initialQuery, initialResults, variant }: SearchViewProps) {
  const router = useRouter()
  const [value, setValue] = useState(initialQuery)
  const [, startTransition] = useTransition()

  const submit = (query: string) => {
    const trimmed = query.trim()
    startTransition(() => {
      router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/search')
    })
  }

  const summaries = initialResults.map((c) => ({
    id: c.id,
    title: c.title,
    bodyExcerpt: c.bodyExcerpt,
    categoryId: 0,
    geo: {
      state: c.stateCode,
      district: c.districtCode,
      constituency: c.acCode,
    },
    photoUrls: c.photoUrls,
    createdAt: c.createdAt,
    commentCount: c.commentCount,
    flagged: c.flagCount > 0,
  }))

  return (
    <div className="flex flex-col gap-6">
      <Search.Bar
        value={value}
        onChange={setValue}
        onSubmit={submit}
        placeholder="Search complaints"
        autoFocus={initialQuery.length === 0}
      />
      {variant === 'has-matches' ? (
        <Search.Results
          query={initialQuery}
          results={summaries}
          onItemOpen={(id) => router.push(`/complaints/${encodeURIComponent(id)}`)}
        />
      ) : (
        <Search.EmptyState variant={variant} query={initialQuery} />
      )}
    </div>
  )
}
