/**
 * `Search.*` compound contract — mobile (HeroUI Native + Uniwind).
 *
 * Mobile deltas vs web:
 *   - `Bar` integrates with the iOS / Android keyboard "search" action.
 *   - `Results` uses FlatList virtualization (`onEndReached` instead of
 *     web's `onLoadMore` callback, but semantics match).
 *   - `style` + `accessibilityLabel` + `testID` via `NativeProps`.
 */

import type { ComplaintSummary } from '../complaint/Complaint.types.ts'

interface NativeProps {
  readonly style?: unknown
  readonly accessibilityLabel?: string
  readonly testID?: string
}

export interface SearchBarProps extends NativeProps {
  readonly value: string
  readonly onChange: (next: string) => void
  readonly onSubmit: (query: string) => void
  readonly placeholder?: string
  readonly autoFocus?: boolean
}

export interface SearchResultsProps extends NativeProps {
  readonly query: string
  readonly results: ReadonlyArray<ComplaintSummary>
  readonly loading?: boolean
  readonly onItemOpen: (id: string) => void
  readonly onEndReached?: () => void
}

export interface SearchEmptyStateProps extends NativeProps {
  readonly variant: 'no-query' | 'no-matches'
  readonly query?: string
}

export const SEARCH_SLOTS = {
  Bar: 'Search.Bar',
  Results: 'Search.Results',
  EmptyState: 'Search.EmptyState',
} as const

export type SearchSlot = (typeof SEARCH_SLOTS)[keyof typeof SEARCH_SLOTS]
