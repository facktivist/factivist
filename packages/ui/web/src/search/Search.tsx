/**
 * `Search.*` compound — web (HeroUI v3).
 *
 * Surface 5 — Postgres full-text search results (ADR-005). Driven by the
 * Claude Design prototype at
 * `docs/design/s1/handoff/product-design/factivist-s1/project/screens/search-results.jsx`.
 *
 * Slot contract:
 *   `Search.Bar`         — controlled input + submit + clear
 *   `Search.Results`     — list of ComplaintCard rows (reuses Complaint.Card)
 *   `Search.EmptyState`  — branch copy for "no query yet" vs "no matches"
 */

import type * as React from 'react'
import type { FormEvent } from 'react'

import { ComplaintCard } from '../complaint/Complaint.tsx'
import { Button, Spinner } from '../components/index.ts'
import type { SearchBarProps, SearchEmptyStateProps, SearchResultsProps } from './Search.types.ts'

const cx = (...parts: ReadonlyArray<string | false | null | undefined>): string =>
  parts.filter((p): p is string => typeof p === 'string' && p.length > 0).join(' ')

// ─── Search.Bar ────────────────────────────────────────────────────────

const Bar = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search complaints…',
  autoFocus,
  className,
}: SearchBarProps): React.JSX.Element => {
  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault()
    onSubmit(value.trim())
  }
  return (
    <search
      aria-label="Search complaints"
      className={cx(
        'flex items-center gap-2 p-2 rounded-full bg-[var(--color-card)] border border-[var(--color-border)]',
        className,
      )}
    >
      <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-1">
        <label className="sr-only" htmlFor="factivist-search-input">
          Search complaints
        </label>
        <input
          id="factivist-search-input"
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          // biome-ignore lint/a11y/noAutofocus: autoFocus is an explicit prop the caller controls
          autoFocus={autoFocus}
          autoComplete="off"
          className="flex-1 bg-transparent text-sm outline-none px-2 text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] rounded-full"
        />
        {value.length > 0 ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              onChange('')
              onSubmit('')
            }}
            className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] px-2"
          >
            ×
          </button>
        ) : null}
        <Button type="submit" variant="primary" isDisabled={value.trim().length === 0}>
          Search
        </Button>
      </form>
    </search>
  )
}

// ─── Search.EmptyState ─────────────────────────────────────────────────

const EmptyState = ({ variant, query, className }: SearchEmptyStateProps): React.JSX.Element => (
  <div
    role="status"
    className={cx(
      'flex flex-col items-center justify-center gap-2 p-8 text-center text-[var(--color-muted-foreground)]',
      className,
    )}
  >
    {variant === 'no-query' ? (
      <p className="text-sm">Type something above to search complaints.</p>
    ) : (
      <p className="text-sm">
        No matches
        {query ? (
          <>
            {' '}
            for “<span className="font-mono">{query}</span>”
          </>
        ) : null}
        .
      </p>
    )}
  </div>
)

// ─── Search.Results ────────────────────────────────────────────────────

const Results = ({
  query,
  results,
  loading,
  onItemOpen,
  className,
}: SearchResultsProps): React.JSX.Element => {
  if (query.trim().length === 0) {
    return <EmptyState variant="no-query" className={className} />
  }
  if (results.length === 0 && !loading) {
    return <EmptyState variant="no-matches" query={query} className={className} />
  }
  return (
    <ul
      aria-label={`Search results for "${query}"`}
      aria-busy={loading ? true : undefined}
      className={cx('flex flex-col gap-3 list-none p-0', className)}
    >
      {results.map((item) => (
        <li key={item.id}>
          <ComplaintCard complaint={item} onOpen={onItemOpen} />
        </li>
      ))}
      {loading ? (
        <li
          className="flex justify-center p-4"
          role="status"
          aria-label="Loading more search results"
        >
          <Spinner aria-hidden="true" />
        </li>
      ) : null}
    </ul>
  )
}

export const Search = { Bar, Results, EmptyState } as const

export type SearchCompound = typeof Search

export { Bar as SearchBar, EmptyState as SearchEmptyState, Results as SearchResults }
