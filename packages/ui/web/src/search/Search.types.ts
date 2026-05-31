/**
 * `Search.*` compound contract — web (HeroUI v3).
 *
 * Surface: 5 — Postgres full-text search results (ADR-005: `tsvector` + GIN).
 *
 * Tokens consumed: surface, surfaceElevated, text, textMuted, border,
 *   ring, radius-md, space-2/3/4, motion.duration.fast.
 */

import type { ComplaintSummary } from '../complaint/Complaint.types.ts'

// ─── Search.Bar ───────────────────────────────────────────────────────
export interface SearchBarProps {
  readonly value: string
  readonly onChange: (next: string) => void
  readonly onSubmit: (query: string) => void
  readonly placeholder?: string
  readonly autoFocus?: boolean
  readonly className?: string
}

// ─── Search.Results ───────────────────────────────────────────────────
export interface SearchResultsProps {
  readonly query: string
  readonly results: ReadonlyArray<ComplaintSummary>
  readonly loading?: boolean
  readonly onItemOpen: (id: string) => void
  readonly className?: string
}

// ─── Search.EmptyState ────────────────────────────────────────────────
/**
 * Rendered when the FTS query returns zero rows. Variant distinguishes
 * "no query yet" vs "no matches" so copy can branch.
 */
export interface SearchEmptyStateProps {
  readonly variant: 'no-query' | 'no-matches'
  readonly query?: string
  readonly className?: string
}

export const SEARCH_SLOTS = {
  Bar: 'Search.Bar',
  Results: 'Search.Results',
  EmptyState: 'Search.EmptyState',
} as const

export type SearchSlot = (typeof SEARCH_SLOTS)[keyof typeof SEARCH_SLOTS]
