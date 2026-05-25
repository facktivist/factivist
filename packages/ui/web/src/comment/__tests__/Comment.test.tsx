import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { __buildCommentTree, Comment } from '../Comment.tsx'
import type { Comment as CommentRecord } from '../Comment.types.ts'

const makeComment = (over: Partial<CommentRecord>): CommentRecord => ({
  id: over.id ?? 'c1',
  parentId: over.parentId ?? null,
  complaintId: over.complaintId ?? 'cmp_1',
  authorHandle: over.authorHandle ?? 'anon-rabbit',
  body: over.body ?? 'hello',
  createdAt: over.createdAt ?? '2026-05-15T10:00:00.000Z',
  flagged: over.flagged ?? false,
})

describe('__buildCommentTree', () => {
  it('returns roots first, then their children, in createdAt order', () => {
    const tree = __buildCommentTree([
      makeComment({ id: 'b', parentId: 'a', createdAt: '2026-05-16T10:00:00.000Z' }),
      makeComment({ id: 'a', parentId: null, createdAt: '2026-05-15T09:00:00.000Z' }),
      makeComment({ id: 'c', parentId: null, createdAt: '2026-05-16T11:00:00.000Z' }),
    ])
    expect(tree.map((n) => n.id)).toEqual(['a', 'b', 'c'])
    expect(tree.map((n) => n.depth)).toEqual([0, 1, 0])
  })

  it('caps depth at 4 even on very deep threads', () => {
    const chain: CommentRecord[] = []
    let prevId: string | null = null
    for (let i = 0; i < 10; i++) {
      const id = `c${i}`
      chain.push(
        makeComment({ id, parentId: prevId, createdAt: `2026-05-${10 + i}T10:00:00.000Z` }),
      )
      prevId = id
    }
    const tree = __buildCommentTree(chain)
    expect(tree.map((n) => n.depth)).toEqual([0, 1, 2, 3, 4, 4, 4, 4, 4, 4])
  })

  it('returns [] for empty input', () => {
    expect(__buildCommentTree([])).toEqual([])
  })
})

describe('Comment.Thread', () => {
  it('renders one composer at the top + one card per comment', () => {
    render(
      <Comment.Thread
        comments={[
          makeComment({ id: 'a', body: 'First' }),
          makeComment({ id: 'b', body: 'Second', createdAt: '2026-05-16T10:00:00.000Z' }),
        ]}
        onReply={() => {}}
      />,
    )
    expect(screen.getByRole('form', { name: 'Add a comment' })).toBeInTheDocument()
    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.getByText('Second')).toBeInTheDocument()
  })

  it('marks the current user with " · you"', () => {
    render(
      <Comment.Thread
        comments={[makeComment({ authorHandle: 'me-handle' })]}
        currentUserHandle="me-handle"
        onReply={() => {}}
      />,
    )
    expect(screen.getByText(/me-handle · you/)).toBeInTheDocument()
  })

  it('shows a Reply button per comment and toggles a reply composer', () => {
    render(<Comment.Thread comments={[makeComment({ id: 'top' })]} onReply={() => {}} />)
    const replyBtn = screen.getByRole('button', { name: 'Reply' })
    fireEvent.click(replyBtn)
    expect(screen.getByRole('form', { name: 'Reply to comment' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel reply' }))
    expect(screen.queryByRole('form', { name: 'Reply to comment' })).toBeNull()
  })

  it('emits onReply via the top-level composer', async () => {
    const onReply = vi.fn(async () => {})
    render(<Comment.Thread comments={[]} onReply={onReply} />)
    const textarea = screen.getByLabelText('Comment body')
    fireEvent.change(textarea, { target: { value: 'a new top-level reply' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Add a comment' }))
    await waitFor(() => expect(onReply).toHaveBeenCalledWith(null, 'a new top-level reply'))
  })

  it('does NOT submit when body is whitespace only', async () => {
    const onReply = vi.fn()
    render(<Comment.Thread comments={[]} onReply={onReply} />)
    const textarea = screen.getByLabelText('Comment body')
    fireEvent.change(textarea, { target: { value: '   \n  ' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Add a comment' }))
    expect(onReply).not.toHaveBeenCalled()
  })

  it('renders Flag buttons only when onFlag is supplied', () => {
    const onFlag = vi.fn()
    const { rerender } = render(
      <Comment.Thread comments={[makeComment({ authorHandle: 'h' })]} onReply={() => {}} />,
    )
    expect(screen.queryByRole('button', { name: 'Flag comment by h' })).toBeNull()
    rerender(
      <Comment.Thread
        comments={[makeComment({ authorHandle: 'h' })]}
        onReply={() => {}}
        onFlag={onFlag}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Flag comment by h' }))
    expect(onFlag).toHaveBeenCalledWith('c1')
  })

  it('shows "Flagged for review" when comment.flagged is true', () => {
    render(<Comment.Thread comments={[makeComment({ flagged: true })]} onReply={() => {}} />)
    expect(screen.getByText('Flagged for review')).toBeInTheDocument()
  })

  it('shows a loading spinner when loading=true + no comments yet', () => {
    render(<Comment.Thread comments={[]} loading onReply={() => {}} />)
    expect(screen.getByLabelText('Loading comments')).toBeInTheDocument()
  })

  it('exposes Thread on the Comment compound namespace', () => {
    expect(typeof Comment.Thread).toBe('function')
  })
})
