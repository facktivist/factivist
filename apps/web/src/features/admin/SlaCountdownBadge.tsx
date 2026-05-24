/**
 * SLA countdown badge.
 *
 * Pure renderer (no client-side ticker). Colour-codes the remaining time
 * against the ADR-0014 / ADR-0020 windows:
 *
 *   - green  : > 24h remaining
 *   - amber  : 12–24h remaining
 *   - red    : < 12h remaining (or already breached)
 *
 * The badge is a Server Component — Next.js re-renders on navigation,
 * which is enough fidelity for an operator workflow. Live ticking (which
 * would require `'use client'` + `setInterval`) is intentionally
 * deferred so the queue page can stay a pure RSC.
 */

import type { ReactElement } from 'react'

export interface SlaCountdownBadgeProps {
  /** ISO timestamp of the SLA deadline. */
  readonly slaDueAt: string
  /** Override the "now" reference, useful for tests + storybook. */
  readonly now?: Date
}

type Tone = 'success' | 'warning' | 'danger'

const TONE_CLASSES: Readonly<Record<Tone, string>> = {
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-danger/15 text-danger',
}

export const computeSlaTone = (remainingMs: number): Tone => {
  if (remainingMs < 12 * 60 * 60 * 1000) return 'danger'
  if (remainingMs < 24 * 60 * 60 * 1000) return 'warning'
  return 'success'
}

export const formatSlaRemaining = (remainingMs: number): string => {
  if (remainingMs <= 0) {
    const overdueHours = Math.ceil(-remainingMs / (60 * 60 * 1000))
    return `Overdue ${overdueHours}h`
  }
  const totalMinutes = Math.floor(remainingMs / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours <= 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}

export function SlaCountdownBadge({ slaDueAt, now }: SlaCountdownBadgeProps): ReactElement {
  const reference = now ?? new Date()
  const due = new Date(slaDueAt)
  const remainingMs = due.getTime() - reference.getTime()
  const tone = computeSlaTone(remainingMs)
  const label = formatSlaRemaining(remainingMs)

  const toneLabel =
    tone === 'danger' ? 'breached or critical' : tone === 'warning' ? 'approaching' : 'on track'
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
      data-testid="sla-countdown-badge"
      data-tone={tone}
    >
      <span className="sr-only">SLA {toneLabel}: </span>
      {label}
    </span>
  )
}
