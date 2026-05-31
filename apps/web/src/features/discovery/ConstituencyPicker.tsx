'use client'

import { Button, Input } from '@factivist/ui-web/components'
import { useQuery } from '@tanstack/react-query'
import { useId, useMemo, useState } from 'react'

import { type ApiConstituencyNode, apiClient } from '../../lib/api/client.ts'

/**
 * Combobox + breadcrumb constituency picker.
 *
 * - ADR-017: HeroUI Combobox primary input + Breadcrumb anchor.
 * - ADR-013: manual selection only; no `navigator.geolocation` import.
 *
 * The combobox surfaces fuzzy matches across all four levels (state /
 * district / PC / AC). Each accepted match advances the breadcrumb and
 * narrows the next-level query. Clicking a breadcrumb segment rewinds
 * the selection to that scope.
 *
 * Anonymity invariant — the picker NEVER calls a geolocation API.
 */

export interface ConstituencySelection {
  readonly stateCode?: string
  readonly stateLabel?: string
  readonly districtCode?: string
  readonly districtLabel?: string
  readonly pcCode?: string
  readonly pcLabel?: string
  readonly acCode?: string
  readonly acLabel?: string
}

export interface ConstituencyPickerProps {
  readonly value: ConstituencySelection
  readonly onChange: (next: ConstituencySelection) => void
  readonly className?: string
}

type Level = 'state' | 'district' | 'pc' | 'ac'

const NEXT_LEVEL: Record<Level, Level | null> = {
  state: 'district',
  district: 'pc',
  pc: 'ac',
  ac: null,
}

const LEVEL_LABEL: Record<Level, string> = {
  state: 'State',
  district: 'District',
  pc: 'PC (Lok Sabha)',
  ac: 'AC (Vidhan Sabha)',
}

/** Compute the next level we need to fill, given the current selection. */
const nextLevelToFill = (sel: ConstituencySelection): Level | null => {
  if (!sel.stateCode) return 'state'
  if (!sel.districtCode) return 'district'
  if (!sel.pcCode) return 'pc'
  if (!sel.acCode) return 'ac'
  return null
}

/** Parent code for a given level lookup. */
const parentCodeFor = (level: Level, sel: ConstituencySelection): string | undefined => {
  switch (level) {
    case 'state':
      return undefined
    case 'district':
      return sel.stateCode
    case 'pc':
      return sel.districtCode
    case 'ac':
      return sel.pcCode
  }
}

