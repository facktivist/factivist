import { describe, expect, it, vi } from 'vitest'

vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  TextInput: 'TextInput',
  ActivityIndicator: 'ActivityIndicator',
}))

import type { Comment as CommentRecord } from '../Comment.types.ts'

const makeComment = (over: Partial<CommentRecord> = {}): CommentRecord => ({
  id: 'c1',
  parentId: null,
  complaintId: 'cmp_1',
  authorHandle: 'anon-rabbit',
  body: 'hello world',
  createdAt: '2026-05-15T10:00:00.000Z',
  flagged: false,
  ...over,
})

/**
 * The native `Comment.Thread` uses `useState`; calling it as a function in
 * a node test environment without a React renderer throws "Cannot read
 * properties of null (reading 'useState')". Detox covers the stateful
 * paths at E2E level. Here we exercise the pure `__buildCommentTree`
 * helper + the compound shape directly.
 */
describe('__buildCommentTree (native)', () => {
  it('orders roots and children by createdAt with capped depth', async () => {
    const { __buildCommentTree } = await import('../Comment.tsx')
    const tree = __buildCommentTree([
      makeComment({ id: 'b', parentId: 'a', createdAt: '2026-05-16T10:00:00.000Z' }),
      makeComment({ id: 'a', createdAt: '2026-05-15T09:00:00.000Z' }),
      makeComment({ id: 'c', createdAt: '2026-05-16T11:00:00.000Z' }),
    ])
    expect(tree.map((n) => n.id)).toEqual(['a', 'b', 'c'])
    expect(tree.map((n) => n.depth)).toEqual([0, 1, 0])
  })

  it('caps depth at 4 even on deeply nested threads', async () => {
    const { __buildCommentTree } = await import('../Comment.tsx')
    const chain: CommentRecord[] = []
    let prev: string | null = null
    for (let i = 0; i < 8; i++) {
      const id = `c${i}`
      chain.push(makeComment({ id, parentId: prev, createdAt: `2026-05-${10 + i}T10:00:00.000Z` }))
      prev = id
    }
    const tree = __buildCommentTree(chain)
    expect(tree.map((n) => n.depth)).toEqual([0, 1, 2, 3, 4, 4, 4, 4])
  })

  it('returns [] when given an empty input', async () => {
    const { __buildCommentTree } = await import('../Comment.tsx')
    expect(__buildCommentTree([])).toEqual([])
  })

  it('orphan children (parentId not in input) are silently dropped', async () => {
    const { __buildCommentTree } = await import('../Comment.tsx')
    const tree = __buildCommentTree([
      makeComment({ id: 'a' }),
      makeComment({ id: 'b', parentId: 'missing' }),
    ])
    expect(tree.map((n) => n.id)).toEqual(['a'])
  })
})

describe('Comment compound shape (native)', () => {
  it('exposes Thread as a function on the compound', async () => {
    const { Comment } = await import('../Comment.tsx')
    expect(typeof Comment.Thread).toBe('function')
  })
})
