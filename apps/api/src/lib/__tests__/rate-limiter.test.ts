import { describe, expect, it } from 'vitest'

import { createInMemoryRateLimiter } from '../rate-limiter.ts'

describe('createInMemoryRateLimiter', () => {
  it('allows up to max requests inside the window', () => {
    const limiter = createInMemoryRateLimiter({ max: 3, windowMs: 1000 })
    const now = 1_000_000
    expect((limiter.consume('a', now) as { allowed: boolean }).allowed).toBe(true)
    expect((limiter.consume('a', now) as { allowed: boolean }).allowed).toBe(true)
    expect((limiter.consume('a', now) as { allowed: boolean }).allowed).toBe(true)
    const fourth = limiter.consume('a', now) as { allowed: boolean; remaining: number }
    expect(fourth.allowed).toBe(false)
    expect(fourth.remaining).toBe(0)
  })

  it('isolates buckets by key', () => {
    const limiter = createInMemoryRateLimiter({ max: 1, windowMs: 1000 })
    expect((limiter.consume('a', 1) as { allowed: boolean }).allowed).toBe(true)
    expect((limiter.consume('b', 1) as { allowed: boolean }).allowed).toBe(true)
    expect((limiter.consume('a', 1) as { allowed: boolean }).allowed).toBe(false)
  })

  it('expires entries past the window', () => {
    const limiter = createInMemoryRateLimiter({ max: 1, windowMs: 100 })
    expect((limiter.consume('a', 1000) as { allowed: boolean }).allowed).toBe(true)
    expect((limiter.consume('a', 1050) as { allowed: boolean }).allowed).toBe(false)
    expect((limiter.consume('a', 1101) as { allowed: boolean }).allowed).toBe(true)
  })

  it('surfaces remaining capacity for headers', () => {
    const limiter = createInMemoryRateLimiter({ max: 3, windowMs: 1000 })
    expect((limiter.consume('a', 1) as { remaining: number }).remaining).toBe(2)
    expect((limiter.consume('a', 1) as { remaining: number }).remaining).toBe(1)
    expect((limiter.consume('a', 1) as { remaining: number }).remaining).toBe(0)
  })

  it('computes a non-negative retryAfterMs when blocked', () => {
    const limiter = createInMemoryRateLimiter({ max: 1, windowMs: 1000 })
    limiter.consume('a', 1000)
    const blocked = limiter.consume('a', 1500) as { retryAfterMs: number }
    expect(blocked.retryAfterMs).toBeGreaterThan(0)
    expect(blocked.retryAfterMs).toBeLessThanOrEqual(1000)
  })

  it('reset() clears all buckets', () => {
    const limiter = createInMemoryRateLimiter({ max: 1, windowMs: 1000 })
    limiter.consume('a', 1)
    expect((limiter.consume('a', 1) as { allowed: boolean }).allowed).toBe(false)
    limiter.reset()
    expect((limiter.consume('a', 1) as { allowed: boolean }).allowed).toBe(true)
  })
})
