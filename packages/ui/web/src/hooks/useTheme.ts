import type { ThemeName } from '@factivist/ui-theme/semantic'

/**
 * Read the active theme by inspecting the `<html data-theme="...">` attribute.
 *
 * - Returns `'dark'` when `data-theme === 'dark'`.
 * - Returns `'light'` for any other value (including missing, empty, or
 *   unrecognized values). This conservative fallback prevents flash-of-wrong
 *   theme on first paint when the attribute is set by client-side hydration.
 *
 * This is a synchronous read — it does not subscribe to MutationObserver or
 * re-render on attribute change. If you need reactivity, layer that on top
 * (e.g. with a small Zustand store that mirrors the attribute).
 */
export const useTheme = (): ThemeName => {
  if (typeof document === 'undefined') return 'light'
  const value = document.documentElement.dataset.theme
  return value === 'dark' ? 'dark' : 'light'
}
