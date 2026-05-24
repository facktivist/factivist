/**
 * `Shell.*` compound contract — web (HeroUI v3).
 *
 * Surface: 9 — App shell screens with offline-friendly skeletons.
 *
 * Tokens consumed: surface, surfaceElevated, text, textMuted, border,
 *   borderStrong, brand, brandText, warningBg, warningText, radius-md/full,
 *   space-2/3/4, shadow-medium, motion.duration.base, motion.easing.standard.
 */

// ─── Shell.TabBar ─────────────────────────────────────────────────────
/**
 * Bottom tab bar — web equivalent renders as a top tab on >=md screens;
 * mobile uses a true bottom bar (see native types).
 */
export interface ShellTabBarItem {
  readonly id: string
  readonly label: string
  /** Icon glyph identifier, looked up in the icon registry. */
  readonly icon: string
  readonly href?: string
  /** Badge count; `undefined` = no badge, `0` = dot, n>0 = numeric. */
  readonly badge?: number
}

export interface ShellTabBarProps {
  readonly items: ReadonlyArray<ShellTabBarItem>
  readonly activeId: string
  readonly onSelect: (id: string) => void
  readonly className?: string
}

// ─── Shell.OfflineBanner ──────────────────────────────────────────────
/**
 * Persistent banner shown when the network is offline. Distinguishes
 * "fully offline" from "cached read-only" so the copy can branch.
 */
export interface ShellOfflineBannerProps {
  readonly mode: 'offline' | 'cached-read-only'
  readonly onRetry?: () => void
  readonly className?: string
}

// ─── Shell.SkeletonRow ────────────────────────────────────────────────
/**
 * Generic skeleton row — list-item placeholder. `lines` controls the
 * number of text rows; `withAvatar` adds a circular placeholder up front;
 * `withThumbnail` adds a square placeholder for image-bearing rows.
 */
export interface ShellSkeletonRowProps {
  readonly lines?: 1 | 2 | 3
  readonly withAvatar?: boolean
  readonly withThumbnail?: boolean
  readonly className?: string
}

export const SHELL_SLOTS = {
  TabBar: 'Shell.TabBar',
  OfflineBanner: 'Shell.OfflineBanner',
  SkeletonRow: 'Shell.SkeletonRow',
} as const

export type ShellSlot = (typeof SHELL_SLOTS)[keyof typeof SHELL_SLOTS]
