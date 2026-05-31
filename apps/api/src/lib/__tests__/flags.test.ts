/**
 * Tests for `isFlagEnabled` — the request-scoped feature-flag reader.
 *
 * Per `aggregates.md` §FeatureFlag I-FF-3, reads are one DB hit per request
 * and must fail-closed when the row is missing (unknown key → false).
 */
import type { Database } from '@factivist/db/client'
import { describe, expect, it, vi } from 'vitest'

import { isFlagEnabled } from '../flags.ts'

/**
 * Build a chainable Drizzle stub: db.select().from().where().limit() resolves
 * to whatever `rows` we hand in. Tracks invocations so assertions can confirm
 * a single round-trip.
 */
const buildDbStub = (rows: Array<{ enabled: boolean }>) => {
  const limit = vi.fn().mockResolvedValue(rows)
  const where = vi.fn(() => ({ limit }))
  const from = vi.fn(() => ({ where }))
  const select = vi.fn(() => ({ from }))
  return { stub: { select } as unknown as Database, limit, where, from, select }
}

describe('isFlagEnabled', () => {
  it('returns true when the row exists with enabled=true', async () => {
    const { stub } = buildDbStub([{ enabled: true }])
    await expect(isFlagEnabled(stub, 'S1_COMPLAINT_SUBMIT')).resolves.toBe(true)
  })

  it('returns false when the row exists with enabled=false', async () => {
    const { stub } = buildDbStub([{ enabled: false }])
    await expect(isFlagEnabled(stub, 'S1_COMPLAINT_SUBMIT')).resolves.toBe(false)
  })

  it('returns false when no row exists (fail-closed for unknown keys)', async () => {
    const { stub } = buildDbStub([])
    await expect(isFlagEnabled(stub, 'S1_PUBLIC_BROWSE')).resolves.toBe(false)
  })

  it('issues exactly one select query (request-scoped, I-FF-3)', async () => {
    const { stub, select, from, where, limit } = buildDbStub([{ enabled: true }])
    await isFlagEnabled(stub, 'S1_COMPLAINT_SUBMIT')
    expect(select).toHaveBeenCalledTimes(1)
    expect(from).toHaveBeenCalledTimes(1)
    expect(where).toHaveBeenCalledTimes(1)
    expect(limit).toHaveBeenCalledTimes(1)
  })

  it('propagates DB errors to the caller (lets the route map to 503)', async () => {
    const limit = vi.fn().mockRejectedValue(new Error('connection refused'))
    const where = vi.fn(() => ({ limit }))
    const from = vi.fn(() => ({ where }))
    const select = vi.fn(() => ({ from }))
    const stub = { select } as unknown as Database

    await expect(isFlagEnabled(stub, 'S1_COMPLAINT_SUBMIT')).rejects.toThrow('connection refused')
  })

  it('treats a truthy non-true value as false (strict equality)', async () => {
    // The function uses `=== true`; verify a stray truthy value doesn't slip through.
    const { stub } = buildDbStub([{ enabled: 1 as unknown as boolean }])
    await expect(isFlagEnabled(stub, 'S1_COMPLAINT_SUBMIT')).resolves.toBe(false)
  })
})
