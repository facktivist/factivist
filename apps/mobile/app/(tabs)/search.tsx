import { discoveryFiltersSchema } from '@factivist/shared/validators'
import { Search } from '@factivist/ui-native/search'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useState } from 'react'
import { ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { apiClient } from '../../src/lib/api/client.ts'

/**
 * Tab 2 — Search (Surface 5).
 *
 * S1 reuses the `GET /complaints?q=…` `ilike` search. Meilisearch FTS
 * arrives in S2 per the S2 action plan §5.4. The compound surface stays
 * the same — only the backend swaps.
 *
 * Local state for the input + the submitted query; submit triggers the
 * TanStack Query refetch (no per-keystroke fetch — Postgres `ilike` is
 * too slow to chase on every change).
 */
export default function SearchTab() {
  const [value, setValue] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')

  const query = useQuery({
    queryKey: ['search', submittedQuery],
    queryFn: () =>
      apiClient.listComplaints(discoveryFiltersSchema.parse({ q: submittedQuery, sort: 'newest' })),
    enabled: submittedQuery.length > 0,
    staleTime: 30_000,
  })

  const submit = (next: string) => {
    setSubmittedQuery(next.trim())
  }

  const summaries =
    query.data?.items.map((c) => ({
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
    })) ?? []

  const variant: 'no-query' | 'no-matches' = submittedQuery.length === 0 ? 'no-query' : 'no-matches'

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']} testID="search-tab">
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 16, gap: 16 }}>
        <Search.Bar
          value={value}
          onChange={setValue}
          onSubmit={submit}
          placeholder="Search complaints"
        />
        {summaries.length > 0 ? (
          <Search.Results
            query={submittedQuery}
            results={summaries}
            loading={query.isLoading}
            onItemOpen={(id) => router.push(`/complaint/${encodeURIComponent(id)}` as never)}
          />
        ) : (
          <Search.EmptyState variant={variant} query={submittedQuery} />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
