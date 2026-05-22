/**
 * Minimal `react-native` shim for Vitest + Testing Library.
 *
 * Maps the handful of React Native primitives our components consume to
 * plain DOM elements so jsdom can render them. This is intentionally
 * incomplete — Detox owns full-fidelity native rendering (see `e2e/`).
 *
 * The `testID` prop is forwarded as `data-testid` so RTL's `getByTestId`
 * (and on-device Detox queries that use the same id) both work.
 */
import type { ReactNode } from 'react'

type RNCommonProps = {
  children?: ReactNode
  testID?: string
  style?: Record<string, unknown> | Array<Record<string, unknown>>
  accessibilityLabel?: string
  accessibilityRole?: string
  accessibilityState?: { selected?: boolean; disabled?: boolean }
  onPress?: () => void
}

const splitRn = ({
  testID,
  accessibilityLabel,
  accessibilityRole,
  accessibilityState,
  onPress,
  style: _style,
  ...rest
}: RNCommonProps & Record<string, unknown>) => ({
  'data-testid': testID,
  'aria-label': accessibilityLabel,
  role: accessibilityRole,
  'aria-pressed':
    accessibilityRole === 'button' && accessibilityState?.selected !== undefined
      ? String(accessibilityState.selected)
      : undefined,
  'aria-disabled': accessibilityState?.disabled ? 'true' : undefined,
  onClick: onPress,
  ...rest,
})

export const View = ({ children, ...props }: RNCommonProps) => (
  <div {...splitRn(props)}>{children}</div>
)

export const Text = ({ children, ...props }: RNCommonProps) => (
  <span {...splitRn(props)}>{children}</span>
)

export const ScrollView = ({
  children,
  contentContainerStyle: _ccs,
  ...props
}: RNCommonProps & { contentContainerStyle?: unknown }) => <div {...splitRn(props)}>{children}</div>

export const Pressable = ({ children, ...props }: RNCommonProps) => (
  <button type="button" {...splitRn(props)}>
    {children}
  </button>
)

export const TouchableOpacity = Pressable

export const Appearance = {
  getColorScheme: (): 'light' | 'dark' | null => 'light',
  addChangeListener: () => ({ remove: () => {} }),
}

export const Platform = {
  OS: 'ios' as const,
  select: <T,>(spec: { ios?: T; android?: T; default?: T }): T | undefined =>
    spec.ios ?? spec.default,
}

export const StyleSheet = {
  create: <T extends Record<string, unknown>>(styles: T): T => styles,
  flatten: (style: unknown) => style,
  hairlineWidth: 1,
}

export default {
  View,
  Text,
  ScrollView,
  Pressable,
  TouchableOpacity,
  Appearance,
  Platform,
  StyleSheet,
}
