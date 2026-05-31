/**
 * `dev_metrics` event writer — thin, fire-and-forget wrapper around the
 * `dev_metrics.zkp_route_events` table for ATID-IDENT-004 observability.
 *
 * ## Why a wrapper at all
 *
 * Route handlers should never call `db.insert(zkpRouteEvents)...` directly:
 *
 *   1. **Anonymity floor.** Every event is parsed through
 *      `devMetricEventSchema` first, so a stray nullifier / Aadhaar / IP /
 *      User-Agent cannot reach Postgres even if a future caller forgets.
 *      The schema's `.strict()` mode + enumerated unions enforce the
 *      keyspace contract from `zkp-key-custody.md §Server-side fallback
 *      rule #6`.
 *
 *   2. **Fire-and-forget.** The proving response MUST NOT block on a
 *      metrics write — the citizen pays no latency for our observability.
 *      `recordDevMetric` returns immediately; the DB write happens on the
 *      microtask queue. A failed write is logged once and swallowed.
 *
 *   3. **Test seam.** All metric writes flow through a single function so
 *      tests can spy on the call site without touching every route.
 *
 * ## What this module is NOT
 *
 * NOT a generic telemetry sink. NOT a place for free-text fields. NOT a
 * fallback log channel — use `console.warn` for operational issues. The
 * function rejects payloads at parse time; do not catch and retry.
 *
 * ## Adding a new event family
 *
 *   1. Extend `devMetricEventSchema` in
 *      `packages/shared/src/validators/dev-metrics.ts` with a new
 *      `z.literal('<purpose>')` branch.
 *   2. If the new family needs columns the existing table doesn't have
 *      (e.g. a typed numeric `value`), prefer a brand-new table over
 *      reusing `metadata` — Postgres queries stay sharper.
 *   3. Update `docs/architecture/phase-5/wave-2-auth.md` §Dev-metrics
 *      events with the new contract.
 */

import { zkpRouteEvents } from '@factivist/db/schema'
import {
  type DevMetricEvent,
  devMetricEventSchema,
  type ZkpRouteEventInsert,
} from '@factivist/shared/validators'

/**
 * Minimal Drizzle surface this helper needs. We deliberately type by
 * shape (not by `import('drizzle-orm/...')`) so unit tests can pass a
 * lightweight stub without dragging the full driver in.
 */
export interface DevMetricsDb {
  insert: (table: typeof zkpRouteEvents) => {
    values: (row: Record<string, unknown>) => Promise<unknown>
  }
}

/**
 * Optional override for the warning sink — wired in by tests so they can
 * assert one warning per failed write without polluting the global
 * `console`. Production code never sets this.
 */
let warnSink: (message: string) => void = (message) => {
  // dev-metrics failures must surface in the API process log so
  // operators can spot a DB outage — this is the one allowed channel.
  console.warn(message)
}

/** Test-only — replace the warn sink. Resets via the returned `undo`. */
export const __setWarnSink = (next: (message: string) => void): (() => void) => {
  const prev = warnSink
  warnSink = next
  return () => {
    warnSink = prev
  }
}

/**
 * Record a single dev-metrics event. The function:
 *
 *   1. Parses the event through `devMetricEventSchema`. A parse failure
 *      is itself a bug — we throw synchronously so the test suite
 *      catches the typo, but in production the route's calling pattern
 *      (`void recordDevMetric(...)`) swallows the rejection.
 *   2. Maps the validated event onto the table row shape.
 *   3. Awaits the insert internally. If it rejects, the error is logged
 *      ONCE via the warn sink and swallowed — never re-thrown.
 *
 * Returns a `Promise<void>` purely so tests can `await` it; production
 * callers should `void`-fire and continue.
 *
 * @throws {z.ZodError} when the event payload itself is malformed.
 *   This is intentional — parse errors are programmer bugs, not runtime
 *   failures we want to silently drop on the floor.
 */
export const recordDevMetric = (db: DevMetricsDb, event: DevMetricEvent): Promise<void> => {
  // Parse first — synchronously, BEFORE returning the promise — so a
  // malformed event throws at the call site (programmer bug). Route
  // callers wrap `recordDevMetric` in `void` so a synchronous throw
  // from a sub-agent typo cannot crash the response, but the test
  // suite catches it via `expect(() => …).toThrow()`.
  const parsed: DevMetricEvent = devMetricEventSchema.parse(event)

  // Currently the only event family is `zkp_route`. Dispatch on
  // `purpose` so a future family adds a new branch instead of widening
  // the existing one.
  if (parsed.purpose === 'zkp_route') {
    return insertZkpRouteEvent(db, parsed)
  }

  // Defence-in-depth: the discriminated union should make this
  // unreachable, but if a future maintainer adds a `purpose` to the
  // Zod schema and forgets to wire a branch here, we want a loud
  // warning rather than a silent drop.
  warnSink(`recordDevMetric: unhandled purpose ${(parsed as { purpose: string }).purpose}`)
  return Promise.resolve()
}

const insertZkpRouteEvent = async (db: DevMetricsDb, event: ZkpRouteEventInsert): Promise<void> => {
  try {
    await db.insert(zkpRouteEvents).values({
      purpose: event.purpose,
      route: event.route,
      platform: event.platform,
      outcome: event.outcome,
      // `null` only when the value is genuinely unknown (pre-prover
      // reject). The Zod schema permits omission; Drizzle handles
      // `undefined` correctly but we normalise to `null` so the column
      // value is explicit on the wire.
      durationMs: event.durationMs ?? null,
      metadata: event.metadata ?? null,
      // `ts` is intentionally omitted so the DB defaults to `now()`.
      // Tests that need a deterministic timestamp insert one explicitly.
      ...(event.ts !== undefined ? { ts: event.ts } : {}),
    })
  } catch (err) {
    // Single warning, no rethrow — observability MUST NOT block the
    // citizen response. Operators see this in the API process log; a
    // missing rate in the cost-analyst scorecard is the secondary alarm.
    const message = err instanceof Error ? err.message : String(err)
    warnSink(`recordDevMetric: zkp_route insert failed: ${message}`)
  }
}
