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
