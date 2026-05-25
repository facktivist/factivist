/**
 * `Complaint.*` compound — mobile (HeroUI Native + Uniwind).
 *
 * Mirror of `@factivist/ui-web/complaint` adjusted for React Native:
 * - `View`/`Text`/`Pressable` everywhere; no DOM nodes.
 * - `className` is forwarded to Uniwind at runtime; we cast the
 *   primitives once at import to add the prop type.
 * - `FlatList` powers the list under `onEndReached` (native paging
 *   ergonomic; web has `onLoadMore` button).
 *
 * S1 scope this commit (matches web): Composer, PhotoTray,
 * CategoryPicker, SubmitBar, Card, List. ConstituencyPicker /
 * PhotoGallery / FlagAction land in the S03 detail commit.
 *
 * Anonymity invariants per ADR-010 are identical to web.
 */

import type * as React from 'react'
import type { FC, ReactNode } from 'react'
import {
  ActivityIndicator,
  type FlatListProps,
  type ImageProps,
  type PressableProps,
  FlatList as RNFlatList,
  Image as RNImage,
  Pressable as RNPressable,
  Text as RNText,
  View as RNView,
  type TextProps,
  type ViewProps,
  type ViewStyle,
} from 'react-native'

import type {
  ComplaintCardProps,
  ComplaintCategoryPickerProps,
  ComplaintComposerProps,
  ComplaintListProps,
  ComplaintPhoto,
  ComplaintPhotoTrayProps,
  ComplaintSubmitBarProps,
  ComplaintSummary,
} from './Complaint.types.ts'

type WithCN<P> = P & { readonly children?: ReactNode; readonly className?: string }
const View = RNView as unknown as FC<WithCN<ViewProps>>
const Text = RNText as unknown as FC<WithCN<TextProps>>
const Pressable = RNPressable as unknown as FC<WithCN<PressableProps>>
const Image = RNImage as unknown as FC<ImageProps & { className?: string }>
type ListType = <ItemT>(p: FlatListProps<ItemT> & { className?: string }) => React.JSX.Element
const FlatList = RNFlatList as unknown as ListType

// ─── Complaint.Composer ────────────────────────────────────────────────

const Composer = ({
  children,
  status = 'idle',
  style,
  accessibilityLabel = 'File a complaint',
  testID,
}: ComplaintComposerProps): React.JSX.Element => (
  <View
    accessibilityLabel={accessibilityLabel}
    testID={testID}
    style={style as ViewStyle | undefined}
    className="flex flex-col gap-4 p-4 rounded-xl bg-card border border-border"
  >
    <View accessibilityLabel="composer-status" className="hidden">
      <Text>{status}</Text>
    </View>
    {children}
  </View>
)

// ─── Complaint.PhotoTray ───────────────────────────────────────────────

const photoToneClass = (state: ComplaintPhoto['uploadState']): string => {
  switch (state) {
    case 'failed':
      return 'border-destructive'
    case 'uploaded':
      return 'border-verified'
    case 'uploading':
      return 'border-primary'
    default:
      return 'border-border'
  }
}

