/**
 * Vitest shim for `react-native-safe-area-context`.
 *
 * Renders both `SafeAreaView` and `SafeAreaProvider` as plain `<div>`s and
 * returns zero insets — the real values are platform-driven and only matter
 * on a device, which Detox covers.
 */
import type { ReactNode } from 'react'

type Props = {
  children?: ReactNode
  testID?: string
  edges?: ReadonlyArray<'top' | 'right' | 'bottom' | 'left'>
  style?: unknown
}

export const SafeAreaView = ({ children, testID }: Props) => (
  <div data-testid={testID}>{children}</div>
)

export const SafeAreaProvider = ({ children }: Props) => <div>{children}</div>

export const useSafeAreaInsets = () => ({ top: 0, right: 0, bottom: 0, left: 0 })

export const useSafeAreaFrame = () => ({ x: 0, y: 0, width: 0, height: 0 })
