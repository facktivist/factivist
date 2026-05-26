import { discoveryFiltersSchema } from '@factivist/shared/validators'
import { Card } from '@factivist/ui-native/components'
import { Filter } from '@factivist/ui-native/filter'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { type ApiComplaintSummary, apiClient } from '../../lib/api/client.ts'

type SortValue = 'newest' | 'most-commented' | 'most-flagged'

/**
 * Discovery / browse screen (mobile).
 *
 * Mirrors the web DiscoveryPage layout. Same field order, same filter
 * controls, parity per ADR-019. No FAB; compose is the inline action on
 * each list item via the surrounding feed tab.
 */

const formatTimestamp = (iso: string): string => {
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function ComplaintListItem({ complaint }: { readonly complaint: ApiComplaintSummary }) {
  return (
    <Pressable
      onPress={() => router.push(`/complaint/${complaint.id}` as never)}
      accessibilityRole="button"
      accessibilityLabel={`Open complaint: ${complaint.title}`}
      testID={`complaint-row-${complaint.id}`}
    >
      <Card>
        <Card.Header>
          <Card.Title>{complaint.title}</Card.Title>
          <Card.Description>
            {complaint.categoryLabel} · {complaint.stateCode.toUpperCase()}/
            {complaint.acCode.toUpperCase()} · {formatTimestamp(complaint.createdAt)}
          </Card.Description>
        </Card.Header>
        <Card.Body>
          <Text className="text-sm">{complaint.bodyExcerpt}</Text>
          <Text className="mt-2 text-xs text-muted-foreground">
            by {complaint.authorHandle} · {complaint.commentCount} comment
            {complaint.commentCount === 1 ? '' : 's'}
            {complaint.flagCount > 0 ? ` · ${complaint.flagCount} flags` : ''}
          </Text>
        </Card.Body>
      </Card>
    </Pressable>
  )
}

export function DiscoveryScreen() {
  const [sort, setSort] = useState<SortValue>('newest')
  const [categorySlug, setCategorySlug] = useState<string | null>(null)

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiClient.listCategories(),
    staleTime: 60 * 60_000,
  })

  const filters = discoveryFiltersSchema.parse({
    sort,
    categorySlug: categorySlug ?? undefined,
  })

  const query = useQuery({
    queryKey: ['discovery', filters],
    queryFn: () => apiClient.listComplaints(filters),
    staleTime: 30_000,
  })

  const categoryList = categoriesQuery.data ?? []
  const selectedIds: ReadonlyArray<number> = categorySlug
    ? [categoryList.findIndex((c) => c.slug === categorySlug)].filter((i) => i >= 0)
    : []

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']} testID="discovery-screen">
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 16, gap: 12 }}>
        <View>
          <Text className="text-2xl font-bold">Browse complaints</Text>
          <Text className="mt-1 text-sm text-muted-foreground">
            Filter by state, district, PC, AC or category.
          </Text>
        </View>

        <Filter.SortToggle value={sort} onChange={setSort} />
        <Filter.CategoryChips
          categories={categoryList.map((c, i) => ({ id: i, slug: c.slug, label: c.label }))}
          selectedIds={selectedIds}
          onChange={(ids) => {
            const firstId = ids[0]
            setCategorySlug(firstId === undefined ? null : (categoryList[firstId]?.slug ?? null))
          }}
        />

        {query.isLoading ? <Text className="text-sm text-muted-foreground">Loading…</Text> : null}
        {query.isError ? (
          <View
            accessibilityRole="alert"
            className="rounded-md border border-destructive bg-destructive/10 p-3"
          >
            <Text className="text-sm text-destructive">
              {query.error instanceof Error ? query.error.message : 'Could not load complaints.'}
            </Text>
          </View>
        ) : null}
        {query.data && query.data.items.length === 0 ? (
          <Card>
            <Card.Body>
              <Text className="text-sm text-muted-foreground">
                No complaints match your filters.
              </Text>
            </Card.Body>
          </Card>
        ) : null}
        {query.data?.items.map((c) => (
          <ComplaintListItem key={c.id} complaint={c} />
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}
