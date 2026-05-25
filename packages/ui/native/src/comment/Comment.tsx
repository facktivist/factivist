/**
 * `Comment.*` compound — mobile (HeroUI Native + Uniwind).
 *
 * Mirrors the web implementation: flat array → derived tree by parentId,
 * depth-capped at 4 for layout sanity on small viewports.
 */

import type * as React from 'react'
import type { FC, ReactNode } from 'react'
import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  type PressableProps,
  Pressable as RNPressable,
  Text as RNText,
  TextInput as RNTextInput,
  View as RNView,
  type TextInputProps,
  type TextProps,
  type ViewProps,
  type ViewStyle,
} from 'react-native'

import type { Comment as CommentRecord, CommentThreadProps } from './Comment.types.ts'

type WithCN<P> = P & { readonly children?: ReactNode; readonly className?: string }
const View = RNView as unknown as FC<WithCN<ViewProps>>
const Text = RNText as unknown as FC<WithCN<TextProps>>
const Pressable = RNPressable as unknown as FC<WithCN<PressableProps>>
const TextInput = RNTextInput as unknown as FC<TextInputProps & { className?: string }>

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
  readonly testID?: string
}

const ReplyComposer = ({ parentId, onReply, testID }: ReplyComposerProps): React.JSX.Element => {
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const handleSubmit = useCallback(async () => {
    if (!body.trim()) return
    setSubmitting(true)
    try {
      await onReply(parentId, body.trim())
      setBody('')
    } finally {
      setSubmitting(false)
    }
  }, [body, onReply, parentId])
  const label = parentId ? 'Reply to comment' : 'Add a comment'
  const trimmed = body.trim().length === 0
  return (
    <View
      accessibilityLabel={label}
      testID={testID}
      className="flex flex-col gap-2 p-3 rounded-md bg-muted"
    >
      <TextInput
        accessibilityLabel="Comment body"
        value={body}
        onChangeText={setBody}
        placeholder="Add a comment…"
        multiline
        numberOfLines={3}
        maxLength={2000}
        className="rounded-md bg-card border border-border p-2 text-sm text-foreground"
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Post"
        accessibilityState={{ disabled: trimmed || submitting }}
        disabled={trimmed || submitting}
        onPress={handleSubmit}
        className="self-end px-4 py-2 rounded-md bg-primary"
        testID={testID ? `${testID}-post` : undefined}
      >
        {submitting ? (
          <ActivityIndicator accessibilityLabel="posting" />
        ) : (
          <Text className="text-sm text-primary-foreground">Post</Text>
        )}
      </Pressable>
    </View>
  )
}

const Thread = ({
  comments,
  currentUserHandle,
  onReply,
  onFlag,
  loading,
  style,
  accessibilityLabel = 'Comments',
  testID,
}: CommentThreadProps): React.JSX.Element => {
  const tree = buildTree(comments)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={style as ViewStyle | undefined}
      className="flex flex-col gap-3"
    >
      <ReplyComposer
        parentId={null}
        onReply={onReply}
        testID={testID ? `${testID}-root` : undefined}
      />
      {loading && tree.length === 0 ? (
        <View accessibilityLabel="Loading comments" className="items-center p-4">
          <ActivityIndicator />
        </View>
      ) : null}
      <View className="flex flex-col gap-2">
        {tree.map((c) => {
          const isAuthor = currentUserHandle === c.authorHandle
          return (
            <View
              key={c.id}
              style={{ paddingLeft: c.depth * 16 } as ViewStyle}
              className="p-3 rounded-xl bg-card border border-border"
            >
              <View className="flex flex-row items-center justify-between">
                <Text className="text-xs font-mono text-muted-foreground">
                  {c.authorHandle}
                  {isAuthor ? ' · you' : ''}
                </Text>
                <Text className="text-xs font-mono text-muted-foreground">
                  {formatDate(c.createdAt)}
                </Text>
              </View>
              <Text className="text-sm text-foreground mt-2">{c.body}</Text>
              <View className="flex flex-row justify-end gap-3 mt-2">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={c.id === replyTo ? 'Cancel reply' : 'Reply'}
                  onPress={() => setReplyTo(c.id === replyTo ? null : c.id)}
                >
                  <Text className="text-xs text-muted-foreground">
                    {c.id === replyTo ? 'Cancel reply' : 'Reply'}
                  </Text>
                </Pressable>
                {onFlag ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Flag comment by ${c.authorHandle}`}
                    onPress={() => onFlag(c.id)}
                  >
                    <Text className="text-xs text-muted-foreground">⚑</Text>
                  </Pressable>
                ) : null}
              </View>
              {c.flagged ? (
                <Text accessibilityRole="alert" className="text-xs text-destructive mt-2">
                  Flagged for review
                </Text>
              ) : null}
              {c.id === replyTo ? (
                <View className="mt-2">
                  <ReplyComposer
                    parentId={c.id}
                    onReply={async (pid, body) => {
                      await onReply(pid, body)
                      setReplyTo(null)
                    }}
                  />
                </View>
              ) : null}
            </View>
          )
        })}
      </View>
    </View>
  )
}

export const Comment = { Thread } as const
export type CommentCompound = typeof Comment

export { buildTree as __buildCommentTree, Thread as CommentThread }
