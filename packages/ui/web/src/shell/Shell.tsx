/**
 * `Shell.*` compound — web (HeroUI v3).
 *
 * Surface 9 — App shell. Driven by
 * `docs/design/s1/handoff/product-design/factivist-s1/project/screens/landing.jsx`
 * and `mobile-tier1.jsx` for the tab layout reference.
 *
 * Slots:
 *   `Shell.TabBar`        — primary navigation (top on >=md, bottom on sm)
 *   `Shell.OfflineBanner` — persistent banner for offline / cached-read-only
 *   `Shell.SkeletonRow`   — generic list-item placeholder
 */

import type * as React from 'react'

import { Button } from '../components/index.ts'
import type {
  ShellOfflineBannerProps,
  ShellSkeletonRowProps,
  ShellTabBarProps,
} from './Shell.types.ts'

const cx = (...parts: ReadonlyArray<string | false | null | undefined>): string =>
  parts.filter((p): p is string => typeof p === 'string' && p.length > 0).join(' ')

// ─── Shell.TabBar ──────────────────────────────────────────────────────

const TabBar = ({ items, activeId, onSelect, className }: ShellTabBarProps): React.JSX.Element => (
  <nav
    aria-label="Primary"
    className={cx(
      'flex items-stretch gap-1 p-1 rounded-full bg-[var(--color-card)] border border-[var(--color-border)]',
      className,
    )}
  >
    {items.map((item) => {
      const active = item.id === activeId
      return (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={active}
          data-tab-id={item.id}
          onClick={() => onSelect(item.id)}
          className={cx(
            'relative flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors duration-[var(--duration-base)]',
            active
              ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
              : 'text-[var(--color-foreground)] hover:bg-[var(--color-muted)]',
          )}
        >
          <span aria-hidden="true" className="text-base">
            {item.icon}
          </span>
          <span>{item.label}</span>
          {typeof item.badge === 'number' ? (
            <output
              aria-label={item.badge === 0 ? 'new' : `${item.badge} unread`}
              className={cx(
                'ml-1 rounded-full',
                item.badge === 0
                  ? 'w-2 h-2 bg-[var(--color-destructive)]'
                  : 'px-1.5 py-0.5 text-xs font-mono bg-[var(--color-destructive)] text-[var(--color-card)]',
              )}
            >
              {item.badge === 0 ? '' : item.badge}
            </output>
          ) : null}
        </button>
      )
    })}
  </nav>
)

// ─── Shell.OfflineBanner ───────────────────────────────────────────────

const OfflineBanner = ({
  mode,
  onRetry,
  className,
}: ShellOfflineBannerProps): React.JSX.Element => (
  <div
    role="alert"
    aria-live="polite"
    data-mode={mode}
    className={cx(
      'flex items-center justify-between gap-3 px-4 py-2',
      'bg-[var(--color-warning-100)] text-[var(--color-warning-900)]',
      'border-b border-[var(--color-border)]',
      className,
    )}
  >
    <span className="text-sm">
      {mode === 'offline'
        ? 'You are offline. Submissions will be queued.'
        : 'Network unavailable — showing cached complaints.'}
    </span>
    {onRetry ? (
      <Button variant="ghost" onClick={onRetry}>
        Retry
      </Button>
    ) : null}
  </div>
)

// ─── Shell.SkeletonRow ─────────────────────────────────────────────────

const SkeletonRow = ({
  lines = 2,
  withAvatar,
  withThumbnail,
  className,
}: ShellSkeletonRowProps): React.JSX.Element => (
  <div
    role="presentation"
    aria-busy="true"
    className={cx(
      'flex items-start gap-3 p-3 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] animate-pulse',
      className,
    )}
  >
    {withAvatar ? (
      <span
        aria-hidden="true"
        className="w-10 h-10 rounded-full bg-[var(--color-muted)] shrink-0"
      />
    ) : null}
    <div className="flex-1 flex flex-col gap-2">
      {Array.from({ length: lines }, (_, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton bars are interchangeable, no semantic key
          key={`bar-${i}`}
          className={cx(
            'h-3 rounded-full bg-[var(--color-muted)]',
            i === lines - 1 ? 'w-1/2' : 'w-full',
          )}
        />
      ))}
    </div>
    {withThumbnail ? (
      <span aria-hidden="true" className="w-16 h-16 rounded-md bg-[var(--color-muted)] shrink-0" />
    ) : null}
  </div>
)

export const Shell = { TabBar, OfflineBanner, SkeletonRow } as const
export type ShellCompound = typeof Shell

export {
  OfflineBanner as ShellOfflineBanner,
  SkeletonRow as ShellSkeletonRow,
  TabBar as ShellTabBar,
}
