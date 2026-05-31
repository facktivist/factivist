import { Tabs } from 'expo-router'

import { ShellTabBarHost } from '../../src/components/ShellTabBarHost.tsx'

/**
 * Bottom-tabs shell for the Factivist mobile app.
 *
 * Per ADR-0019 ("same tab order both platforms, no FAB") and the design
 * doc at `docs/design/s1/expo-router-routes.md`, the locked order is:
 *
 *   1. Home / Browse   → `(tabs)/index`
 *   2. Search          → `(tabs)/search`
 *   3. Compose         → `(tabs)/compose` (intercepts tap, pushes `/compose`)
 *   4. Profile         → `(tabs)/profile`
 *
 * Compose is rendered as a tab but functions as a modal entry — tapping
 * it routes to the `/compose` modal stack rather than swapping tab content
 * (ADR-0019: no FAB). The placeholder tab screen redirects there on focus.
 *
 * NOTE: Search and Profile are placeholder stubs in Phase 5 wave 1; the
 * real screens land in later waves but the tab slots exist now so that
 * tab order parity is verifiable by the tester wave.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <ShellTabBarHost {...props} />}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarLabel: 'Search',
        }}
      />
      <Tabs.Screen
        name="compose"
        options={{
          title: 'Compose',
          tabBarLabel: 'Compose',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
        }}
      />
    </Tabs>
  )
}
