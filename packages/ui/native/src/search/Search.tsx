/**
 * `Search.*` compound — mobile (HeroUI Native + Uniwind).
 *
 * Mirrors the web slot set: Bar, Results, EmptyState. Bar uses RN
 * TextInput with returnKeyType="search" + onSubmitEditing.
 */

import type * as React from 'react'
import type { FC, ReactNode } from 'react'
import {
  ActivityIndicator,
  type FlatListProps,
  type PressableProps,
  FlatList as RNFlatList,
  Pressable as RNPressable,
  Text as RNText,
  TextInput as RNTextInput,
  View as RNView,
  type TextInputProps,
  type TextProps,
  type ViewProps,
  type ViewStyle,
} from 'react-native'

import { ComplaintCard } from '../complaint/Complaint.tsx'
import type { ComplaintSummary } from '../complaint/Complaint.types.ts'
import type { SearchBarProps, SearchEmptyStateProps, SearchResultsProps } from './Search.types.ts'

type WithCN<P> = P & { readonly children?: ReactNode; readonly className?: string }
const View = RNView as unknown as FC<WithCN<ViewProps>>
const Text = RNText as unknown as FC<WithCN<TextProps>>
const Pressable = RNPressable as unknown as FC<WithCN<PressableProps>>
const TextInput = RNTextInput as unknown as FC<TextInputProps & { className?: string }>
type ListType = <ItemT>(p: FlatListProps<ItemT> & { className?: string }) => React.JSX.Element
const FlatList = RNFlatList as unknown as ListType

// ─── Search.Bar ────────────────────────────────────────────────────────

const Bar = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search complaints…',
  autoFocus,
  style,
  accessibilityLabel = 'Search complaints',
  testID,
}: SearchBarProps): React.JSX.Element => (
  <View
    accessibilityLabel={accessibilityLabel}
    testID={testID}
    style={style as ViewStyle | undefined}
    className="flex flex-row items-center gap-2 p-2 rounded-full bg-card border border-border"
  >
    <TextInput
      accessibilityLabel="Search complaints input"
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      returnKeyType="search"
      autoFocus={autoFocus}
      onSubmitEditing={() => onSubmit(value.trim())}
      className="flex-1 px-2 text-sm text-foreground"
      testID={testID ? `${testID}-input` : undefined}
    />
    {value.length > 0 ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Clear search"
        onPress={() => {
          onChange('')
          onSubmit('')
        }}
        className="px-2"
      >
        <Text className="text-sm text-muted-foreground">×</Text>
      </Pressable>
    ) : null}
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Search"
      accessibilityState={{ disabled: value.trim().length === 0 }}
      disabled={value.trim().length === 0}
      onPress={() => onSubmit(value.trim())}
      className="px-3 py-1 rounded-full bg-primary"
      testID={testID ? `${testID}-submit` : undefined}
    >
      <Text className="text-sm text-primary-foreground">Search</Text>
    </Pressable>
  </View>
)

// ─── Search.EmptyState ─────────────────────────────────────────────────

const EmptyState = ({
  variant,
  query,
  style,
  accessibilityLabel,
  testID,
}: SearchEmptyStateProps): React.JSX.Element => {
  const message =
    variant === 'no-query'
      ? 'Type something above to search complaints.'
      : query
        ? `No matches for "${query}".`
        : 'No matches.'
  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel={accessibilityLabel ?? 'Search empty state'}
      testID={testID}
      style={style as ViewStyle | undefined}
      className="items-center justify-center p-8"
    >
      <Text className="text-sm text-muted-foreground text-center">{message}</Text>
    </View>
  )
}

// ─── Search.Results ────────────────────────────────────────────────────

const Results = ({
  query,
  results,
  loading,
  onItemOpen,
  onEndReached,
  style,
  accessibilityLabel,
  testID,
}: SearchResultsProps): React.JSX.Element => {
  if (query.trim().length === 0) {
    return <EmptyState variant="no-query" testID={testID} />
  }
  if (results.length === 0 && !loading) {
    return <EmptyState variant="no-matches" query={query} testID={testID} />
  }
  return (
    <FlatList
      accessibilityLabel={accessibilityLabel ?? `Search results for "${query}"`}
      testID={testID}
      style={style as ViewStyle | undefined}
      data={results as readonly ComplaintSummary[]}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ flexDirection: 'column', gap: 12, padding: 16 }}
      renderItem={({ item }) => <ComplaintCard complaint={item} onOpen={onItemOpen} />}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        loading ? (
          <View accessibilityLabel="Loading more search results" className="items-center p-4">
            <ActivityIndicator />
          </View>
        ) : null
      }
    />
  )
}

export const Search = { Bar, Results, EmptyState } as const

export type SearchCompound = typeof Search

export { Bar as SearchBar, EmptyState as SearchEmptyState, Results as SearchResults }
