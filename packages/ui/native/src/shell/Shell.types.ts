/**
 * `Shell.*` compound contract — mobile (HeroUI Native + Uniwind).
 *
 * Mobile deltas vs web:
 *   - `TabBar` is a true bottom bar with safe-area inset awareness; on web
 *     the equivalent renders as a top tab at md+ breakpoints.
 *   - `OfflineBanner` is sticky-top and respects status-bar height.
 *   - `SkeletonRow` honors prefers-reduced-motion via Reanimated.
 */

export interface ShellTabBarItem {
  readonly id: string
  readonly label: string
  readonly icon: string
  /** Expo Router pathname; consumers pass the typed Href in the impl layer. */
  readonly href?: string
  readonly badge?: number
}

interface NativeProps {
  readonly style?: unknown
  readonly accessibilityLabel?: string
  readonly testID?: string
}

export interface ShellTabBarProps extends NativeProps {
  readonly items: ReadonlyArray<ShellTabBarItem>
  readonly activeId: string
  readonly onSelect: (id: string) => void
  /** Override the system-derived bottom inset (rare; default = safe-area). */
  readonly bottomInset?: number
}

export interface ShellOfflineBannerProps extends NativeProps {
  readonly mode: 'offline' | 'cached-read-only'
  readonly onRetry?: () => void
}

export interface ShellSkeletonRowProps extends NativeProps {
  readonly lines?: 1 | 2 | 3
  readonly withAvatar?: boolean
  readonly withThumbnail?: boolean
}

export const SHELL_SLOTS = {
  TabBar: 'Shell.TabBar',
  OfflineBanner: 'Shell.OfflineBanner',
  SkeletonRow: 'Shell.SkeletonRow',
} as const

export type ShellSlot = (typeof SHELL_SLOTS)[keyof typeof SHELL_SLOTS]
