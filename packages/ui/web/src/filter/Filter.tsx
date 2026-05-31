/**
 * `Filter.*` compound — web (HeroUI v3).
 *
 * Surface 4 — Browse / filter by category + constituency + sort order.
 *
 * Driven by the Claude Design prototypes at
 * `docs/design/s1/handoff/product-design/factivist-s1/project/screens/discovery.jsx`.
 *
 * ## Tokens consumed (semantic only)
 *   --color-card, --color-foreground, --color-muted, --color-muted-foreground,
 *   --color-primary, --color-primary-foreground, --color-border,
 *   --radius-{md,lg,full}, --duration-{fast}.
 *
 * ## Slot contract
 *   `Filter.ConstituencyTree` — controlled state → district → constituency lazy picker
 *   `Filter.CategoryChips`    — multi-select chip row (empty = all)
 *   `Filter.SortToggle`       — segmented control for `ComplaintSort`
 */

import type * as React from 'react'
import { useEffect, useState } from 'react'

import type { ConstituencyNode } from '../complaint/Complaint.types.ts'
import { Button, Spinner } from '../components/index.ts'
import type {
  ComplaintSort,
  FilterCategoryChipsProps,
  FilterConstituencyTreeProps,
  FilterSortToggleProps,
} from './Filter.types.ts'

const cx = (...parts: ReadonlyArray<string | false | null | undefined>): string =>
  parts.filter((p): p is string => typeof p === 'string' && p.length > 0).join(' ')

// ─── Filter.ConstituencyTree ───────────────────────────────────────────

interface TreeLevel {
  readonly parentCode: string | null
  readonly label: string
  readonly nodes: ReadonlyArray<ConstituencyNode>
}

const ConstituencyTree = ({
  value,
  onChange,
  loadChildren,
  className,
}: FilterConstituencyTreeProps): React.JSX.Element => {
  const [levels, setLevels] = useState<TreeLevel[]>([])
  const [loading, setLoading] = useState(false)

  // Bootstrap the root level on first render.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadChildren(null)
      .then((nodes) => {
        if (cancelled) return
        setLevels([{ parentCode: null, label: 'State', nodes }])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [loadChildren])

  const pick = async (node: ConstituencyNode, levelIdx: number): Promise<void> => {
    onChange(node.level === 'constituency' ? node.code : value)
    if (node.level === 'constituency') return
    setLoading(true)
    try {
      const children = await loadChildren(node.code)
      const nextLabel = node.level === 'state' ? 'District' : 'Constituency'
      // Trim deeper levels — picking a new parent re-anchors.
      setLevels((prev) => [
        ...prev.slice(0, levelIdx + 1),
        { parentCode: node.code, label: nextLabel, nodes: children },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      aria-label="Constituency picker"
      className={cx(
        'flex flex-col gap-2 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]',
        className,
      )}
    >
      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange(null)
            setLevels(levels.slice(0, 1))
          }}
          className="self-start text-xs font-mono uppercase tracking-wider text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
        >
          Clear constituency filter
        </button>
      ) : null}
      {levels.map((level, idx) => (
        <fieldset
          key={`level-${level.parentCode ?? 'root'}-${level.label}`}
          className="flex flex-col gap-1"
        >
          <legend className="text-xs font-mono uppercase tracking-wider text-[var(--color-muted-foreground)]">
            {level.label}
          </legend>
          <div className="flex flex-wrap gap-1">
            {level.nodes.map((node) => {
              const active = node.code === value
              return (
                <button
                  key={node.code}
                  type="button"
                  onClick={() => {
                    void pick(node, idx)
                  }}
                  className={cx(
                    'px-2 py-1 text-xs rounded-full border',
                    active
                      ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border-[var(--color-primary)]'
                      : 'bg-[var(--color-card)] text-[var(--color-foreground)] border-[var(--color-border)]',
                  )}
                >
                  {node.label}
                </button>
              )
            })}
          </div>
        </fieldset>
      ))}
      {loading ? (
        <div
          className="flex justify-center p-2"
          role="status"
          aria-label="Loading constituency level"
        >
          <Spinner aria-hidden="true" />
        </div>
      ) : null}
    </section>
  )
}

// ─── Filter.CategoryChips ──────────────────────────────────────────────

const CategoryChips = ({
  categories,
  selectedIds,
  onChange,
  className,
}: FilterCategoryChipsProps): React.JSX.Element => {
  const selected = new Set(selectedIds)
  const toggle = (id: number): void => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange([...next])
  }
  return (
    <fieldset aria-label="Filter by category" className={cx('flex flex-wrap gap-1', className)}>
      {selectedIds.length > 0 ? (
        <button
          type="button"
          aria-label="Clear all category filters"
          onClick={() => onChange([])}
          className="px-2 py-1 text-xs rounded-full border border-dashed border-[var(--color-border)] text-[var(--color-muted-foreground)]"
        >
          Clear ({selectedIds.length})
        </button>
      ) : null}
      {categories.map((cat) => {
        const active = selected.has(cat.id)
        return (
          <button
            key={cat.id}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(cat.id)}
            className={cx(
              'px-2 py-1 text-xs rounded-full border',
              active
                ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border-[var(--color-primary)]'
                : 'bg-[var(--color-card)] text-[var(--color-foreground)] border-[var(--color-border)]',
            )}
          >
            {cat.label}
          </button>
        )
      })}
    </fieldset>
  )
}

// ─── Filter.SortToggle ─────────────────────────────────────────────────

const SORT_OPTIONS: ReadonlyArray<{ readonly value: ComplaintSort; readonly label: string }> = [
  { value: 'newest', label: 'Newest' },
  { value: 'most-commented', label: 'Most commented' },
  { value: 'most-flagged', label: 'Most flagged' },
]

const SortToggle = ({ value, onChange, className }: FilterSortToggleProps): React.JSX.Element => (
  <div
    role="radiogroup"
    aria-label="Sort order"
    className={cx('inline-flex rounded-full border border-[var(--color-border)] p-0.5', className)}
  >
    {SORT_OPTIONS.map((opt) => {
      const active = opt.value === value
      return (
        <label
          key={opt.value}
          className={cx(
            'px-3 py-1 text-xs rounded-full cursor-pointer transition-colors duration-[var(--duration-fast)]',
            active
              ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
              : 'text-[var(--color-foreground)]',
          )}
        >
          <input
            type="radio"
            name="complaint-sort"
            value={opt.value}
            checked={active}
            onChange={() => onChange(opt.value)}
            className="sr-only"
            aria-label={opt.label}
          />
          {opt.label}
        </label>
      )
    })}
  </div>
)

export const Filter = {
  ConstituencyTree,
  CategoryChips,
  SortToggle,
} as const

export type FilterCompound = typeof Filter

export {
  CategoryChips as FilterCategoryChips,
  ConstituencyTree as FilterConstituencyTree,
  SortToggle as FilterSortToggle,
}

// Re-export the sort default + button helper consumers commonly want.
export const DEFAULT_SORT: ComplaintSort = 'newest'

// Surface the segmented-toggle option list so callers can reuse it in
// custom UIs (e.g. a search results sort dropdown).
export { SORT_OPTIONS }

// Surface a tiny consumer helper for "is filter active" checks.
export const isFilterActive = (
  constituency: string | null,
  categoryIds: ReadonlyArray<number>,
  sort: ComplaintSort,
): boolean => constituency !== null || categoryIds.length > 0 || sort !== 'newest'

// Re-export Button for the consumer that wants a `Filter.ApplyButton`
// without re-importing from `../components`.
export { Button as FilterButton }
