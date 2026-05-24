import { discoveryFiltersSchema } from '@factivist/shared/validators'
import { Card } from '@factivist/ui-native/components'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { type ApiComplaintSummary, apiClient } from '../../lib/api/client.ts'

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
          <Text className="mt-2 text-xs text-zinc-500">
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
  const filters = discoveryFiltersSchema.parse({})
  const query = useQuery({
    queryKey: ['discovery', filters],
    queryFn: () => apiClient.listComplaints(filters),
    staleTime: 30_000,
  })

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']} testID="discovery-screen">
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 16, gap: 12 }}>
        <View>
          <Text className="text-2xl font-bold">Browse complaints</Text>
          <Text className="mt-1 text-sm text-zinc-500">
            Filter by state, district, PC, AC or category.
          </Text>
        </View>

        {query.isLoading ? <Text className="text-sm text-zinc-500">Loading…</Text> : null}
        {query.isError ? (
          <View
            accessibilityRole="alert"
            className="rounded-md border border-red-300 bg-red-50 p-3"
          >
            <Text className="text-sm text-red-700">
              {query.error instanceof Error ? query.error.message : 'Could not load complaints.'}
            </Text>
          </View>
        ) : null}
        {query.data && query.data.items.length === 0 ? (
          <Card>
            <Card.Body>
              <Text className="text-sm text-zinc-500">No complaints match your filters.</Text>
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
