/**
 * Rate-limit primitive used by `/identity/prove` (and any future high-cost
 * endpoint).
 *
 * The S1 deploy is a **single-instance** Bun process, so the default
 * implementation is an in-memory sliding-window token bucket. The
 * `RateLimiter` interface exists so Phase 9 can swap in a Cloudflare KV
 * or Upstash Redis backend as a **one-file change** the day the API
 * goes multi-instance.
 *
 * Concurrency model: the in-memory limiter is correct under Bun's
 * single-threaded event loop. The KV/Upstash variants will use atomic
 * `INCR`+`EXPIRE` (Upstash) or compare-and-swap (Workers KV) to retain
 * correctness across pods.
 */

export interface RateLimitDecision {
  readonly allowed: boolean
  /** Tokens left in the current window (for surfacing in headers / telemetry). */
  readonly remaining: number
  /** Wall-clock ms until the limit window resets (best-effort hint). */
  readonly retryAfterMs: number
}

export interface RateLimiter {
  /**
   * Consume one token for `key`. Returns whether the request is allowed.
   * Implementations MUST be safe to call concurrently from the same
   * process / pod.
   */
  consume(key: string, now?: number): Promise<RateLimitDecision> | RateLimitDecision
  /** Reset all buckets — test seam only. */
  reset(): void
}

export interface RateLimiterOptions {
  readonly max: number
  readonly windowMs: number
}

export const createInMemoryRateLimiter = ({ max, windowMs }: RateLimiterOptions): RateLimiter => {
  const buckets = new Map<string, number[]>()

  return {
    consume(key, now = Date.now()): RateLimitDecision {
      const cutoff = now - windowMs
      const filtered = (buckets.get(key) ?? []).filter((t) => t > cutoff)
      if (filtered.length >= max) {
        buckets.set(key, filtered)
        const oldest = filtered[0] ?? now
        return {
          allowed: false,
          remaining: 0,
          retryAfterMs: Math.max(0, oldest + windowMs - now),
        }
      }
      filtered.push(now)
      buckets.set(key, filtered)
      return {
        allowed: true,
        remaining: max - filtered.length,
        retryAfterMs: 0,
      }
    },
    reset(): void {
      buckets.clear()
    },
  }
}
