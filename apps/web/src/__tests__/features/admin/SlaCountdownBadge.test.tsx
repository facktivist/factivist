/**
 * SLA countdown badge tests.
 *
 * Boundary matrix on `computeSlaTone` + `formatSlaRemaining`. The ADR-0014
 * / ADR-0020 windows are encoded here — a refactor that shifts the tone
 * thresholds away from 12h/24h breaks CI loudly.
 */

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  computeSlaTone,
  formatSlaRemaining,
  SlaCountdownBadge,
} from '../../../features/admin/SlaCountdownBadge.tsx'

describe('computeSlaTone', () => {
  it('returns danger for negative remaining (overdue)', () => {
    expect(computeSlaTone(-1)).toBe('danger')
  })

  it('returns danger at exactly 0ms remaining', () => {
    expect(computeSlaTone(0)).toBe('danger')
  })

  it('returns danger at 11h59m remaining (just under 12h)', () => {
    expect(computeSlaTone(12 * 60 * 60 * 1000 - 1)).toBe('danger')
  })

  it('returns warning at exactly 12h remaining (lower boundary)', () => {
    expect(computeSlaTone(12 * 60 * 60 * 1000)).toBe('warning')
  })

  it('returns warning at 23h59m remaining', () => {
    expect(computeSlaTone(24 * 60 * 60 * 1000 - 1)).toBe('warning')
  })

  it('returns success at exactly 24h remaining (upper boundary)', () => {
    expect(computeSlaTone(24 * 60 * 60 * 1000)).toBe('success')
  })

  it('returns success at 36h remaining (Rule 3(1)(d) ceiling)', () => {
    expect(computeSlaTone(36 * 60 * 60 * 1000)).toBe('success')
  })
})

describe('formatSlaRemaining', () => {
  it('formats "Overdue Nh" when remaining is 0 or negative', () => {
    expect(formatSlaRemaining(0)).toMatch(/Overdue 0h/)
    expect(formatSlaRemaining(-60 * 60 * 1000)).toMatch(/Overdue 1h/)
    expect(formatSlaRemaining(-2 * 60 * 60 * 1000)).toMatch(/Overdue 2h/)
  })

  it('formats minutes-only when under an hour', () => {
    expect(formatSlaRemaining(15 * 60 * 1000)).toBe('15m')
    expect(formatSlaRemaining(59 * 60 * 1000)).toBe('59m')
  })

  it('formats hours + minutes when over an hour', () => {
    expect(formatSlaRemaining(60 * 60 * 1000)).toBe('1h 0m')
    expect(formatSlaRemaining(2 * 60 * 60 * 1000 + 30 * 60 * 1000)).toBe('2h 30m')
  })

  it('rounds down to the minute', () => {
    expect(formatSlaRemaining(60 * 60 * 1000 + 59 * 1000)).toBe('1h 0m')
  })
})

describe('<SlaCountdownBadge />', () => {
  const now = new Date('2026-05-23T12:00:00.000Z')

  it('renders with tone=success for >24h remaining', () => {
    const due = new Date(now.getTime() + 30 * 60 * 60 * 1000).toISOString()
    const { getByTestId } = render(<SlaCountdownBadge slaDueAt={due} now={now} />)
    const badge = getByTestId('sla-countdown-badge')
    expect(badge.getAttribute('data-tone')).toBe('success')
    expect(badge.textContent).toMatch(/on track/i)
  })

  it('renders with tone=warning between 12h and 24h', () => {
    const due = new Date(now.getTime() + 18 * 60 * 60 * 1000).toISOString()
    const { getByTestId } = render(<SlaCountdownBadge slaDueAt={due} now={now} />)
    const badge = getByTestId('sla-countdown-badge')
    expect(badge.getAttribute('data-tone')).toBe('warning')
    expect(badge.textContent).toMatch(/approaching/i)
  })

  it('renders with tone=danger for <12h remaining', () => {
    const due = new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString()
    const { getByTestId } = render(<SlaCountdownBadge slaDueAt={due} now={now} />)
    const badge = getByTestId('sla-countdown-badge')
    expect(badge.getAttribute('data-tone')).toBe('danger')
    expect(badge.textContent).toMatch(/breached or critical/i)
  })

  it('renders with tone=danger for already-overdue', () => {
    const due = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
    const { getByTestId } = render(<SlaCountdownBadge slaDueAt={due} now={now} />)
    expect(getByTestId('sla-countdown-badge').getAttribute('data-tone')).toBe('danger')
  })

  it('defaults `now` to wall-clock when not provided', () => {
    const due = new Date(Date.now() + 30 * 60 * 60 * 1000).toISOString()
    const { getByTestId } = render(<SlaCountdownBadge slaDueAt={due} />)
    expect(getByTestId('sla-countdown-badge').getAttribute('data-tone')).toBe('success')
  })

  it('exposes an sr-only tone label for assistive tech', () => {
    const due = new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString()
    const { container } = render(<SlaCountdownBadge slaDueAt={due} now={now} />)
    expect(container.querySelector('.sr-only')).not.toBeNull()
  })
})
