/**
 * `Profile.*` compound — web (HeroUI v3).
 *
 * Surface 6 — Citizen profile (anonymous handle, complaint count, NO PII).
 *
 * Driven by `docs/design/s1/handoff/product-design/factivist-s1/project/screens/profile-me.jsx`.
 *
 * Anonymity invariants per ADR-010: handle + first-8-char nullifier excerpt only.
 */

import type * as React from 'react'

import { ComplaintCard } from '../complaint/Complaint.tsx'
import { Card, Spinner } from '../components/index.ts'
import type {
  ProfileComplaintListProps,
  ProfileHandleProps,
  ProfileStatsProps,
} from './Profile.types.ts'

const cx = (...parts: ReadonlyArray<string | false | null | undefined>): string =>
  parts.filter((p): p is string => typeof p === 'string' && p.length > 0).join(' ')

// ─── Profile.Handle ────────────────────────────────────────────────────

const Handle = ({ handle, nullifierExcerpt, className }: ProfileHandleProps): React.JSX.Element => {
  const safeExcerpt = nullifierExcerpt.slice(0, 8)
  return (
    <Card className={cx('p-6 flex flex-col gap-3', className)}>
      <span className="text-xs uppercase tracking-wider font-mono text-[var(--color-muted-foreground)]">
        Anonymous handle
      </span>
      <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">{handle}</h1>
      <span className="text-xs uppercase tracking-wider font-mono text-[var(--color-muted-foreground)]">
        Nullifier excerpt
      </span>
      <code className="text-sm font-mono text-[var(--color-foreground)]">{safeExcerpt}…</code>
    </Card>
  )
}

// ─── Profile.Stats ─────────────────────────────────────────────────────

const Stats = ({ stats, className }: ProfileStatsProps): React.JSX.Element => (
  <dl
    aria-label="Profile stats"
    className={cx(
      'grid grid-cols-3 gap-3 p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)]',
      className,
    )}
  >
    <div className="flex flex-col items-start gap-1">
      <dt className="text-xs uppercase tracking-wider font-mono text-[var(--color-muted-foreground)]">
        Complaints
      </dt>
      <dd className="text-xl font-semibold text-[var(--color-foreground)]">
        {stats.complaintCount}
      </dd>
    </div>
    <div className="flex flex-col items-start gap-1">
      <dt className="text-xs uppercase tracking-wider font-mono text-[var(--color-muted-foreground)]">
        Comments
      </dt>
      <dd className="text-xl font-semibold text-[var(--color-foreground)]">{stats.commentCount}</dd>
    </div>
    <div className="flex flex-col items-start gap-1">
      <dt className="text-xs uppercase tracking-wider font-mono text-[var(--color-muted-foreground)]">
        Flags received
      </dt>
      <dd
        className={cx(
          'text-xl font-semibold',
          stats.flagsReceived > 0
            ? 'text-[var(--color-destructive)]'
            : 'text-[var(--color-foreground)]',
        )}
      >
        {stats.flagsReceived}
      </dd>
    </div>
  </dl>
)

// ─── Profile.ComplaintList ─────────────────────────────────────────────

const ComplaintList = ({
  handle,
  items,
  loading,
  onItemOpen,
  className,
}: ProfileComplaintListProps): React.JSX.Element => {
  if (items.length === 0 && !loading) {
    return (
      <div
        role="status"
        className={cx(
          'flex flex-col items-center justify-center gap-2 p-8 text-center text-[var(--color-muted-foreground)]',
          className,
        )}
      >
        <p className="text-sm">{handle} has not filed a complaint yet.</p>
      </div>
    )
  }
  return (
    <ul
      aria-label={`Complaints by ${handle}`}
      aria-busy={loading ? true : undefined}
      className={cx('flex flex-col gap-3 list-none p-0', className)}
    >
      {items.map((item) => (
        <li key={item.id}>
          <ComplaintCard complaint={item} onOpen={onItemOpen} />
        </li>
      ))}
      {loading ? (
        <li className="flex justify-center p-4" role="status" aria-label="Loading more">
          <Spinner aria-hidden="true" />
        </li>
      ) : null}
    </ul>
  )
}

export const Profile = { Handle, Stats, ComplaintList } as const
export type ProfileCompound = typeof Profile

export { ComplaintList as ProfileComplaintList, Handle as ProfileHandle, Stats as ProfileStats }