const PhotoTray = ({
  photos,
  maxPhotos = 3,
  onAdd,
  onRemove,
  status = 'idle',
  style,
  accessibilityLabel = 'Photos',
  testID,
}: ComplaintPhotoTrayProps): React.JSX.Element => {
  const remaining = Math.max(0, maxPhotos - photos.length)
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={style as ViewStyle | undefined}
      className="flex flex-col gap-2"
    >
      <Text className="text-xs uppercase tracking-wider font-mono text-muted-foreground">
        Photos ({photos.length}/{maxPhotos})
      </Text>
      <View accessibilityLabel="status" className="hidden">
        <Text>{status}</Text>
      </View>
      <View className="flex flex-row flex-wrap gap-3">
        {photos.map((photo) => (
          <View
            key={photo.id}
            accessibilityLabel={`photo-${photo.id}`}
            className={`relative w-24 h-24 rounded-md border-2 overflow-hidden bg-muted ${photoToneClass(photo.uploadState)}`}
          >
            {photo.url ? (
              <Image
                source={{ uri: photo.url }}
                accessibilityLabel="photo preview"
                className="w-full h-full"
              />
            ) : null}
            {photo.uploadState === 'uploading' && photo.progress !== undefined ? (
              <View
                accessibilityLabel="upload progress"
                style={{ width: `${Math.round(photo.progress * 100)}%` } as ViewStyle}
                className="absolute bottom-0 left-0 h-1 bg-primary"
              />
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove photo ${photo.id}`}
              onPress={() => onRemove(photo.id)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-card border border-border items-center justify-center"
              testID={testID ? `${testID}-remove-${photo.id}` : undefined}
            >
              <Text className="text-xs text-foreground">×</Text>
            </Pressable>
          </View>
        ))}
        {remaining > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add photo"
            onPress={onAdd}
            className="w-24 h-24 rounded-md border-2 border-dashed border-border items-center justify-center"
            testID={testID ? `${testID}-add` : undefined}
          >
            <Text className="text-2xl text-muted-foreground">+</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

// ─── Complaint.CategoryPicker ──────────────────────────────────────────

const CategoryPicker = ({
  categories,
  selectedId,
  onChange,
  status = 'idle',
  style,
  accessibilityLabel = 'Complaint category',
  testID,
}: ComplaintCategoryPickerProps): React.JSX.Element => (
  <View
    accessibilityLabel={accessibilityLabel}
    accessibilityRole="radiogroup"
    testID={testID}
    style={style as ViewStyle | undefined}
    className="flex flex-col gap-2"
  >
    <Text className="text-xs uppercase tracking-wider font-mono text-muted-foreground">
      Category
    </Text>
    <View accessibilityLabel="status" className="hidden">
      <Text>{status}</Text>
    </View>
    <View className="flex flex-row flex-wrap gap-2">
      {categories.map((cat) => {
        const active = cat.id === selectedId
        return (
          <Pressable
            key={cat.id}
            accessibilityRole="radio"
            accessibilityLabel={cat.label}
            accessibilityState={{ checked: active }}
            onPress={() => onChange(cat.id)}
            className={`px-3 py-1.5 rounded-full border ${active ? 'bg-primary border-primary' : 'bg-card border-border'}`}
            testID={testID ? `${testID}-cat-${cat.id}` : undefined}
          >
            <Text className={`text-sm ${active ? 'text-primary-foreground' : 'text-foreground'}`}>
              {cat.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  </View>
)

// ─── Complaint.SubmitBar ───────────────────────────────────────────────

const SubmitBar = ({
  canSubmit,
  submitting,
  bodyLength,
  bodyLimit,
  onSubmit,
  onSaveDraft,
  style,
  accessibilityLabel = 'Complaint submission',
  testID,
}: ComplaintSubmitBarProps): React.JSX.Element => {
  const overBudget = bodyLength > bodyLimit
  const disabled = !canSubmit || submitting || overBudget
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="toolbar"
      testID={testID}
      style={style as ViewStyle | undefined}
      className="flex flex-row items-center justify-between gap-3 p-4 bg-card border-t border-border"
    >
      <Text
        accessibilityLabel="body-count"
        className={`text-xs font-mono ${overBudget ? 'text-destructive' : 'text-muted-foreground'}`}
      >
        {bodyLength}/{bodyLimit}
      </Text>
      <View className="flex flex-row gap-2">
        {onSaveDraft ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save draft"
            accessibilityState={{ disabled: submitting }}
            disabled={submitting}
            onPress={onSaveDraft}
            className="px-4 py-2 rounded-md border border-border"
            testID={testID ? `${testID}-draft` : undefined}
          >
            <Text className="text-sm text-foreground">Save draft</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Submit"
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={onSubmit}
          className="px-4 py-2 rounded-md bg-primary"
          testID={testID ? `${testID}-submit` : undefined}
        >
          {submitting ? (
            <ActivityIndicator accessibilityLabel="submitting" />
          ) : (
            <Text className="text-sm text-primary-foreground">Submit</Text>
          )}
        </Pressable>
      </View>
    </View>
  )
}

// ─── Complaint.Card ────────────────────────────────────────────────────

const formatLocation = (geo: ComplaintSummary['geo']): string =>
  [geo.state, geo.district, geo.constituency].filter(Boolean).join(' / ')

const formatDate = (iso: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
}

const ComplaintCard = ({
  complaint,
  onOpen,
  onFlag,
  style,
  accessibilityLabel,
  testID,
}: ComplaintCardProps): React.JSX.Element => (
  <View
    accessibilityLabel={accessibilityLabel ?? complaint.title}
    testID={testID}
    style={style as ViewStyle | undefined}
    className="flex flex-col gap-3 p-4 rounded-xl bg-card border border-border"
  >
    <View className="flex flex-row items-start justify-between gap-3">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${complaint.title}`}
        onPress={() => onOpen(complaint.id)}
        className="flex-1"
        testID={testID ? `${testID}-open` : undefined}
      >
        <Text className="text-base font-semibold text-foreground">{complaint.title}</Text>
      </Pressable>
      {onFlag ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Flag ${complaint.title}`}
          onPress={() => onFlag(complaint.id)}
          testID={testID ? `${testID}-flag` : undefined}
        >
          <Text className="text-xs text-muted-foreground">⚑</Text>
        </Pressable>
      ) : null}
    </View>
    <Text className="text-sm text-muted-foreground" numberOfLines={3}>
      {complaint.bodyExcerpt}
    </Text>
    <View className="flex flex-row items-center justify-between">
      <Text className="text-xs font-mono text-muted-foreground">
        {formatLocation(complaint.geo)}
      </Text>
      <Text className="text-xs font-mono text-muted-foreground">
        {formatDate(complaint.createdAt)}
      </Text>
    </View>
    {complaint.flagged ? (
      <Text accessibilityRole="alert" className="text-xs text-destructive">
        Flagged for review
      </Text>
    ) : null}
  </View>
)

// ─── Complaint.List ────────────────────────────────────────────────────

const ComplaintList = ({
  items,
  loading,
  emptyHint,
  onItemOpen,
  onEndReached,
  style,
  accessibilityLabel = 'Complaint list',
  testID,
}: ComplaintListProps): React.JSX.Element => {
  if (items.length === 0 && !loading) {
    return (
      <View
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        style={style as ViewStyle | undefined}
        className="items-center justify-center p-8"
      >
        <Text className="text-sm text-muted-foreground">{emptyHint ?? 'No complaints yet.'}</Text>
      </View>
    )
  }
  return (
    <FlatList
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={style as ViewStyle | undefined}
      data={items as readonly ComplaintSummary[]}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ flexDirection: 'column', gap: 12, padding: 16 }}
      renderItem={({ item }) => <ComplaintCard complaint={item} onOpen={onItemOpen} />}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
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

// ─── Compound export ───────────────────────────────────────────────────

export const Complaint = {
  Composer,
  PhotoTray,
  CategoryPicker,
  SubmitBar,
  Card: ComplaintCard,
  List: ComplaintList,
} as const

export type ComplaintCompound = typeof Complaint

export type { ComplaintSummary }
export {
  CategoryPicker as ComplaintCategoryPicker,
  ComplaintCard,
  ComplaintList,
  Composer as ComplaintComposer,
  formatDate as formatComplaintDate,
  formatLocation as formatComplaintLocation,
  PhotoTray as ComplaintPhotoTray,
  SubmitBar as ComplaintSubmitBar,
}
