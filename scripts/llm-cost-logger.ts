#!/usr/bin/env bun
/**
 * `llm-cost-logger` — Bun CLI shim that logs a dev-time LLM call into
 * `dev_metrics.llm_calls`.
 *
 * Usage:
 *   bun run scripts/llm-cost-logger.ts \
 *     --agent planner --model claude-opus-4-7 \
 *     --prompt-tokens 1234 --completion-tokens 567 \
 *     [--cache-read-tokens 100] [--task-id ruflo-task-42] \
 *     [--cost-usd 0.123]   # if omitted, computed from the pricing table
 *
 *   echo '{"agent":"planner","model":"claude-opus-4-7","prompt_tokens":1234,"completion_tokens":567}' \
 *     | bun run scripts/llm-cost-logger.ts
 *
 * Exit codes:
 *   0 — success
 *   1 — validation error (bad input)
 *   2 — database error (insert failed)
 *
 * The pricing table lives in this file so the shim is dependency-free at
 * runtime (other than `@factivist/db` + `@factivist/shared`). Update the
 * `MODEL_PRICING` map whenever vendor prices change — costs are stored at
 * write-time so historical reads remain accurate.
 *
 * Phase 2 action plan §2.3.
 */

import { llmCalls } from '@factivist/db/schema'
import {
  type LlmCallInsert,
  llmCallInsertSchema,
  llmCallSnakeInsertSchema,
} from '@factivist/shared/validators'
import type { z } from 'zod'

/**
 * Per-million-token pricing in USD as of the action-plan date (2026-05-23).
 *
 * `cacheRead` is optional; absent entries default to `input` rate.
 *
 * Sources:
 *   - Anthropic API pricing page (claude-opus-4-7, claude-sonnet-4-6, claude-haiku-4-5)
 *   - OpenAI API pricing page (gpt-4o)
 */
export const MODEL_PRICING: Record<string, { input: number; output: number; cacheRead?: number }> =
  {
    'claude-opus-4-7': { input: 15, output: 75, cacheRead: 1.5 },
    'claude-sonnet-4-6': { input: 3, output: 15, cacheRead: 0.3 },
    'claude-haiku-4-5': { input: 0.8, output: 4, cacheRead: 0.08 },
    'gpt-4o': { input: 2.5, output: 10 },
  }

/**
 * Compute USD cost from token counts using the pricing table.
 * Returns `undefined` for unknown models so the caller can fall back to an
 * explicit `--cost-usd` flag (or fail validation if neither is provided).
 */
export const computeCostUsd = (
  model: string,
  promptTokens: number,
  completionTokens: number,
  cacheReadTokens: number,
): number | undefined => {
  const price = MODEL_PRICING[model]
  if (!price) return undefined
  const cacheRate = price.cacheRead ?? price.input
  const cost =
    (promptTokens / 1_000_000) * price.input +
    (completionTokens / 1_000_000) * price.output +
    (cacheReadTokens / 1_000_000) * cacheRate
  // Round to 6 decimals — matches the numeric(10,6) column scale.
  return Math.round(cost * 1_000_000) / 1_000_000
}

/**
 * Argv parser. Intentionally tiny — we only need long flags (`--foo bar`
 * and `--foo=bar`). Boolean-style flags are not supported.
 */
export const parseArgs = (argv: readonly string[]): Record<string, string> => {
  const out: Record<string, string> = {}
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i]
    if (!tok?.startsWith('--')) continue
    const eq = tok.indexOf('=')
    if (eq > -1) {
      out[tok.slice(2, eq)] = tok.slice(eq + 1)
      continue
    }
    const key = tok.slice(2)
    const next = argv[i + 1]
    if (next !== undefined && !next.startsWith('--')) {
      out[key] = next
      i++
    } else {
      out[key] = ''
    }
  }
  return out
}

const intFlag = (val: string | undefined): number | undefined =>
  val === undefined ? undefined : Number.parseInt(val, 10)

const floatFlag = (val: string | undefined): number | undefined =>
  val === undefined ? undefined : Number.parseFloat(val)

/**
 * Truthy/falsy parser for flag-and-env booleans. Accepts the typical
 * shell idioms ("1"/"0", "true"/"false", "yes"/"no") plus the empty
 * string (interpreted as `true` so `--batched` with no value still flips
 * the flag on).
 */
export const parseBoolFlag = (val: string | undefined): boolean | undefined => {
  if (val === undefined) return undefined
  const v = val.trim().toLowerCase()
  if (v === '' || v === '1' || v === 'true' || v === 'yes' || v === 'on') return true
  if (v === '0' || v === 'false' || v === 'no' || v === 'off') return false
  return undefined
}

/**
 * Convert parsed CLI flags into the snake/camel payload shape the validator
 * expects. Keys mirror the CLI flag names.
 *
 * `batched` honours the `BATCHED` env var as a fallback (per perf-engineer
 * spec) so wrapper scripts can flip the discount flag without re-templating
 * the JSON body.
 */
