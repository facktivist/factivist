/**
 * `Mod.*` compound — web (HeroUI v3, admin-only).
 *
 * Surface 7 — Moderation queue. Driven by:
 *   docs/design/s1/handoff/product-design/factivist-s1/project/screens/moderation.jsx
 *   docs/design/s1/handoff/product-design/factivist-s1/project/screens/critical-escalation.jsx
 *
 * S1 is mobile-clientless on this surface; native package ships no
 * mirror.
 *
 * Slot contract:
 *   `Mod.QueueList`     — pending items list with reporter counts
 *   `Mod.DecisionBar`   — keep / hide / delete / escalate + optional note
 *   `Mod.AuditTrail`    — append-only audit entries
 */

import type * as React from 'react'
import { useState } from 'react'

import { Button, Card, Spinner } from '../components/index.ts'
import type {
  ModAuditTrailProps,
  ModDecision,
  ModDecisionBarProps,
  ModQueueListProps,
} from './Moderation.types.ts'

const cx = (...parts: ReadonlyArray<string | false | null | undefined>): string =>
  parts.filter((p): p is string => typeof p === 'string' && p.length > 0).join(' ')

const fmtDate = (iso: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
}

// ─── Mod.QueueList ─────────────────────────────────────────────────────

const QueueList = ({
  items,
  loading,
  onItemOpen,
  className,
}: ModQueueListProps): React.JSX.Element => {
  if (items.length === 0 && !loading) {
    return (
      <div
        role="status"
        className={cx(
          'flex flex-col items-center justify-center gap-2 p-8 text-center text-[var(--color-muted-foreground)]',
          className,
        )}
      >
        <p className="text-sm">Queue is empty.</p>
      </div>
    )
  }
  return (
    <ul
      aria-label="Moderation queue"
      aria-busy={loading ? true : undefined}
      className={cx('flex flex-col gap-3 list-none p-0', className)}
    >
      {items.map((item) => (
        <li key={item.id}>
          <Card className="flex flex-col gap-3 p-4">
            <header className="flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => onItemOpen(item.id)}
                className="flex-1 text-left text-sm font-semibold text-[var(--color-foreground)] hover:underline"
              >
                {item.target.kind === 'complaint' ? 'Complaint' : 'Comment'} · {item.target.id}
              </button>
              <span
                className={cx(
                  'text-xs font-mono px-2 py-0.5 rounded-full',
                  item.reporterCount >= 3
                    ? 'bg-[var(--color-destructive)] text-[var(--color-card)]'
                    : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
                )}
              >
                {item.reporterCount} report{item.reporterCount === 1 ? '' : 's'}
              </span>
            </header>
            <p className="text-xs font-mono uppercase tracking-wider text-[var(--color-muted-foreground)]">
              {item.reason}
            </p>
            <p className="text-sm text-[var(--color-muted-foreground)] line-clamp-3">
              {item.excerpt}
            </p>
            <footer className="text-xs font-mono text-[var(--color-muted-foreground)]">
              Reported {fmtDate(item.reportedAt)}
            </footer>
          </Card>
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

// ─── Mod.DecisionBar ───────────────────────────────────────────────────

const DECISIONS: ReadonlyArray<{ readonly value: ModDecision; readonly label: string }> = [
  { value: 'keep', label: 'Keep' },
  { value: 'hide', label: 'Hide' },
  { value: 'delete', label: 'Delete' },
  { value: 'escalate', label: 'Escalate' },
]

const DecisionBar = ({
  itemId,
  onDecide,
  submitting,
  className,
}: ModDecisionBarProps): React.JSX.Element => {
  const [note, setNote] = useState('')
  const handle = async (decision: ModDecision): Promise<void> => {
    await onDecide({ itemId, decision, note: note.trim() || undefined })
    setNote('')
  }
  return (
    <div
      role="toolbar"
      aria-label="Moderation decision"
      className={cx('flex flex-col gap-2 p-3 rounded-md bg-[var(--color-muted)]', className)}
    >
      <textarea
        aria-label="Moderation rationale"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Rationale (optional, audited)…"
        rows={2}
        maxLength={1000}
        className="rounded-md bg-[var(--color-card)] border border-[var(--color-border)] p-2 text-sm"
      />
      <div className="flex gap-2 justify-end">
        {DECISIONS.map((d) => (
          <Button
            key={d.value}
            variant={d.value === 'delete' || d.value === 'escalate' ? 'primary' : 'ghost'}
            isDisabled={submitting}
            onClick={() => {
              void handle(d.value)
            }}
          >
            {d.label}
          </Button>
        ))}
      </div>
    </div>
  )
}

// ─── Mod.AuditTrail ────────────────────────────────────────────────────

const AuditTrail = ({ entries, className }: ModAuditTrailProps): React.JSX.Element => (
  <section aria-label="Moderation audit trail" className={cx('flex flex-col gap-2', className)}>
    {entries.length === 0 ? (
      <p className="text-sm text-[var(--color-muted-foreground)]">No prior decisions.</p>
    ) : null}
    <ol className="flex flex-col gap-2 list-none p-0">
      {entries.map((e) => (
        <li
          key={e.id}
          className="p-3 rounded-md border border-[var(--color-border)] bg-[var(--color-card)]"
        >
          <div className="flex justify-between text-xs font-mono text-[var(--color-muted-foreground)]">
            <span>
              {e.moderatorHandle} · {e.decision}
            </span>
            <span>{fmtDate(e.at)}</span>
          </div>
          {e.note ? <p className="mt-1 text-sm text-[var(--color-foreground)]">{e.note}</p> : null}
        </li>
      ))}
    </ol>
  </section>
)

export const Mod = { QueueList, DecisionBar, AuditTrail } as const
export type ModCompound = typeof Mod

export { AuditTrail as ModAuditTrail, DecisionBar as ModDecisionBar, QueueList as ModQueueList }
