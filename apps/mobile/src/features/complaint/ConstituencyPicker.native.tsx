import { Button, Input, TextField } from '@factivist/ui-native/components'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { type ApiConstituencyNode, apiClient } from '../../lib/api/client.ts'

/**
 * Mobile constituency picker — combobox + breadcrumb (ADR-017).
 *
 * Parity with the web ConstituencyPicker. ADR-019 demands the same tab
 * order both platforms; this screen keeps the same visual order (search
 * → breadcrumb → options) and the same interaction model. No FAB; no
 * geolocation API (ADR-013).
 *
 * Styling uses Uniwind className strings (NOT NativeWind). HeroUI Native
 * Button + TextField provide the primitives; Pressable + Text power the
 * breadcrumb and listbox.
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

export interface ConstituencyPickerNativeProps {
  readonly value: ConstituencySelection
  readonly onChange: (next: ConstituencySelection) => void
}

type Level = 'state' | 'district' | 'pc' | 'ac'

const LEVEL_LABEL: Record<Level, string> = {
  state: 'State',
  district: 'District',
  pc: 'PC (Lok Sabha)',
  ac: 'AC (Vidhan Sabha)',
}

const nextLevelToFill = (sel: ConstituencySelection): Level | null => {
  if (!sel.stateCode) return 'state'
  if (!sel.districtCode) return 'district'
  if (!sel.pcCode) return 'pc'
  if (!sel.acCode) return 'ac'
  return null
}

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

export function ConstituencyPickerNative({ value, onChange }: ConstituencyPickerNativeProps) {
  const level = nextLevelToFill(value)
  const [query, setQuery] = useState('')

  const listQuery = useQuery({
    queryKey: ['constituency', 'list', level, parentCodeFor(level ?? 'state', value)],
    queryFn: () =>
      level
        ? apiClient.listConstituency(level, parentCodeFor(level, value))
        : Promise.resolve([] as ReadonlyArray<ApiConstituencyNode>),
    enabled: level !== null && query.trim().length === 0,
    staleTime: 5 * 60_000,
  })

  const searchQuery = useQuery({
    queryKey: ['constituency', 'search', query.trim()],
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
  const isLoading = listQuery.isLoading || searchQuery.isLoading

  return (
    <View testID="constituency-picker-native">
      <View
        accessibilityRole="header"
        accessibilityLabel="Constituency selection"
        className="flex-row flex-wrap items-center gap-1 mb-2"
      >
        {breadcrumbs.length === 0 ? (
          <Text className="text-sm italic text-zinc-500">No constituency selected</Text>
        ) : null}
        {breadcrumbs.map((segment, i) => {
          const isLast = i === breadcrumbs.length - 1
          return (
            <View key={segment.level} className="flex-row items-center gap-1">
              <Pressable
                onPress={() => handleBreadcrumb(segment.level)}
                accessibilityRole="button"
                accessibilityLabel={`Rewind to ${LEVEL_LABEL[segment.level]}`}
                testID={`crumb-${segment.level}`}
                className="px-1 py-0.5"
              >
                <Text className="text-sm underline">{segment.label}</Text>
              </Pressable>
              {!isLast ? (
                <Text className="text-sm" accessibilityElementsHidden>
                  ›
                </Text>
              ) : null}
            </View>
          )
        })}
      </View>

      {isComplete ? (
        <View className="rounded-md border border-zinc-300 p-3">
          <Text className="text-sm">Selected.</Text>
          <View className="mt-2">
            <Button variant="tertiary" onPress={() => handleBreadcrumb('state')}>
              <Button.Label>Reset</Button.Label>
            </Button>
          </View>
        </View>
      ) : (
        <View>
          <Text className="mb-1 text-sm font-medium">{LEVEL_LABEL[level]} — search or pick</Text>
          <TextField>
            <Input
              value={query}
              onChangeText={setQuery}
              placeholder={`Search ${LEVEL_LABEL[level]}…`}
              testID="constituency-search"
              accessibilityRole="search"
            />
          </TextField>
          <Text className="mt-1 text-xs text-zinc-500">
            We never use GPS. Pick your constituency manually.
          </Text>

          <View
            accessibilityRole="list"
            accessibilityLabel={`${LEVEL_LABEL[level]} options`}
            className="mt-2 rounded-md border border-zinc-300"
          >
            {isLoading ? <Text className="p-2 text-sm text-zinc-500">Loading…</Text> : null}
            {options.length === 0 && !isLoading ? (
              <Text className="p-2 text-sm text-zinc-500">No matches.</Text>
            ) : null}
            {options.map((node) => (
              <Pressable
                key={`${node.level}:${node.code}`}
                onPress={() => handlePick(node)}
                accessibilityRole="button"
                accessibilityLabel={`${node.label}, ${LEVEL_LABEL[node.level]}`}
                testID={`option-${node.level}-${node.code}`}
                className="border-b border-zinc-200 px-2 py-3"
              >
                <Text className="text-sm font-medium">{node.label}</Text>
                <Text className="text-xs text-zinc-500">{LEVEL_LABEL[node.level]}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  )
}
