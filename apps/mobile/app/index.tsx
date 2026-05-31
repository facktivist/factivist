import { Redirect } from 'expo-router'

/**
 * Root index — redirects into the (tabs) shell.
 *
 * In a later wave this redirect will branch on auth state:
 *   - first-launch → `(onboarding)/index`
 *   - signed-in    → `(tabs)`
 *
 * Phase 5 wave 1 unconditionally lands in `(tabs)` so the discovery feed
 * is the default entry point.
 */
export default function Root() {
  return <Redirect href="/(tabs)" />
}
