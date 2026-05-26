import { Comment } from '@factivist/ui-native/comment'
import { Complaint } from '@factivist/ui-native/complaint'
import { Card } from '@factivist/ui-native/components'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'
import { ActivityIndicator, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { type ApiComment, ApiError, apiClient } from '../../src/lib/api/client.ts'

/**
 * `/complaint/[id]` — Surface 3 (Complaint detail).
 *
 * Fetches the complaint via `apiClient.getComplaint` + its comment thread
 * via `apiClient.listComments`, and renders both through the native
 * compound: `Complaint.PhotoGallery` for the photos, `Complaint.FlagAction`
 * for the flag affordance, `Comment.Thread` for the discussion.
 *
 * 404 path: a non-existent or unpublished complaint surfaces the same
 * not-found copy regardless (the API returns 404 either way per the
 * route handler — see `apps/api/src/routes/complaint.ts:166-172`).
 */
export default function ComplaintDetail() {
  const params = useLocalSearchParams<{ id: string }>()
  const slug = params.id ?? ''
  const queryClient = useQueryClient()

  const complaintQuery = useQuery({
    queryKey: ['complaint', slug],
    queryFn: () => apiClient.getComplaint(slug),
    enabled: slug.length > 0,
  })

  const commentsQuery = useQuery({
    queryKey: ['comments', slug],
    queryFn: () => apiClient.listComments(slug),
    enabled: slug.length > 0 && complaintQuery.isSuccess,
  })

  const replyMutation = useMutation({
    mutationFn: (input: { complaintSlug: string; body: string; parentId?: string }) =>
      apiClient.createComment(input),
    onSuccess: () => {
      // Optimistic refresh — re-fetch the thread so the new comment
      // appears with the canonical createdAt from the server.
      queryClient.invalidateQueries({ queryKey: ['comments', slug] })
    },
  })

  const flagMutation = useMutation({
    mutationFn: (input: { id: string; reason: string }) =>
      apiClient.flagComplaint(input.id, {
        reason: input.reason as Parameters<typeof apiClient.flagComplaint>[1]['reason'],
      }),
  })

  if (slug.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']} testID="complaint-detail">
        <View accessibilityRole="alert" className="p-6">
          <Text className="text-sm text-destructive">No complaint id supplied.</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (complaintQuery.isLoading) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']} testID="complaint-detail">
        <View accessibilityLabel="Loading complaint" className="items-center justify-center p-12">
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    )
  }

  if (complaintQuery.error) {
    const err = complaintQuery.error
    const notFound = err instanceof ApiError && err.status === 404
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']} testID="complaint-detail">
        <View accessibilityRole="alert" className="p-6">
          <Text className="text-sm text-destructive" testID="complaint-detail-error">
            {notFound ? 'Complaint not found.' : 'Could not load complaint.'}
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  const complaint = complaintQuery.data
  if (!complaint) return null
  const comments: ReadonlyArray<ApiComment> = commentsQuery.data?.items ?? []

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']} testID="complaint-detail">
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 16, gap: 16 }}>
        <Card>
          <Card.Header>
            <Card.Title>{complaint.title}</Card.Title>
          </Card.Header>
          <Card.Body>
            <Text className="text-xs uppercase tracking-wider font-mono text-muted-foreground">
              {complaint.categoryLabel} ·{' '}
              {[complaint.stateLabel, complaint.districtLabel, complaint.acLabel]
                .filter(Boolean)
                .join(' / ')}
            </Text>
            <Text className="mt-3 text-sm text-foreground" testID="complaint-body">
              {complaint.body}
            </Text>
            {complaint.photoUrls.length > 0 ? (
              <View className="mt-4">
                <Complaint.PhotoGallery
                  photoUrls={complaint.photoUrls}
                  onPhotoOpen={() => {
                    /* lightbox lands in a follow-up wave */
                  }}
                  testID="complaint-photos"
                />
              </View>
            ) : null}
            <View className="mt-4 flex flex-row items-center gap-3">
              <Text
                className="text-xs font-mono text-muted-foreground"
                testID="complaint-author-handle"
              >
                by {complaint.authorHandle}
              </Text>
              <Complaint.FlagAction
                complaintId={complaint.id}
                onFlag={(input) => flagMutation.mutate(input)}
                status={flagMutation.isPending ? 'loading' : 'idle'}
                testID="complaint-flag"
              />
            </View>
          </Card.Body>
        </Card>

        <Card>
          <Card.Header>
            <Card.Title>Comments ({comments.length})</Card.Title>
          </Card.Header>
          <Card.Body>
            <Comment.Thread
              comments={comments.map((c) => ({
                id: c.id,
                parentId: c.parentId,
                complaintId: c.complaintId,
                authorHandle: c.authorHandle,
                body: c.body,
                createdAt: c.createdAt,
                flagged: c.flagged,
              }))}
              currentUserHandle={complaint.authorHandle}
              loading={commentsQuery.isLoading}
              onReply={async (parentId, body) => {
                await replyMutation.mutateAsync({
                  complaintSlug: complaint.id,
                  body,
                  parentId: parentId ?? undefined,
                })
              }}
              testID="comment-thread"
            />
          </Card.Body>
        </Card>
      </ScrollView>
    </SafeAreaView>
  )
}
