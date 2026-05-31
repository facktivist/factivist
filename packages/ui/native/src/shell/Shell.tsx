/**
 * `Shell.*` compound — mobile (HeroUI Native + Uniwind).
 *
 * Slots: TabBar (true bottom bar; safe-area inset honoured by the
 * consumer via the `bottomInset` prop), OfflineBanner (sticky-top with
 * Retry), SkeletonRow (animated placeholder; the consumer can wrap in
 * Reanimated's `withRepeat` when prefers-reduced-motion is off).
 */

import type * as React from 'react'
import type { FC, ReactNode } from 'react'
import {
  type PressableProps,
  Pressable as RNPressable,
  Text as RNText,
  View as RNView,
  type TextProps,
  type ViewProps,
  type ViewStyle,
} from 'react-native'

import type {
  ShellOfflineBannerProps,
  ShellSkeletonRowProps,
  ShellTabBarProps,
} from './Shell.types.ts'

type WithCN<P> = P & { readonly children?: ReactNode; readonly className?: string }
const View = RNView as unknown as FC<WithCN<ViewProps>>
const Text = RNText as unknown as FC<WithCN<TextProps>>
const Pressable = RNPressable as unknown as FC<WithCN<PressableProps>>

const TabBar = ({
  items,
  activeId,
  onSelect,
  bottomInset = 0,
  style,
  accessibilityLabel = 'Primary navigation',
  testID,
}: ShellTabBarProps): React.JSX.Element => (
  <View
    accessibilityLabel={accessibilityLabel}
    accessibilityRole="tablist"
    testID={testID}
    style={
      {
        ...((style as ViewStyle | undefined) ?? {}),
        paddingBottom: bottomInset,
      } as ViewStyle
    }
    className="flex flex-row items-stretch gap-1 p-1 bg-card border-t border-border"
  >
    {items.map((item) => {
      const active = item.id === activeId
      return (
        <Pressable
          key={item.id}
          accessibilityRole="tab"
          accessibilityLabel={item.label}
          accessibilityState={{ selected: active }}
          onPress={() => onSelect(item.id)}
          className={`flex-1 items-center justify-center py-2 rounded-md ${active ? 'bg-muted' : ''}`}
          testID={testID ? `${testID}-${item.id}` : undefined}
        >
          <Text className="text-base">{item.icon}</Text>
          <Text
            className={`text-xs ${active ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}
          >
            {item.label}
          </Text>
          {typeof item.badge === 'number' ? (
            <View
              accessibilityLabel={item.badge === 0 ? 'new' : `${item.badge} unread`}
              className={`absolute top-1 right-3 rounded-full bg-destructive ${item.badge === 0 ? 'w-2 h-2' : 'px-1.5 py-0.5'}`}
            >
              {item.badge > 0 ? (
                <Text className="text-xs font-mono text-card">{item.badge}</Text>
              ) : null}
            </View>
          ) : null}
        </Pressable>
      )
    })}
  </View>
)

const OfflineBanner = ({
  mode,
  onRetry,
  style,
  accessibilityLabel,
  testID,
}: ShellOfflineBannerProps): React.JSX.Element => {
  const message =
    mode === 'offline'
      ? 'You are offline. Submissions will be queued.'
      : 'Network unavailable — showing cached complaints.'
  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel={accessibilityLabel ?? message}
      testID={testID}
      style={style as ViewStyle | undefined}
      className="flex flex-row items-center justify-between gap-3 px-4 py-2 border-b border-border"
    >
      <Text className="text-sm text-warning-900 flex-1">{message}</Text>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry"
          onPress={onRetry}
          className="px-3 py-1 rounded-md border border-border"
          testID={testID ? `${testID}-retry` : undefined}
        >
          <Text className="text-sm text-foreground">Retry</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const SkeletonRow = ({
  lines = 2,
  withAvatar,
  withThumbnail,
  style,
  accessibilityLabel = 'Loading',
  testID,
}: ShellSkeletonRowProps): React.JSX.Element => (
  <View
    accessibilityLabel={accessibilityLabel}
    testID={testID}
    style={style as ViewStyle | undefined}
    className="flex flex-row items-start gap-3 p-3 rounded-md border border-border bg-card"
  >
    {withAvatar ? <View className="w-10 h-10 rounded-full bg-muted" /> : null}
    <View className="flex-1 flex flex-col gap-2">
      {Array.from({ length: lines }, (_, i) => (
        <View
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton bars are interchangeable
          key={`bar-${i}`}
          className={`h-3 rounded-full bg-muted ${i === lines - 1 ? 'w-1/2' : 'w-full'}`}
        />
      ))}
    </View>
    {withThumbnail ? <View className="w-16 h-16 rounded-md bg-muted" /> : null}
  </View>
)

export const Shell = { TabBar, OfflineBanner, SkeletonRow } as const
export type ShellCompound = typeof Shell

export {
  OfflineBanner as ShellOfflineBanner,
  SkeletonRow as ShellSkeletonRow,
  TabBar as ShellTabBar,
}
