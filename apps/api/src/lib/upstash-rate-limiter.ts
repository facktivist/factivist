/**
 * Upstash Redis backend for the `RateLimiter` interface.
 *
 * Closes Phase 9 §2: the day the API goes multi-instance (Fly.io
 * `min_machines_running > 1` or a horizontal scale-out event), the
 * in-memory limiter races across pods. This module swaps it for the
 * Upstash `@upstash/ratelimit` sliding-window algorithm, which uses
 * atomic Redis ops (`INCR` + `EXPIRE` / Lua script) for correctness
 * across pods.
 *
 * ## Why Upstash (vs Cloudflare KV)
 *
 * Picked per maintainer direction 2026-05-26: the API targets Fly.io
 * (Bun-on-VPS), not Cloudflare Workers, so Upstash's strict-consistency
 * Redis (~5–15 ms from Mumbai region, REST-API based) is a cleaner fit
 * than KV's eventual consistency. Free tier (10k commands/day) covers
 * S1's 1k-MAU pilot.
 *
 * ## Selection
 *
 * `selectProveRateLimiter()` checks for `UPSTASH_REDIS_REST_URL` +
 * `UPSTASH_REDIS_REST_TOKEN`. Both present → Upstash; absent → fall
 * back to in-memory (single-instance dev / staging).
 *
 * ## Anonymity invariant
 *
 * The Redis key is `factivist:rl:prove:<sourceIp>` — derived from the
 * same `sourceIp()` helper the route uses. Upstash holds no PII; the
 * key is best-effort source-IP, the value is an atomic counter. TTL
 * matches the window so expired keys are reclaimed automatically.
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

import {
  createInMemoryRateLimiter,
  type RateLimitDecision,
  type RateLimiter,
  type RateLimiterOptions,
} from './rate-limiter.ts'

export interface UpstashRateLimiterOptions extends RateLimiterOptions {
  readonly url: string
  readonly token: string
  readonly prefix?: string
  /**
   * Test seam: inject pre-built Ratelimit / Redis clients so unit tests
   * don't need to mock the upstream module. Production callers leave
   * these unset and the factory builds the real clients from url/token.
   */
  readonly limiterOverride?: { limit: (key: string) => Promise<UpstashLimitResult> }
}

export interface UpstashLimitResult {
  readonly success: boolean
  readonly limit: number
  readonly remaining: number
  /** Unix timestamp in ms when the current window resets. */
  readonly reset: number
}

export const createUpstashRedisRateLimiter = ({
  max,
  windowMs,
  url,
  token,
  prefix = 'factivist:rl:prove',
  limiterOverride,
}: UpstashRateLimiterOptions): RateLimiter => {
  const limiter =
    limiterOverride ??
    new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(max, `${windowMs} ms` as `${number} ms`),
      prefix,
      analytics: false,
    })

  return {
    async consume(key: string, now: number = Date.now()): Promise<RateLimitDecision> {
      const result = await limiter.limit(key)
      return {
        allowed: result.success,
        remaining: result.remaining,
        // Match the in-memory contract: only populate retryAfterMs when
        // denied. For allowed requests `reset` is still the next-window
        // boundary, but callers shouldn't surface a Retry-After header
        // on a 2xx.
        retryAfterMs: result.success ? 0 : Math.max(0, result.reset - now),
      }
    },
    reset(): void {
      // No-op: Upstash state lives in Redis with TTL = windowMs. Tests
      // wanting isolation should use a unique `prefix` per run; running
      // tests against a real Redis is out of scope for unit suites.
    },
  }
}

export interface SelectionEnv {
  readonly UPSTASH_REDIS_REST_URL?: string
  readonly UPSTASH_REDIS_REST_TOKEN?: string
}

/**
 * Pick the rate-limit backend based on env vars. Returns the in-memory
 * limiter when Upstash credentials are absent — matches S1 single-
 * instance dev / staging where Redis isn't worth the latency. Phase 9
 * §2 closure: production sets both vars and gets the Upstash backend.
 */
export const selectProveRateLimiter = (
  opts: RateLimiterOptions,
  env: SelectionEnv = process.env as SelectionEnv,
): RateLimiter => {
  const url = env.UPSTASH_REDIS_REST_URL?.trim()
  const token = env.UPSTASH_REDIS_REST_TOKEN?.trim()
  if (url && token) {
    return createUpstashRedisRateLimiter({ ...opts, url, token })
  }
  return createInMemoryRateLimiter(opts)
}
