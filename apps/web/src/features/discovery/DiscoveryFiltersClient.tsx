'use client'

/**
 * Discovery filters client island.
 *
 * Mounts the `Filter.*` compound from `@factivist/ui-web/filter` and
 * keeps the URL the source of truth — every change pushes a new
 * `searchParams` so the Server Component above re-renders the list with
 * the new dataset. No client-only state for `q` / `sort` / `category` /
 * `state-code`; the URL is canonical (mirrors the no-JS form fallback).
 *
 * The previous inline `<form method="get">` server-rendered fallback is
 * kept as a `<noscript>` shadow so the page degrades gracefully without
 * JS — the chip + sort interactions live in this island, but the
 * compose-style filters still submit via plain HTML.
 */

import type { DiscoveryFiltersInput } from '@factivist/shared/validators'
import { Filter } from '@factivist/ui-web/filter'
import { useQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'

import { apiClient } from '../../lib/api/client.ts'

interface DiscoveryFiltersClientProps {
  readonly filters: DiscoveryFiltersInput
}

export function DiscoveryFiltersClient({ filters }: DiscoveryFiltersClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiClient.listCategories(),
    staleTime: 60 * 60_000,
  })

  /**
   * Push a single search-param mutation onto the URL. Empty / null
   * values delete the key so the URL stays clean. Uses a transition so
   * the navigation does not block the input.
   */
  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(searchParams.toString())
      if (value === null || value === '') {
        next.delete(key)
      } else {
        next.set(key, value)
      }
      next.delete('page')
      startTransition(() => {
        router.push(`?${next.toString()}`)
      })
    },
    [router, searchParams],
  )

  // `Filter.CategoryChips` operates on numeric category ids, but our
  // discovery filter still keys on the category SLUG (string). Map the
  // two via the loaded `apiClient.listCategories()` payload.
  const categoryList = categoriesQuery.data ?? []
  const selectedSlug = filters.categorySlug ?? null
  const selectedIds: ReadonlyArray<number> = selectedSlug
    ? [categoryList.findIndex((c) => c.slug === selectedSlug)].filter((i) => i >= 0)
    : []

  return (
    <div className="flex flex-col gap-4" data-testid="discovery-filters">
      <Filter.SortToggle
        value={(filters.sort ?? 'newest') as 'newest' | 'most-commented' | 'most-flagged'}
        onChange={(sort) => updateParam('sort', sort)}
      />
      <Filter.CategoryChips
        categories={categoryList.map((c, i) => ({
          id: i,
          slug: c.slug,
          label: c.label,
        }))}
        selectedIds={selectedIds}
        onChange={(ids) => {
          const firstId = ids[0]
          if (firstId === undefined) {
            updateParam('category', null)
            return
          }
          const slug = categoryList[firstId]?.slug ?? null
          updateParam('category', slug)
        }}
      />
    </div>
  )
}
