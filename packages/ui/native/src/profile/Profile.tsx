/**
 * `Profile.*` compound — mobile (HeroUI Native + Uniwind).
 *
 * Slots mirror web: Handle, Stats, ComplaintList. Anonymity invariants
 * per ADR-010 enforced (first-8 nullifier chars, no PII).
 */

import type * as React from 'react'
import type { FC, ReactNode } from 'react'
import {
  ActivityIndicator,
  type FlatListProps,
  FlatList as RNFlatList,
  Text as RNText,
  View as RNView,
  type TextProps,
  type ViewProps,
  type ViewStyle,
} from 'react-native'

import { ComplaintCard } from '../complaint/Complaint.tsx'
import type { ComplaintSummary } from '../complaint/Complaint.types.ts'
import type {
  ProfileComplaintListProps,
  ProfileHandleProps,
  ProfileStatsProps,
} from './Profile.types.ts'

type WithCN<P> = P & { readonly children?: ReactNode; readonly className?: string }
const View = RNView as unknown as FC<WithCN<ViewProps>>
const Text = RNText as unknown as FC<WithCN<TextProps>>
type ListType = <ItemT>(p: FlatListProps<ItemT> & { className?: string }) => React.JSX.Element
const FlatList = RNFlatList as unknown as ListType

const Handle = ({
  handle,
  nullifierExcerpt,
  style,
  accessibilityLabel = 'Anonymous handle',
  testID,
}: ProfileHandleProps): React.JSX.Element => {
  const safeExcerpt = nullifierExcerpt.slice(0, 8)
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={style as ViewStyle | undefined}
      className="p-6 flex flex-col gap-3 rounded-xl bg-card border border-border"
    >
      <Text className="text-xs uppercase tracking-wider font-mono text-muted-foreground">
        Anonymous handle
      </Text>
      <Text className="text-2xl font-semibold text-foreground">{handle}</Text>
      <Text className="text-xs uppercase tracking-wider font-mono text-muted-foreground">
        Nullifier excerpt
      </Text>
      <Text className="text-sm font-mono text-foreground">{safeExcerpt}…</Text>
    </View>
  )
}

const Stats = ({
  stats,
  style,
  accessibilityLabel = 'Profile stats',
  testID,
}: ProfileStatsProps): React.JSX.Element => (
  <View
    accessibilityLabel={accessibilityLabel}
    testID={testID}
    style={style as ViewStyle | undefined}
    className="flex flex-row gap-3 p-4 rounded-xl bg-card border border-border"
  >
    <View className="flex-1 flex flex-col gap-1">
      <Text className="text-xs uppercase tracking-wider font-mono text-muted-foreground">
        Complaints
      </Text>
      <Text className="text-xl font-semibold text-foreground">{stats.complaintCount}</Text>
    </View>
    <View className="flex-1 flex flex-col gap-1">
      <Text className="text-xs uppercase tracking-wider font-mono text-muted-foreground">
        Comments
      </Text>
      <Text className="text-xl font-semibold text-foreground">{stats.commentCount}</Text>
    </View>
    <View className="flex-1 flex flex-col gap-1">
      <Text className="text-xs uppercase tracking-wider font-mono text-muted-foreground">
        Flags received
      </Text>
      <Text
        className={`text-xl font-semibold ${stats.flagsReceived > 0 ? 'text-destructive' : 'text-foreground'}`}
      >
        {stats.flagsReceived}
      </Text>
    </View>
  </View>
)

const ComplaintList = ({
  handle,
  items,
  loading,
  onItemOpen,
  style,
  accessibilityLabel,
  testID,
}: ProfileComplaintListProps): React.JSX.Element => {
  if (items.length === 0 && !loading) {
    return (
      <View
        accessibilityLabel={accessibilityLabel ?? `Complaints by ${handle}`}
        testID={testID}
        style={style as ViewStyle | undefined}
        className="items-center justify-center p-8"
      >
        <Text className="text-sm text-muted-foreground text-center">
          {handle} has not filed a complaint yet.
        </Text>
      </View>
    )
  }
  return (
    <FlatList
      accessibilityLabel={accessibilityLabel ?? `Complaints by ${handle}`}
      testID={testID}
      style={style as ViewStyle | undefined}
      data={items as readonly ComplaintSummary[]}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ flexDirection: 'column', gap: 12, padding: 16 }}
      renderItem={({ item }) => <ComplaintCard complaint={item} onOpen={onItemOpen} />}
      ListFooterComponent={
        loading ? (
          <View accessibilityLabel="Loading more" className="items-center p-4">
            <ActivityIndicator />
          </View>
        ) : null
      }
    />
  )
}

export const Profile = { Handle, Stats, ComplaintList } as const
export type ProfileCompound = typeof Profile

export { ComplaintList as ProfileComplaintList, Handle as ProfileHandle, Stats as ProfileStats }
