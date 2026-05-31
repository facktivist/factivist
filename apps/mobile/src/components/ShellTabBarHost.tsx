import { Shell } from '@factivist/ui-native/shell'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'

/**
 * Expo Router → Shell.TabBar adapter.
 *
 * Expo Router's `Tabs` accepts a `tabBar` render prop with the
 * `BottomTabBarProps` shape (state, navigation, descriptors,
 * insets). This adapter maps that into the compound's typed
 * `ShellTabBarProps` so the layout file stays declarative.
 *
 * The label + icon come from the tab's `options` (set in
 * `(tabs)/_layout.tsx`). We DO NOT read the active title from
 * `state.routes[state.index].name` directly — the descriptor's
 * `tabBarLabel` is the authoritative copy and may differ from the
 * route segment.
 *
 * Tab order is locked by ADR-0019; the compound respects whatever
 * order it receives — the layout file is the single source of truth.
 */
export function ShellTabBarHost({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const items = state.routes.map((route) => {
    const { options } = descriptors[route.key] ?? { options: {} }
    // Expo Router's `tabBarLabel` can be a string or a function. We
    // accept the string path only — every tab in this app declares
    // the label as a string.
    const label =
      typeof options.tabBarLabel === 'string'
        ? options.tabBarLabel
        : typeof options.title === 'string'
          ? options.title
          : route.name
    return {
      // Use route.name (semantic, stable across reloads) — drives both
      // the activeId comparison and the per-item testID emitted as
      // `mobile-tabbar-{name}` by Shell.TabBar.
      id: route.name,
      label,
      icon: label.toLowerCase(),
    }
  })

  const activeId = state.routes[state.index]?.name ?? items[0]?.id ?? ''

  const handleSelect = (id: string): void => {
    const target = state.routes.find((r) => r.name === id)
    if (!target) return
    const event = navigation.emit({
      type: 'tabPress',
      target: target.key,
      canPreventDefault: true,
    })
    if (!event.defaultPrevented) {
      navigation.navigate(target.name, target.params)
    }
  }

  return (
    <Shell.TabBar
      items={items}
      activeId={activeId}
      onSelect={handleSelect}
      bottomInset={insets.bottom}
      testID="mobile-tabbar"
    />
  )
}
