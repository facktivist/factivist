import { Redirect } from 'expo-router'

/**
 * Tab 3 — Compose.
 *
 * Per ADR-0019 (no FAB), Compose appears in the tab order. Tapping the
 * tab redirects into the modal composer stack — we never render
 * composer content directly inside the tab.
 */
export default function ComposeTab() {
  return <Redirect href="/compose" />
}
