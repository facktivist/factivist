/**
 * `dev_metrics.llm_calls` — instrumentation for dev-time LLM usage.
 *
 * Lives in a dedicated `dev_metrics` Postgres schema (not `public`) so the
 * operational data plane and the metrics plane stay cleanly separated. Every
 * dev-time Claude / Codex / Cursor call funnels into this table via the
 * Bun CLI shim at `scripts/llm-cost-logger.ts`.
 *
 * Phase 2 action plan §2.3 (S1 Verifiable Lean MVP).
 *
 * Schema notes:
 *   - `agent` is the named swarm role making the call (e.g. `planner`,
 *     `zkp-researcher`, `metrics-coder`). Free text — agents come and go.
 *   - `model` identifies the LLM (e.g. `claude-opus-4-7`, `gpt-4o`).
 *   - Token counts are split into prompt / completion / cache-read so we can
 *     reconcile against vendor invoices and compute true marginal cost.
 *   - `costUsd` is a `numeric(10,6)` — 6 decimal places handles sub-cent
 *     line items (e.g. cached reads at $0.30/MTok), 10 total digits supports
 *     up to ~9,999 USD per call (plenty of headroom).
 *   - `taskId` is a free-text Ruflo task identifier, optional because not
 *     every call originates inside a tracked task.
 *   - Indices on `(agent, ts)` and `taskId` keep the two dominant queries
 *     fast: "what did agent X cost over time" and "what did task Y cost".
 */

import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgSchema,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

/**
 * Postgres schema namespace for development-time metrics.
 *
 * Exposed so migrations can `CREATE SCHEMA IF NOT EXISTS dev_metrics`,
 * and so tests can introspect the schema name.
 */
export const devMetricsSchema = pgSchema('dev_metrics')

export const llmCalls = devMetricsSchema.table(
  'llm_calls',
  {
    id: uuid().defaultRandom().primaryKey(),
    agent: text().notNull(),
    model: text().notNull(),
    promptTokens: integer().notNull(),
    completionTokens: integer().notNull(),
    cacheReadTokens: integer().notNull().default(0),
    costUsd: numeric({ precision: 10, scale: 6 }).notNull(),
    /**
     * `batched` — whether this call went through the Anthropic Batch API
     * (50% discount). Required for the Phase 2 scorecard's
     * `batched_fraction` metric. Defaults to false so non-batched callers
     * keep working without code changes.
     */
    batched: boolean().notNull().default(false),
    taskId: text(),
    ts: timestamp({ withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('llm_calls_by_agent').on(table.agent, table.ts),
    index('llm_calls_by_task_id').on(table.taskId),
  ],
)

export type LlmCall = typeof llmCalls.$inferSelect
export type NewLlmCall = typeof llmCalls.$inferInsert

/**
 * `dev_metrics.zkp_route_events` — observability for AnonCitizen proving-route
 * decisions (client snarkjs/rapidsnark vs. server-side fallback per
 * `/identity/prove`).
 *
 * ## Why this table exists
 *
 * ATID-IDENT-004 (low-tier server-fallback observability): cost-analyst needs
 * to track the server-fallback rate so the S1 cost-drift scorecard
 * ([[s1-cost-drift]]) can attribute Polygon + API-side proving cost. Every
 * server-side proving attempt — success OR failure — writes exactly one row
 * here, fire-and-forget (the response MUST NOT block on this write).
 *
 * ## Anonymity invariant (zkp-key-custody.md §Server-side fallback rule #6)
 *
 * Allowed: route (server|client), platform (ios|android|web), outcome
 * (success|failed), proving duration in ms, optional metadata limited to
 * known feature-flag booleans.
 *
 * Forbidden: nullifier, Aadhaar number, IP, user-agent, session id, witness
 * bytes, photo halves, seed, public signals, error messages from the prover
 * (an Aadhaar can appear in a stack trace).
 *
 * The shape is enforced by `llmCallInsertSchema`-style Zod validators in
 * `packages/shared/src/validators/dev-metrics.ts`. The route helper
 * (`apps/api/src/lib/dev-metrics.ts`) validates BEFORE it touches the DB.
 *
 * ## Schema notes
 *
 *   - `id` — UUID PK, server-generated (`gen_random_uuid()`).
 *   - `purpose` — event family. Free text so new dev-metric kinds can land
 *     without a migration. For IDENT-004 the only value is `'zkp_route'`.
 *   - `route` — `'server'` (this API proved) or `'client'` (the device
 *     proved and we only logged the choice). For S1 we currently only emit
 *     `'server'` rows from `/identity/prove`; the `'client'` value is
 *     reserved for the mobile-side beacon that lands in wave 4.
 *   - `platform` — `'ios' | 'android' | 'web'`. Filled in from a
 *     client-supplied hint header (`x-factivist-platform`) — NOT from
 *     User-Agent (which can identify the device).
 *   - `outcome` — `'success' | 'failed'`. Required so the fail rate is
 *     greppable without filtering on `durationMs IS NULL`.
 *   - `durationMs` — wall-clock proving duration in milliseconds (integer).
 *     Nullable because some failure paths reject before the prover even
 *     starts (e.g. rate-limit, flag-off).
 *   - `metadata` — `jsonb` for known booleans only (`{ complaintFlagOn:
 *     true }`). The Zod validator restricts the shape; the column type is
 *     `jsonb` purely so a future, additive flag does not require a
 *     migration. NEVER store free-form text here.
 *   - `ts` — append-time timestamp with timezone, default `now()`.
 *
 * Indices: `(purpose, ts)` for the cost-analyst query "what was the
 * server-fallback rate over the last 7 days?" and `(outcome, ts)` for
 * "is the failure rate spiking?".
 */
export const zkpRouteEvents = devMetricsSchema.table(
  'zkp_route_events',
  {
    id: uuid().defaultRandom().primaryKey(),
    purpose: text().notNull(),
    route: text().notNull(),
    platform: text().notNull(),
    outcome: text().notNull(),
    durationMs: integer(),
    /**
     * Strictly-shaped JSON blob. The Zod validator
     * (`devMetricEventSchema`) keeps the keyspace small and the values
     * PII-free. `$type` is unset so Drizzle returns the raw `unknown`
     * shape — callers are expected to validate before / after the
     * round-trip.
     */
    metadata: jsonb(),
    ts: timestamp({ withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('zkp_route_events_by_purpose').on(table.purpose, table.ts),
    index('zkp_route_events_by_outcome').on(table.outcome, table.ts),
  ],
)

export type ZkpRouteEvent = typeof zkpRouteEvents.$inferSelect
export type NewZkpRouteEvent = typeof zkpRouteEvents.$inferInsert
