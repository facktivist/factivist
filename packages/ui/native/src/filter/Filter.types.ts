/**
 * `Filter.*` compound contract — mobile (HeroUI Native + Uniwind).
 *
 * Mobile deltas vs web:
 *   - `ConstituencyTree` renders as a stacked bottom-sheet (state → district
 *     → constituency) rather than an inline cascading dropdown.
 *   - `CategoryChips` use horizontal momentum-scrolling.
 *   - `style` + `accessibilityLabel` + `testID` via `NativeProps`.
 */

import type { ComplaintCategory, ConstituencyNode } from '../complaint/Complaint.types.ts'

export type ComplaintSort = 'newest' | 'most-commented' | 'most-flagged'

interface NativeProps {
  readonly style?: unknown
  readonly accessibilityLabel?: string
  readonly testID?: string
}

export interface FilterConstituencyTreeProps extends NativeProps {
  readonly value: string | null
  readonly onChange: (constituencyCode: string | null) => void
  readonly loadChildren: (parentCode: string | null) => Promise<ReadonlyArray<ConstituencyNode>>
}

export interface FilterCategoryChipsProps extends NativeProps {
  readonly categories: ReadonlyArray<ComplaintCategory>
  readonly selectedIds: ReadonlyArray<number>
  readonly onChange: (ids: ReadonlyArray<number>) => void
}

export interface FilterSortToggleProps extends NativeProps {
  readonly value: ComplaintSort
  readonly onChange: (sort: ComplaintSort) => void
}

export const FILTER_SLOTS = {
  ConstituencyTree: 'Filter.ConstituencyTree',
  CategoryChips: 'Filter.CategoryChips',
  SortToggle: 'Filter.SortToggle',
} as const

export type FilterSlot = (typeof FILTER_SLOTS)[keyof typeof FILTER_SLOTS]
