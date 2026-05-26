'use client'

import { Comment } from '@factivist/ui-web/comment'
import { Complaint } from '@factivist/ui-web/complaint'
import { Card } from '@factivist/ui-web/components'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { type ApiComment, type ApiComplaint, apiClient } from '../../../lib/api/client.ts'

interface ComplaintDetailViewProps {
  readonly complaint: ApiComplaint
  readonly initialComments: ReadonlyArray<ApiComment>
}

/**
 * Client island that hydrates the detail page with the server-fetched
 * complaint + comment thread, then keeps the thread in sync via
 * TanStack Query so a posted reply or a flag action surfaces without a
 * full reload.
 *
 * `currentUserHandle` for `Comment.Thread` is the complaint author by
 * default — the compound uses it only to render the "author" badge
 * next to a matching comment authorHandle. Real session-handle wiring
 * lands once the wave-3 `/me` endpoint is consumed from a server
 * component.
 */
export function ComplaintDetailView({ complaint, initialComments }: ComplaintDetailViewProps) {
  const queryClient = useQueryClient()

  const commentsQuery = useQuery({
    queryKey: ['comments', complaint.id],
    queryFn: () => apiClient.listComments(complaint.id),
    initialData: { items: initialComments },
    staleTime: 30_000,
  })

  const replyMutation = useMutation({
    mutationFn: (input: { complaintSlug: string; body: string; parentId?: string }) =>
      apiClient.createComment(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', complaint.id] })
    },
  })

  const flagMutation = useMutation({
    mutationFn: (input: { id: string; reason: string }) =>
      apiClient.flagComplaint(input.id, {
        reason: input.reason as Parameters<typeof apiClient.flagComplaint>[1]['reason'],
      }),
  })

  const comments: ReadonlyArray<ApiComment> = commentsQuery.data?.items ?? []

  return (
    <div className="flex flex-col gap-6">
      <Card
        className="p-6 flex flex-col gap-4 bg-[var(--color-card)] border border-[var(--color-border)]"
        data-testid="complaint-detail-card"
      >
        <h1 className="text-xl font-semibold text-[var(--color-foreground)]">{complaint.title}</h1>
        <p className="text-xs font-mono uppercase tracking-wider text-[var(--color-muted-foreground)]">
          {complaint.categoryLabel} ·{' '}
          {[complaint.stateLabel, complaint.districtLabel, complaint.acLabel]
            .filter(Boolean)
            .join(' / ')}
        </p>
        <p className="text-sm text-[var(--color-foreground)]" data-testid="complaint-body">
          {complaint.body}
        </p>
        {complaint.photoUrls.length > 0 ? (
          <Complaint.PhotoGallery
            photoUrls={complaint.photoUrls}
            onPhotoOpen={() => {
              /* lightbox lands in a follow-up wave */
            }}
          />
        ) : null}
        <div className="flex items-center gap-3">
          <span
            className="text-xs font-mono text-[var(--color-muted-foreground)]"
            data-testid="complaint-author-handle"
          >
            by {complaint.authorHandle}
          </span>
          <Complaint.FlagAction
            complaintId={complaint.id}
            onFlag={(input) => flagMutation.mutate(input)}
            status={flagMutation.isPending ? 'loading' : 'idle'}
          />
        </div>
      </Card>

      <Card
        className="p-6 flex flex-col gap-3 bg-[var(--color-card)] border border-[var(--color-border)]"
        data-testid="comment-thread-card"
      >
        <h2 className="text-base font-semibold text-[var(--color-foreground)]">
          Comments ({comments.length})
        </h2>
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
        />
      </Card>
    </div>
  )
}
