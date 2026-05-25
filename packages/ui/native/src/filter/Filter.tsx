/**
 * `Filter.*` compound — mobile (HeroUI Native + Uniwind).
 *
 * Same slot set as the web compound, simplified for RN primitives.
 * ConstituencyTree is stateful (drill-down levels); CategoryChips +
 * SortToggle are pure.
 */

import type * as React from 'react'
import type { FC, ReactNode } from 'react'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  type PressableProps,
  Pressable as RNPressable,
  ScrollView as RNScrollView,
  Text as RNText,
  View as RNView,
  type ScrollViewProps,
  type TextProps,
  type ViewProps,
  type ViewStyle,
} from 'react-native'

import type { ConstituencyNode } from '../complaint/Complaint.types.ts'
import type {
  ComplaintSort,
  FilterCategoryChipsProps,
  FilterConstituencyTreeProps,
  FilterSortToggleProps,
} from './Filter.types.ts'

type WithCN<P> = P & { readonly children?: ReactNode; readonly className?: string }
const View = RNView as unknown as FC<WithCN<ViewProps>>
const Text = RNText as unknown as FC<WithCN<TextProps>>
const Pressable = RNPressable as unknown as FC<WithCN<PressableProps>>
const ScrollView = RNScrollView as unknown as FC<WithCN<ScrollViewProps>>

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
  style,
  accessibilityLabel = 'Constituency picker',
  testID,
}: FilterConstituencyTreeProps): React.JSX.Element => {
  const [levels, setLevels] = useState<TreeLevel[]>([])
  const [loading, setLoading] = useState(false)

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

  const pick = useCallback(
    async (node: ConstituencyNode, levelIdx: number): Promise<void> => {
      onChange(node.level === 'constituency' ? node.code : value)
      if (node.level === 'constituency') return
      setLoading(true)
      try {
        const children = await loadChildren(node.code)
        const nextLabel = node.level === 'state' ? 'District' : 'Constituency'
        setLevels((prev) => [
          ...prev.slice(0, levelIdx + 1),
          { parentCode: node.code, label: nextLabel, nodes: children },
        ])
      } finally {
        setLoading(false)
      }
    },
    [loadChildren, onChange, value],
  )

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={style as ViewStyle | undefined}
      className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-card"
    >
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear constituency filter"
          onPress={() => {
            onChange(null)
            setLevels((prev) => prev.slice(0, 1))
          }}
          className="self-start"
        >
          <Text className="text-xs uppercase tracking-wider font-mono text-muted-foreground">
            Clear constituency filter
          </Text>
        </Pressable>
      ) : null}
      {levels.map((level, idx) => (
        <View
          key={`level-${level.parentCode ?? 'root'}-${level.label}`}
          accessibilityLabel={level.label}
          className="flex flex-col gap-1"
        >
          <Text className="text-xs uppercase tracking-wider font-mono text-muted-foreground">
            {level.label}
          </Text>
          <View className="flex flex-row flex-wrap gap-1">
            {level.nodes.map((node) => {
              const active = node.code === value
              return (
                <Pressable
                  key={node.code}
                  accessibilityRole="button"
                  accessibilityLabel={node.label}
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    void pick(node, idx)
                  }}
                  className={`px-2 py-1 rounded-full border ${active ? 'bg-primary border-primary' : 'bg-card border-border'}`}
                >
                  <Text
                    className={`text-xs ${active ? 'text-primary-foreground' : 'text-foreground'}`}
                  >
                    {node.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>
      ))}
      {loading ? (
        <View accessibilityLabel="Loading constituency level" className="items-center p-2">
          <ActivityIndicator />
        </View>
      ) : null}
    </View>
  )
}

// ─── Filter.CategoryChips ──────────────────────────────────────────────

const CategoryChips = ({
  categories,
  selectedIds,
  onChange,
  style,
  accessibilityLabel = 'Filter by category',
  testID,
}: FilterCategoryChipsProps): React.JSX.Element => {
  const selected = new Set(selectedIds)
  const toggle = (id: number): void => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange([...next])
  }
  return (
    <ScrollView
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={style as ViewStyle | undefined}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ flexDirection: 'row', gap: 4, paddingHorizontal: 8 }}
    >
      {selectedIds.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear all category filters"
          onPress={() => onChange([])}
          className="px-2 py-1 rounded-full border border-dashed border-border"
        >
          <Text className="text-xs text-muted-foreground">Clear ({selectedIds.length})</Text>
        </Pressable>
      ) : null}
      {categories.map((cat) => {
        const active = selected.has(cat.id)
        return (
          <Pressable
            key={cat.id}
            accessibilityRole="button"
            accessibilityLabel={cat.label}
            accessibilityState={{ selected: active }}
            onPress={() => toggle(cat.id)}
            className={`px-2 py-1 rounded-full border ${active ? 'bg-primary border-primary' : 'bg-card border-border'}`}
          >
            <Text className={`text-xs ${active ? 'text-primary-foreground' : 'text-foreground'}`}>
              {cat.label}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

// ─── Filter.SortToggle ─────────────────────────────────────────────────

const SORT_OPTIONS: ReadonlyArray<{ readonly value: ComplaintSort; readonly label: string }> = [
  { value: 'newest', label: 'Newest' },
  { value: 'most-commented', label: 'Most commented' },
  { value: 'most-flagged', label: 'Most flagged' },
]

const SortToggle = ({
  value,
  onChange,
  style,
  accessibilityLabel = 'Sort order',
  testID,
}: FilterSortToggleProps): React.JSX.Element => (
  <View
    accessibilityLabel={accessibilityLabel}
    accessibilityRole="radiogroup"
    testID={testID}
    style={style as ViewStyle | undefined}
    className="flex flex-row rounded-full border border-border p-0.5"
  >
    {SORT_OPTIONS.map((opt) => {
      const active = opt.value === value
      return (
        <Pressable
          key={opt.value}
          accessibilityRole="radio"
          accessibilityLabel={opt.label}
          accessibilityState={{ checked: active }}
          onPress={() => onChange(opt.value)}
          className={`px-3 py-1 rounded-full ${active ? 'bg-primary' : ''}`}
        >
          <Text className={`text-xs ${active ? 'text-primary-foreground' : 'text-foreground'}`}>
            {opt.label}
          </Text>
        </Pressable>
      )
    })}
  </View>
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

export const DEFAULT_SORT: ComplaintSort = 'newest'

export { SORT_OPTIONS }

export const isFilterActive = (
  constituency: string | null,
  categoryIds: ReadonlyArray<number>,
  sort: ComplaintSort,
): boolean => constituency !== null || categoryIds.length > 0 || sort !== 'newest'