export function ConstituencyPicker({ value, onChange, className }: ConstituencyPickerProps) {
  const level = nextLevelToFill(value)
  const inputId = useId()
  const [query, setQuery] = useState('')

  // List query for the active level (no search term).
  const listQuery = useQuery({
    queryKey: ['constituency', 'list', level, parentCodeFor(level ?? 'state', value)],
    queryFn: () =>
      level
        ? apiClient.listConstituency(level, parentCodeFor(level, value))
        : Promise.resolve([] as ReadonlyArray<ApiConstituencyNode>),
    enabled: level !== null && query.trim().length === 0,
    staleTime: 5 * 60_000,
  })

  // Fuzzy search query.
  const searchQuery = useQuery({
    queryKey: ['constituency', 'search', query.trim(), level],
    queryFn: () => apiClient.searchConstituency(query.trim()),
    enabled: query.trim().length >= 2 && level !== null,
    staleTime: 30_000,
  })

  const options = useMemo<ReadonlyArray<ApiConstituencyNode>>(() => {
    if (query.trim().length >= 2) return searchQuery.data ?? []
    return listQuery.data ?? []
  }, [listQuery.data, searchQuery.data, query])

  const handlePick = (node: ApiConstituencyNode) => {
    let next: ConstituencySelection
    if (node.level === 'state') {
      next = { stateCode: node.code, stateLabel: node.label }
    } else if (node.level === 'district') {
      next = {
        stateCode: value.stateCode,
        stateLabel: value.stateLabel,
        districtCode: node.code,
        districtLabel: node.label,
      }
    } else if (node.level === 'pc') {
      next = {
        stateCode: value.stateCode,
        stateLabel: value.stateLabel,
        districtCode: value.districtCode,
        districtLabel: value.districtLabel,
        pcCode: node.code,
        pcLabel: node.label,
      }
    } else {
      next = {
        stateCode: value.stateCode,
        stateLabel: value.stateLabel,
        districtCode: value.districtCode,
        districtLabel: value.districtLabel,
        pcCode: value.pcCode,
        pcLabel: value.pcLabel,
        acCode: node.code,
        acLabel: node.label,
      }
    }
    setQuery('')
    onChange(next)
  }

  const handleBreadcrumb = (rewindTo: Level) => {
    let next: ConstituencySelection
    if (rewindTo === 'state') {
      next = {}
    } else if (rewindTo === 'district') {
      next = { stateCode: value.stateCode, stateLabel: value.stateLabel }
    } else if (rewindTo === 'pc') {
      next = {
        stateCode: value.stateCode,
        stateLabel: value.stateLabel,
        districtCode: value.districtCode,
        districtLabel: value.districtLabel,
      }
    } else {
      next = {
        stateCode: value.stateCode,
        stateLabel: value.stateLabel,
        districtCode: value.districtCode,
        districtLabel: value.districtLabel,
        pcCode: value.pcCode,
        pcLabel: value.pcLabel,
      }
    }
    setQuery('')
    onChange(next)
  }

  const breadcrumbs: { readonly level: Level; readonly label: string }[] = []
  if (value.stateLabel) breadcrumbs.push({ level: 'state', label: value.stateLabel })
  if (value.districtLabel) breadcrumbs.push({ level: 'district', label: value.districtLabel })
  if (value.pcLabel) breadcrumbs.push({ level: 'pc', label: value.pcLabel })
  if (value.acLabel) breadcrumbs.push({ level: 'ac', label: value.acLabel })

  const isComplete = level === null
  const listId = `${inputId}-listbox`

  return (
    <div className={className} data-testid="constituency-picker">
      <nav aria-label="Constituency selection" className="mb-2">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          {breadcrumbs.length === 0 ? <li className="italic">No constituency selected</li> : null}
          {breadcrumbs.map((segment, i) => {
            const isLast = i === breadcrumbs.length - 1
            return (
              <li key={segment.level} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleBreadcrumb(segment.level)}
                  className="rounded px-1 py-0.5 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  aria-current={isLast ? 'step' : undefined}
                  data-testid={`crumb-${segment.level}`}
                >
                  {segment.label}
                </button>
                {!isLast ? <span aria-hidden="true">›</span> : null}
              </li>
            )
          })}
        </ol>
      </nav>

      {isComplete ? (
        <div className="rounded-md border p-3 text-sm" role="status">
          Selected.{' '}
          <Button variant="ghost" onPress={() => handleBreadcrumb('state')}>
            Reset
          </Button>
        </div>
      ) : (
        <div>
          <label htmlFor={inputId} className="mb-1 block text-sm font-medium">
            {LEVEL_LABEL[level]} — search or pick
          </label>
          <Input
            id={inputId}
            type="search"
            role="combobox"
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={options.length > 0}
            placeholder={`Search ${LEVEL_LABEL[level]}…`}
            value={query}
            onChange={(e) => setQuery((e.target as HTMLInputElement).value)}
            data-testid="constituency-search"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            We never use GPS. Pick your constituency manually.
          </p>
          <div
            id={listId}
            role="listbox"
            aria-label={`${LEVEL_LABEL[level]} options`}
            className="mt-2 max-h-64 overflow-auto rounded-md border"
          >
            {listQuery.isLoading || searchQuery.isLoading ? (
              <div className="p-2 text-sm text-muted-foreground" role="status">
                Loading…
              </div>
            ) : null}
            {options.length === 0 && !(listQuery.isLoading || searchQuery.isLoading) ? (
              <div className="p-2 text-sm text-muted-foreground">No matches.</div>
            ) : null}
            {options.map((node) => (
              <button
                key={`${node.level}:${node.code}`}
                type="button"
                role="option"
                aria-selected="false"
                onClick={() => handlePick(node)}
                className="block w-full px-2 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                data-testid={`option-${node.level}-${node.code}`}
              >
                <span className="font-medium">{node.label}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {LEVEL_LABEL[node.level]}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export { NEXT_LEVEL as CONSTITUENCY_NEXT_LEVEL }
