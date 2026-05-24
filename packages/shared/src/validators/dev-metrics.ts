import { z } from 'zod'

/**
 * Validators for `dev_metrics.llm_calls` ingestion.
 *
 * The CLI shim (`scripts/llm-cost-logger.ts`) and any future API endpoint
 * MUST validate input through these schemas before touching the database.
 *
 * Two representations are exported:
 *   - `llmCallInsertSchema`        — camelCase, matches the Drizzle row.
 *   - `llmCallSnakeInsertSchema`   — snake_case payload (the JSON shape
 *     Claude Code / Codex / Cursor hooks emit), transformed into the
 *     camelCase shape via Zod's `.transform`. Use this when accepting
 *     stdin / webhook bodies from external tooling.
 *
 * Phase 2 action plan §2.3.
 */

/**
 * Free-text agent name. The plan tags calls with the named swarm role
 * (e.g. `planner`, `zkp-researcher`, `metrics-coder`); we don't enum-lock
 * this because new agents come and go between phases.
 */
const agentSchema = z
  .string()
  .min(1, 'agent must not be empty')
  .max(64, 'agent must be ≤ 64 characters')

/**
 * Model identifier as reported by the vendor SDK
 * (e.g. `claude-opus-4-7`, `claude-sonnet-4-6`, `gpt-4o`).
 */
const modelSchema = z
  .string()
  .min(1, 'model must not be empty')
  .max(128, 'model must be ≤ 128 characters')

const nonNegativeInt = z.number().int().nonnegative()

/**
 * Cost in USD as a non-negative number. Stored as `numeric(10,6)` in Postgres
 * so we cap at ~9,999.999999 USD per call (well above any realistic single
 * invocation).
 */
const costUsdSchema = z
  .number()
  .nonnegative('costUsd must be ≥ 0')
  .max(9_999.999_999, 'costUsd exceeds numeric(10,6) range')
  .refine((n) => Number.isFinite(n), { message: 'costUsd must be finite' })

/**
 * Optional Ruflo task id (any free-text identifier). We keep this loose
 * because the upstream task systems evolve faster than this table.
 */
const taskIdSchema = z.string().min(1).max(128).optional()

/**
 * Optional explicit timestamp. If omitted, the database fills in `now()`.
 * Accepts ISO-8601 strings or `Date` instances.
 */
const tsSchema = z.union([z.iso.datetime({ offset: true }), z.date()]).optional()

/**
 * Canonical camelCase insert payload — matches `NewLlmCall` from
 * `@factivist/db/schema`.
 *
 * `batched` is the Anthropic Batch API discount flag — required by the
 * Phase 2 scorecard's `batched_fraction` metric. Defaults to `false` so
 * callers that don't know about the flag stay correct.
 */
export const llmCallInsertSchema = z.object({
  agent: agentSchema,
  model: modelSchema,
  promptTokens: nonNegativeInt,
  completionTokens: nonNegativeInt,
  cacheReadTokens: nonNegativeInt.default(0),
  costUsd: costUsdSchema,
  batched: z.boolean().default(false),
  taskId: taskIdSchema,
  ts: tsSchema,
})

export type LlmCallInsert = z.infer<typeof llmCallInsertSchema>

/**
 * Snake-case input payload (the JSON shape Claude / Codex / Cursor hooks emit)
 * transformed into the canonical camelCase shape.
 *
 * Accepts EITHER snake_case OR camelCase keys for resilience: hooks differ
 * across vendors and we don't want a single typo in the shim wrapper to drop
 * a row on the floor.
 */
export const llmCallSnakeInsertSchema = z
  .object({
    agent: agentSchema,
    model: modelSchema,
    prompt_tokens: nonNegativeInt.optional(),
    promptTokens: nonNegativeInt.optional(),
    completion_tokens: nonNegativeInt.optional(),
    completionTokens: nonNegativeInt.optional(),
    cache_read_tokens: nonNegativeInt.optional(),
    cacheReadTokens: nonNegativeInt.optional(),
    cost_usd: costUsdSchema.optional(),
    costUsd: costUsdSchema.optional(),
    batched: z.boolean().optional(),
    task_id: taskIdSchema,
    taskId: taskIdSchema,
    ts: tsSchema,
  })
  .transform((raw, ctx) => {
    const promptTokens = raw.promptTokens ?? raw.prompt_tokens
    const completionTokens = raw.completionTokens ?? raw.completion_tokens
    const costUsd = raw.costUsd ?? raw.cost_usd
    if (promptTokens === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'promptTokens / prompt_tokens is required',
        path: ['promptTokens'],
      })
      return z.NEVER
    }
    if (completionTokens === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'completionTokens / completion_tokens is required',
        path: ['completionTokens'],
      })
      return z.NEVER
    }
    if (costUsd === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'costUsd / cost_usd is required',
        path: ['costUsd'],
      })
      return z.NEVER
    }
    const result: LlmCallInsert = {
      agent: raw.agent,
      model: raw.model,
      promptTokens,
      completionTokens,
      cacheReadTokens: raw.cacheReadTokens ?? raw.cache_read_tokens ?? 0,
      costUsd,
      batched: raw.batched ?? false,
      taskId: raw.taskId ?? raw.task_id,
      ts: raw.ts,
    }
    return result
  })