export const flagsToPayload = (
  flags: Record<string, string>,
  env: Record<string, string | undefined> = process.env,
): Record<string, unknown> => {
  const payload: Record<string, unknown> = {}
  if (flags.agent !== undefined) payload.agent = flags.agent
  if (flags.model !== undefined) payload.model = flags.model
  const pt = intFlag(flags['prompt-tokens'])
  if (pt !== undefined && !Number.isNaN(pt)) payload.prompt_tokens = pt
  const ct = intFlag(flags['completion-tokens'])
  if (ct !== undefined && !Number.isNaN(ct)) payload.completion_tokens = ct
  const cr = intFlag(flags['cache-read-tokens'])
  if (cr !== undefined && !Number.isNaN(cr)) payload.cache_read_tokens = cr
  const cu = floatFlag(flags['cost-usd'])
  if (cu !== undefined && !Number.isNaN(cu)) payload.cost_usd = cu
  const batchedFlag = parseBoolFlag(flags.batched)
  const batchedEnv = parseBoolFlag(env.BATCHED)
  const batched = batchedFlag ?? batchedEnv
  if (batched !== undefined) payload.batched = batched
  if (flags['task-id'] !== undefined) payload.task_id = flags['task-id']
  if (flags.ts !== undefined) payload.ts = flags.ts
  return payload
}

/**
 * Read all of stdin as a UTF-8 string. Returns empty string if stdin is a
 * TTY (so CLI-only usage isn't blocked).
 */
export const readStdin = async (
  stdin: NodeJS.ReadableStream & { isTTY?: boolean },
): Promise<string> => {
  if (stdin.isTTY) return ''
  let data = ''
  for await (const chunk of stdin) {
    data += typeof chunk === 'string' ? chunk : chunk.toString('utf8')
  }
  return data
}

interface LlmCallsTable {
  insert: (table: typeof llmCalls) => { values: (row: LlmCallInsert) => Promise<unknown> }
}

/**
 * Insert a validated row using the provided Drizzle client.
 * Exposed for tests — production code calls `main()` which wires `db`.
 */
export const insertRow = async (database: LlmCallsTable, row: LlmCallInsert): Promise<void> => {
  await database.insert(llmCalls).values(row)
}

interface MainDeps {
  argv: readonly string[]
  stdin: NodeJS.ReadableStream & { isTTY?: boolean }
  database: LlmCallsTable
  log: (msg: string) => void
  error: (msg: string) => void
}

/**
 * Main entry point. Returns the desired process exit code so callers (and
 * tests) can assert without forcing `process.exit`.
 */
export const main = async (deps: MainDeps): Promise<0 | 1 | 2> => {
  const flags = parseArgs(deps.argv)
  const flagPayload = flagsToPayload(flags)
  const stdinRaw = await readStdin(deps.stdin)
  let payload: Record<string, unknown> = flagPayload
  if (stdinRaw.trim().length > 0) {
    try {
      const parsed = JSON.parse(stdinRaw) as Record<string, unknown>
      // Flags override stdin so CLI users can patch a piped JSON body.
      payload = { ...parsed, ...flagPayload }
    } catch (err) {
      deps.error(`invalid JSON on stdin: ${(err as Error).message}`)
      return 1
    }
  }

  // If costUsd is absent, try the pricing table.
  if (payload.cost_usd === undefined && payload.costUsd === undefined) {
    const model = typeof payload.model === 'string' ? payload.model : ''
    const computed = computeCostUsd(
      model,
      typeof payload.prompt_tokens === 'number' ? payload.prompt_tokens : 0,
      typeof payload.completion_tokens === 'number' ? payload.completion_tokens : 0,
      typeof payload.cache_read_tokens === 'number' ? payload.cache_read_tokens : 0,
    )
    if (computed !== undefined) payload.cost_usd = computed
  }

  const parsed = llmCallSnakeInsertSchema.safeParse(payload)
  if (!parsed.success) {
    deps.error(`validation failed: ${formatZodIssues(parsed.error)}`)
    return 1
  }
  // Re-parse through the canonical schema to apply `.default(0)` etc.
  const final = llmCallInsertSchema.parse(parsed.data)

  try {
    await insertRow(deps.database, final)
  } catch (err) {
    deps.error(`db insert failed: ${(err as Error).message}`)
    return 2
  }
  deps.log(`logged ${final.agent} / ${final.model} ($${final.costUsd.toFixed(6)})`)
  return 0
}

const formatZodIssues = (err: z.ZodError): string =>
  err.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ')

// `import.meta.main` is Bun's idiom for "this file was invoked directly".
// We guard it so importing this module from tests does not boot the CLI.
/* c8 ignore start */
if (import.meta.main) {
  const { db } = await import('@factivist/db/client')
  const code = await main({
    argv: Bun.argv.slice(2),
    stdin: process.stdin,
    database: db as unknown as LlmCallsTable,
    log: (m) => process.stdout.write(`${m}\n`),
    error: (m) => process.stderr.write(`${m}\n`),
  })
  process.exit(code)
}
/* c8 ignore stop */
