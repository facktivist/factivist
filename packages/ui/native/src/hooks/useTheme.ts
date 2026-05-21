import type { ThemeName } from '@factivist/ui-theme/semantic'
import { Appearance } from 'react-native'

/**
 * Read the active theme from React Native's `Appearance` API.
 *
 * - Returns `'dark'` when the OS reports a dark color scheme.
 * - Returns `'light'` for any other value, including `null` (Appearance
 *   returns `null` on platforms where the user hasn't picked a scheme) and
 *   `'no-preference'`. This conservative fallback matches the web hook so
 *   consumers can treat both runtimes identically.
 *
 * This is a synchronous read — it does not subscribe to
 * `Appearance.addChangeListener`. If you need reactivity, layer it on
 * top (e.g. with `useColorScheme()` from react-native and a state store).
 */
export const useTheme = (): ThemeName => {
  const scheme = Appearance.getColorScheme()
  return scheme === 'dark' ? 'dark' : 'light'
}
