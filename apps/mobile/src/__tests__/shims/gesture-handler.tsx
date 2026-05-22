/**
 * Vitest shim for `react-native-gesture-handler`.
 *
 * Only `GestureHandlerRootView` is imported by app code in test scope — the
 * rest of the gesture API (pan/long-press handlers etc.) only runs on a
 * real device, where Detox exercises it.
 */
import type { ReactNode } from 'react'

export const GestureHandlerRootView = ({ children }: { children?: ReactNode }) => (
  <div data-testid="gesture-root">{children}</div>
)
