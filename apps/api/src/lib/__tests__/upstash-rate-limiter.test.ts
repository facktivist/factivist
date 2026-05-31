import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createUpstashRedisRateLimiter,
  selectProveRateLimiter,
  type UpstashLimitResult,
} from '../upstash-rate-limiter.ts'

// We bypass the real Upstash SDK by injecting `limiterOverride`. The
// real `@upstash/ratelimit` + `@upstash/redis` imports still need to
// resolve at module-load time, which they do via the installed package.

const mkLimiter = (
  results: UpstashLimitResult[],
): { limit: (key: string) => Promise<UpstashLimitResult>; calls: string[] } => {
  const calls: string[] = []
  let i = 0
  return {
    calls,
    limit: async (key) => {
      calls.push(key)
      const next = results[i] ?? results[results.length - 1]
      i += 1
      if (!next) throw new Error('limiter override exhausted')
      return next
    },
  }
}

describe('createUpstashRedisRateLimiter', () => {
  it('maps Upstash success → allowed=true with remaining + retryAfterMs=0', async () => {
    const inner = mkLimiter([
      { success: true, limit: 10, remaining: 9, reset: Date.now() + 60_000 },
    ])
    const limiter = createUpstashRedisRateLimiter({
      max: 10,
      windowMs: 60_000,
      url: 'https://example.upstash.io',
      token: 't',
      limiterOverride: inner,
    })
    const decision = await limiter.consume('ip:1.2.3.4')
    expect(decision.allowed).toBe(true)
    expect(decision.remaining).toBe(9)
    expect(decision.retryAfterMs).toBe(0)
    expect(inner.calls).toEqual(['ip:1.2.3.4'])
  })

  it('maps Upstash failure → allowed=false with retryAfterMs derived from reset', async () => {
    const now = 1_700_000_000_000
    const inner = mkLimiter([{ success: false, limit: 10, remaining: 0, reset: now + 12_345 }])
    const limiter = createUpstashRedisRateLimiter({
      max: 10,
      windowMs: 60_000,
      url: 'https://example.upstash.io',
      token: 't',
      limiterOverride: inner,
    })
    const decision = await limiter.consume('ip:1.2.3.4', now)
    expect(decision.allowed).toBe(false)
    expect(decision.remaining).toBe(0)
    expect(decision.retryAfterMs).toBe(12_345)
  })

  it('clamps a negative retryAfterMs (clock skew) to zero', async () => {
    const now = 1_700_000_000_000
    const inner = mkLimiter([{ success: false, limit: 10, remaining: 0, reset: now - 5_000 }])
    const limiter = createUpstashRedisRateLimiter({
      max: 10,
      windowMs: 60_000,
      url: 'https://example.upstash.io',
      token: 't',
      limiterOverride: inner,
    })
    const decision = await limiter.consume('ip:1.2.3.4', now)
    expect(decision.retryAfterMs).toBe(0)
  })

  it('reset() is a no-op (Upstash state lives in Redis with TTL)', async () => {
    const inner = mkLimiter([
      { success: true, limit: 10, remaining: 9, reset: Date.now() + 60_000 },
    ])
    const limiter = createUpstashRedisRateLimiter({
      max: 10,
      windowMs: 60_000,
      url: 'https://example.upstash.io',
      token: 't',
      limiterOverride: inner,
    })
    expect(() => limiter.reset()).not.toThrow()
  })

  it('passes the per-request key through to Upstash unchanged', async () => {
    const inner = mkLimiter([
      { success: true, limit: 10, remaining: 9, reset: Date.now() + 60_000 },
      { success: true, limit: 10, remaining: 8, reset: Date.now() + 60_000 },
    ])
    const limiter = createUpstashRedisRateLimiter({
      max: 10,
      windowMs: 60_000,
      url: 'https://example.upstash.io',
      token: 't',
      limiterOverride: inner,
    })
    await limiter.consume('test:abc')
    await limiter.consume('fwd:5.6.7.8')
    expect(inner.calls).toEqual(['test:abc', 'fwd:5.6.7.8'])
  })
})

describe('selectProveRateLimiter', () => {
  const opts = { max: 10, windowMs: 60_000 }

  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns the in-memory limiter when Upstash env vars are unset', () => {
    const limiter = selectProveRateLimiter(opts, {})
    const decision = limiter.consume('a')
    // Sync return is the in-memory signature; Upstash returns a Promise.
    expect(decision instanceof Promise).toBe(false)
  })

  it('returns the in-memory limiter when only URL is set', () => {
    const limiter = selectProveRateLimiter(opts, {
      UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
    })
    const decision = limiter.consume('a')
    expect(decision instanceof Promise).toBe(false)
  })

  it('returns the in-memory limiter when only token is set', () => {
    const limiter = selectProveRateLimiter(opts, { UPSTASH_REDIS_REST_TOKEN: 't' })
    const decision = limiter.consume('a')
    expect(decision instanceof Promise).toBe(false)
  })

  it('returns the in-memory limiter when env vars are whitespace-only', () => {
    const limiter = selectProveRateLimiter(opts, {
      UPSTASH_REDIS_REST_URL: '   ',
      UPSTASH_REDIS_REST_TOKEN: '\t',
    })
    const decision = limiter.consume('a')
    expect(decision instanceof Promise).toBe(false)
  })

  it('returns the Upstash limiter when both env vars are present', () => {
    const limiter = selectProveRateLimiter(opts, {
      UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'token',
    })
    // Upstash limiter is async — calling .consume returns a Promise.
    const result = limiter.consume('a')
    expect(result instanceof Promise).toBe(true)
    // We don't await it (it would hit the network with the real
    // @upstash/redis client); the type discriminator above is enough.
  })

  it('falls back to process.env when env arg is omitted', () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '')
    const limiter = selectProveRateLimiter(opts)
    const decision = limiter.consume('a')
    expect(decision instanceof Promise).toBe(false)
  })
})
