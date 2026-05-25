/**
 * Synthetic uptime check — runs on Cloudflare Workers Cron (free tier).
 *
 * Phase 8 §8.7: "Synthetic uptime: `curl` checks via Cloudflare Workers
 * Cron (free)." Pings each S1 surface every 5 minutes and posts a
 * `::notice::`-style event to a webhook (Sentry / generic) when any
 * endpoint is unhealthy. Stays entirely in the free tier:
 *
 *   - 3 endpoints × 12 calls/hour × 24 = 864 requests/day, well under
 *     the 100k-requests/day Workers free quota.
 *   - No KV / D1 / R2 usage; uses fetch + the in-memory worker env.
 *
 * Wiring (deferred to user-side ops; see deploy-runbook.md §uptime):
 *
 *   wrangler init factivist-uptime --no-deploy
 *   cp apps/api/src/workers/uptime-cron.ts wrangler/src/index.ts
 *   wrangler secret put UPTIME_WEBHOOK_URL
 *   wrangler deploy
 *
 * The targets list intentionally lives in env (`UPTIME_TARGETS`,
 * newline-separated) so adding a new surface (e.g. The Graph subgraph
 * health) does not require a redeploy.
 *
 * Failure semantics: any non-2xx response or a fetch that throws is
 * reported as a `down` event. We do NOT attempt to retry inside the
 * cron tick — the next 5-min tick is the retry.
 */

export interface UptimeEnv {
  /** Newline-separated list of target URLs. */
  readonly UPTIME_TARGETS: string
  /** Webhook URL that receives `{ url, status, error?, ts }`. */
  readonly UPTIME_WEBHOOK_URL?: string
  /** Optional shared secret echoed on the webhook as `x-uptime-secret`. */
  readonly UPTIME_WEBHOOK_SECRET?: string
}

export interface UptimeCheckResult {
  readonly url: string
  /** HTTP status (0 when fetch threw). */
  readonly status: number
  readonly ok: boolean
  readonly latencyMs: number
  readonly error?: string
  readonly ts: string
}

/** Parse the newline-separated target list, ignoring blank lines + comments. */
export const parseTargets = (raw: string | undefined): readonly string[] => {
  if (!raw) return []
  return raw
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('#'))
}

/**
 * Probe a single URL. Always resolves (never throws) so a failing
 * target doesn't poison the others in `Promise.all`.
 */
export const probe = async (
  url: string,
  fetchImpl: typeof fetch = fetch,
  nowMs: () => number = () => Date.now(),
): Promise<UptimeCheckResult> => {
  const started = nowMs()
  const ts = new Date(started).toISOString()
  try {
    const res = await fetchImpl(url, {
      method: 'GET',
      redirect: 'manual',
      headers: { 'user-agent': 'factivist-uptime/1.0 (Cloudflare-Workers)' },
    })
    const latencyMs = nowMs() - started
    // 2xx + 3xx both count as up; the workers cron is not the place to
    // validate redirect targets.
    const ok = res.status >= 200 && res.status < 400
    return { url, status: res.status, ok, latencyMs, ts }
  } catch (err) {
    return {
      url,
      status: 0,
      ok: false,
      latencyMs: nowMs() - started,
      error: err instanceof Error ? err.message : String(err),
      ts,
    }
  }
}

/**
 * POST a single result to the webhook. Returns true on success, false
 * on any failure (logged but never thrown — the cron must always
 * resolve so the next tick fires).
 */
export const reportDown = async (
  result: UptimeCheckResult,
  env: UptimeEnv,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> => {
  if (!env.UPTIME_WEBHOOK_URL) return false
  try {
    const res = await fetchImpl(env.UPTIME_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(env.UPTIME_WEBHOOK_SECRET ? { 'x-uptime-secret': env.UPTIME_WEBHOOK_SECRET } : {}),
      },
      body: JSON.stringify(result),
    })
    return res.ok
  } catch {
    return false
  }
}

/**
 * Cloudflare Workers `scheduled` handler. Probes all configured
 * targets in parallel; reports any failure to the webhook.
 */
export const runScheduled = async (
  env: UptimeEnv,
  fetchImpl: typeof fetch = fetch,
  nowMs: () => number = () => Date.now(),
): Promise<readonly UptimeCheckResult[]> => {
  const targets = parseTargets(env.UPTIME_TARGETS)
  if (targets.length === 0) return []
  const results = await Promise.all(targets.map((t) => probe(t, fetchImpl, nowMs)))
  const downs = results.filter((r) => !r.ok)
  await Promise.all(downs.map((d) => reportDown(d, env, fetchImpl)))
  return results
}

// Cloudflare Workers entry — left as default export so the wrangler
// project can re-export it without modification.
export default {
  async scheduled(_event: unknown, env: UptimeEnv): Promise<void> {
    await runScheduled(env)
  },
}
