/**
 * `Filter.*` compound contract — web (HeroUI v3).
 *
 * Surface: 4 — Browse / filter by state → district → constituency.
 *
 * Tokens consumed: surface, surfaceElevated, text, textMuted, border,
 *   borderStrong, brand, accent, accentForeground, radius-md/full,
 *   space-2/3/4, motion.duration.fast.
 */

import type { ComplaintCategory, ConstituencyNode } from '../complaint/Complaint.types.ts'

/** Sort order for the browse view. */
export type ComplaintSort = 'newest' | 'most-commented' | 'most-flagged'

// ─── Filter.ConstituencyTree ──────────────────────────────────────────
/**
 * Lazy-loaded tree picker for state → district → constituency. Multi-
 * select is OUT for S1 — single constituency or `null` (= all).
 */
export interface FilterConstituencyTreeProps {
  readonly value: string | null
  readonly onChange: (constituencyCode: string | null) => void
  readonly loadChildren: (parentCode: string | null) => Promise<ReadonlyArray<ConstituencyNode>>
  readonly className?: string
}

// ─── Filter.CategoryChips ─────────────────────────────────────────────
/**
 * Multi-select chip row over the 35-item S1 category taxonomy. An empty
 * selection means "all categories".
 */
export interface FilterCategoryChipsProps {
  readonly categories: ReadonlyArray<ComplaintCategory>
  readonly selectedIds: ReadonlyArray<number>
  readonly onChange: (ids: ReadonlyArray<number>) => void
  readonly className?: string
}

// ─── Filter.SortToggle ────────────────────────────────────────────────
/** Segmented control for `ComplaintSort`. */
export interface FilterSortToggleProps {
  readonly value: ComplaintSort
  readonly onChange: (sort: ComplaintSort) => void
  readonly className?: string
}

export const FILTER_SLOTS = {
  ConstituencyTree: 'Filter.ConstituencyTree',
  CategoryChips: 'Filter.CategoryChips',
  SortToggle: 'Filter.SortToggle',
} as const

export type FilterSlot = (typeof FILTER_SLOTS)[keyof typeof FILTER_SLOTS]
