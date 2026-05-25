/**
 * `Comment.*` compound — web (HeroUI v3).
 *
 * Surface 3 (Complaint detail). One slot: `Comment.Thread`.
 *
 * Driven by the Claude Design prototype at
 * `docs/design/s1/handoff/product-design/factivist-s1/project/screens/comments.jsx`.
 *
 * ## Anonymity invariants (ADR-010)
 *   - `authorHandle` is the only identifier displayed; never the user_id.
 *   - Comment body is rendered as plain text (no markdown injection, no
 *     image/url embeds that could phone home).
 *
 * ## Threading
 *
 * The comments array is flat (Postgres `(id, parent_id)` shape). The
 * compound derives the tree client-side by `parentId` chains and renders
 * each level with indented padding (depth-capped at 4 to keep the layout
 * readable on mobile widths).
 */

import type * as React from 'react'
import { type FormEvent, useState } from 'react'

import { Button, Card, Spinner } from '../components/index.ts'
import type { Comment as CommentRecord, CommentThreadProps } from './Comment.types.ts'

const cx = (...parts: ReadonlyArray<string | false | null | undefined>): string =>
  parts.filter((p): p is string => typeof p === 'string' && p.length > 0).join(' ')

interface CommentNode extends CommentRecord {
  readonly depth: number
}

const buildTree = (comments: ReadonlyArray<CommentRecord>): CommentNode[] => {
  const byParent = new Map<string | null, CommentRecord[]>()
  for (const c of comments) {
    const arr = byParent.get(c.parentId) ?? []
    arr.push(c)
    byParent.set(c.parentId, arr)
  }
  const out: CommentNode[] = []
  const visit = (parentId: string | null, depth: number): void => {
    const children = byParent.get(parentId)
    if (!children) return
    // Sort by createdAt ascending for stable, predictable thread order.
    const sorted = [...children].sort((a, b) =>
      a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0,
    )
    for (const c of sorted) {
      out.push({ ...c, depth: Math.min(depth, 4) })
      visit(c.id, depth + 1)
    }
  }
  visit(null, 0)
  return out
}

const formatDate = (iso: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

interface ReplyComposerProps {
  readonly parentId: string | null
  readonly onReply: CommentThreadProps['onReply']
}

const ReplyComposer = ({ parentId, onReply }: ReplyComposerProps): React.JSX.Element => {
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    if (!body.trim()) return
    setSubmitting(true)
    try {
      await onReply(parentId, body.trim())
      setBody('')
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <form
      aria-label={parentId ? 'Reply to comment' : 'Add a comment'}
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 p-3 rounded-md bg-[var(--color-muted)]"
    >
      <textarea
        aria-label="Comment body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Add a comment…"
        rows={3}
        maxLength={2000}
        className="resize-y rounded-md bg-[var(--color-card)] border border-[var(--color-border)] p-2 text-sm focus-visible:outline-2 focus-visible:outline-[var(--color-ring)]"
      />
      <div className="flex justify-end">
        <Button variant="primary" type="submit" isDisabled={!body.trim() || submitting}>
          {submitting ? <Spinner aria-hidden="true" /> : 'Post'}
        </Button>
      </div>
    </form>
  )
}

const Thread = ({
  comments,
  currentUserHandle,
  onReply,
  onFlag,
  loading,
  className,
}: CommentThreadProps): React.JSX.Element => {
  const tree = buildTree(comments)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  return (
    <section
      aria-label="Comments"
      aria-busy={loading ? true : undefined}
      className={cx('flex flex-col gap-3', className)}
    >
      <ReplyComposer parentId={null} onReply={onReply} />
      {loading && tree.length === 0 ? (
        <div className="flex justify-center p-4" role="status" aria-label="Loading comments">
          <Spinner aria-hidden="true" />
        </div>
      ) : null}
      <ul className="flex flex-col gap-2 list-none p-0">
        {tree.map((c) => {
          const isAuthor = currentUserHandle === c.authorHandle
          return (
            <li key={c.id} style={{ paddingLeft: `${c.depth * 16}px` }} data-depth={c.depth}>
              <Card className="p-3 flex flex-col gap-2">
                <header className="flex items-center justify-between gap-3 text-xs font-mono text-[var(--color-muted-foreground)]">
                  <span>
                    {c.authorHandle}
                    {isAuthor ? ' · you' : ''}
                  </span>
                  <span>{formatDate(c.createdAt)}</span>
                </header>
                <p className="text-sm text-[var(--color-foreground)] whitespace-pre-wrap break-words">
                  {c.body}
                </p>
                <footer className="flex gap-2 justify-end text-xs">
                  <button
                    type="button"
                    onClick={() => setReplyTo(c.id === replyTo ? null : c.id)}
                    className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                  >
                    {c.id === replyTo ? 'Cancel reply' : 'Reply'}
                  </button>
                  {onFlag ? (
                    <button
                      type="button"
                      aria-label={`Flag comment by ${c.authorHandle}`}
                      onClick={() => onFlag(c.id)}
                      className="text-[var(--color-muted-foreground)] hover:text-[var(--color-destructive)]"
                    >
                      ⚑
                    </button>
                  ) : null}
                </footer>
                {c.flagged ? (
                  <p role="status" className="text-xs text-[var(--color-destructive)]">
                    Flagged for review
                  </p>
                ) : null}
                {c.id === replyTo ? (
                  <ReplyComposer
                    parentId={c.id}
                    onReply={async (pid, body) => {
                      await onReply(pid, body)
                      setReplyTo(null)
                    }}
                  />
                ) : null}
              </Card>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export const Comment = { Thread } as const
export type CommentCompound = typeof Comment

export { buildTree as __buildCommentTree, Thread as CommentThread }
