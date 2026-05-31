import { Readable } from 'node:stream'
import { describe, expect, it, vi } from 'vitest'

import {
  computeCostUsd,
  flagsToPayload,
  insertRow,
  MODEL_PRICING,
  main,
  parseArgs,
  parseBoolFlag,
  readStdin,
} from '../llm-cost-logger.ts'

function getModelPricing(model: keyof typeof MODEL_PRICING) {
  const price = MODEL_PRICING[model]

  if (!price) {
    throw new Error(`Missing pricing for ${model}`)
  }

  return price
}

describe('parseArgs', () => {
  it('parses --flag value pairs', () => {
    const out = parseArgs(['--agent', 'planner', '--prompt-tokens', '123'])
    expect(out.agent).toBe('planner')
    expect(out['prompt-tokens']).toBe('123')
  })

  it('parses --flag=value syntax', () => {
    const out = parseArgs(['--model=claude-opus-4-7', '--cost-usd=0.05'])
    expect(out.model).toBe('claude-opus-4-7')
    expect(out['cost-usd']).toBe('0.05')
  })

  it('treats a boolean flag (no value) as empty string', () => {
    const out = parseArgs(['--verbose', '--agent', 'x'])
    expect(out.verbose).toBe('')
    expect(out.agent).toBe('x')
  })

  it('ignores positional args not starting with --', () => {
    const out = parseArgs(['stray', '--agent', 'planner'])
    expect(out.agent).toBe('planner')
    expect(out.stray).toBeUndefined()
  })

  it('returns {} for an empty argv', () => {
    expect(parseArgs([])).toEqual({})
  })
})

describe('parseBoolFlag', () => {
  it('returns true for truthy strings and empty string', () => {
    for (const v of ['1', 'true', 'yes', 'on', 'TRUE', '']) {
      expect(parseBoolFlag(v)).toBe(true)
    }
  })

  it('returns false for explicit falsy strings', () => {
    for (const v of ['0', 'false', 'no', 'off', 'No']) {
      expect(parseBoolFlag(v)).toBe(false)
    }
  })

  it('returns undefined for unrecognised values', () => {
    expect(parseBoolFlag('maybe')).toBeUndefined()
  })

  it('returns undefined when value is undefined', () => {
    expect(parseBoolFlag(undefined)).toBeUndefined()
  })
})

describe('flagsToPayload', () => {
  it('lifts known flags into the snake_case payload', () => {
    const payload = flagsToPayload(
      {
        agent: 'planner',
        model: 'claude-opus-4-7',
        'prompt-tokens': '1000',
        'completion-tokens': '200',
        'cache-read-tokens': '50',
        'cost-usd': '0.03',
        batched: 'true',
        'task-id': 'ruflo-1',
        ts: '2026-05-22T10:00:00.000Z',
      },
      {},
    )
    expect(payload).toEqual({
      agent: 'planner',
      model: 'claude-opus-4-7',
      prompt_tokens: 1000,
      completion_tokens: 200,
      cache_read_tokens: 50,
      cost_usd: 0.03,
      batched: true,
      task_id: 'ruflo-1',
      ts: '2026-05-22T10:00:00.000Z',
    })
  })

  it('honours BATCHED env var when --batched is not passed', () => {
    const payload = flagsToPayload({ agent: 'a' }, { BATCHED: '1' })
    expect(payload.batched).toBe(true)
  })

  it('prefers explicit --batched=false over BATCHED=1 env', () => {
    const payload = flagsToPayload({ batched: 'false' }, { BATCHED: '1' })
    expect(payload.batched).toBe(false)
  })

  it('omits batched when neither flag nor env is set', () => {
    const payload = flagsToPayload({}, {})
    expect(payload.batched).toBeUndefined()
  })

  it('drops NaN numeric flags', () => {
    const payload = flagsToPayload({ 'prompt-tokens': 'not-a-number' }, {})
    expect(payload.prompt_tokens).toBeUndefined()
  })

  it('omits flags that are not provided', () => {
    expect(flagsToPayload({}, {})).toEqual({})
  })
})

describe('computeCostUsd', () => {
  it('computes Opus pricing using input + output + cacheRead rates', () => {
    const price = getModelPricing('claude-opus-4-7')
    const result = computeCostUsd('claude-opus-4-7', 1_000_000, 1_000_000, 1_000_000)
    expect(result).toBe(
      Math.round((price.input + price.output + (price.cacheRead ?? price.input)) * 1_000_000) /
        1_000_000,
    )
  })

  it('falls back to input rate when cacheRead is unset', () => {
    const result = computeCostUsd('gpt-4o', 0, 0, 1_000_000)
    // gpt-4o has no cacheRead override → uses input ($2.50/MTok)
    expect(result).toBeCloseTo(2.5, 6)
  })

  it('returns undefined for an unknown model', () => {
    expect(computeCostUsd('mystery-model', 1, 1, 0)).toBeUndefined()
  })

  it('returns 0 when token counts are zero', () => {
    expect(computeCostUsd('claude-haiku-4-5', 0, 0, 0)).toBe(0)
  })

  it('rounds to numeric(10,6) precision', () => {
    const result = computeCostUsd('claude-haiku-4-5', 7, 3, 0)
    expect(result).toBeDefined()
    // 7e-6 * 0.8 + 3e-6 * 4 = 5.6e-6 + 12e-6 = 1.76e-5
    expect(result).toBeCloseTo(0.000018, 6)
  })
})

const makeStdin = (
  body: string,
  opts: { isTTY?: boolean } = {},
): NodeJS.ReadableStream & { isTTY?: boolean } => {
  const stream = Readable.from([body]) as NodeJS.ReadableStream & { isTTY?: boolean }
  stream.isTTY = opts.isTTY ?? false
  return stream
}

describe('readStdin', () => {
  it('reads all chunks from a non-TTY stream', async () => {
    const data = await readStdin(makeStdin('hello world'))
    expect(data).toBe('hello world')
  })

  it('returns empty string when stdin is a TTY', async () => {
    const data = await readStdin(makeStdin('should not be read', { isTTY: true }))
    expect(data).toBe('')
  })

  it('handles Buffer chunks', async () => {
    const stream = Readable.from([Buffer.from('abc')]) as NodeJS.ReadableStream & {
      isTTY?: boolean
    }
    stream.isTTY = false
    expect(await readStdin(stream)).toBe('abc')
  })
})

interface CapturedRow {
  agent: string
  model: string
  promptTokens: number
  completionTokens: number
  cacheReadTokens: number
  costUsd: number
  batched: boolean
  taskId?: string
  ts?: Date | string
}

const makeDatabase = (impl?: (row: CapturedRow) => Promise<void>) => {
  const values = vi.fn(async (row: CapturedRow) => {
    if (impl) await impl(row)
  })
  const insert = vi.fn(() => ({ values }))
  return { db: { insert }, insert, values }
}

describe('insertRow', () => {
  it('passes the row through to drizzle insert().values()', async () => {
    const { db, insert, values } = makeDatabase()
    await insertRow(db as never, {
      agent: 'planner',
      model: 'claude-opus-4-7',
      promptTokens: 1,
      completionTokens: 2,
      cacheReadTokens: 0,
      costUsd: 0.001,
      batched: false,
    })
    expect(insert).toHaveBeenCalledOnce()
    expect(values).toHaveBeenCalledOnce()
    expect(values.mock.calls[0]?.[0]).toMatchObject({ agent: 'planner', promptTokens: 1 })
  })
})

describe('main()', () => {
  const makeDeps = (
    overrides: Partial<Parameters<typeof main>[0]> & { stdinBody?: string } = {},
  ) => {
    const log = vi.fn<(msg: string) => void>()
    const error = vi.fn<(msg: string) => void>()
    const { db, values } = makeDatabase()
    const { stdinBody, ...rest } = overrides
    return {
      log,
      error,
      values,
      deps: {
        argv: [],
        stdin: makeStdin(stdinBody ?? '', { isTTY: stdinBody === undefined }),
        database: db as never,
        log,
        error,
        ...rest,
      } satisfies Parameters<typeof main>[0],
    }
  }

  it('returns 0 on a valid flag-only invocation and inserts the row', async () => {
    const { deps, values, log } = makeDeps({
      argv: [
        '--agent',
        'planner',
        '--model',
        'claude-opus-4-7',
        '--prompt-tokens',
        '1000',
        '--completion-tokens',
        '200',
      ],
    })
    const code = await main(deps)
    expect(code).toBe(0)
    expect(values).toHaveBeenCalledOnce()
    const row = values.mock.calls[0]?.[0]
    expect(row).toMatchObject({
      agent: 'planner',
      model: 'claude-opus-4-7',
      promptTokens: 1000,
      completionTokens: 200,
      cacheReadTokens: 0,
      batched: false,
    })
    // costUsd was computed from the pricing table (Opus = 15 in + 75 out per MTok)
    expect(row?.costUsd).toBeCloseTo(0.03, 6)
    expect(log).toHaveBeenCalledOnce()
  })

  it('flips batched=true when --batched flag is passed', async () => {
    const { deps, values } = makeDeps({
      argv: [
        '--agent',
        'planner',
        '--model',
        'claude-opus-4-7',
        '--prompt-tokens',
        '1000',
        '--completion-tokens',
        '200',
        '--batched',
        '1',
      ],
    })
    const code = await main(deps)
    expect(code).toBe(0)
    expect(values.mock.calls[0]?.[0]?.batched).toBe(true)
  })

  it('returns 0 on a valid stdin-only JSON invocation', async () => {
    const { deps, values } = makeDeps({
      stdinBody: JSON.stringify({
        agent: 'metrics-coder',
        model: 'claude-sonnet-4-6',
        prompt_tokens: 500,
        completion_tokens: 100,
        cost_usd: 0.002,
      }),
    })
    const code = await main(deps)
    expect(code).toBe(0)
    expect(values.mock.calls[0]?.[0]).toMatchObject({
      agent: 'metrics-coder',
      promptTokens: 500,
      costUsd: 0.002,
    })
  })

  it('lets CLI flags override stdin body fields', async () => {
    const { deps, values } = makeDeps({
      argv: ['--agent', 'override-agent'],
      stdinBody: JSON.stringify({
        agent: 'stdin-agent',
        model: 'claude-opus-4-7',
        prompt_tokens: 100,
        completion_tokens: 50,
        cost_usd: 0.001,
      }),
    })
    const code = await main(deps)
    expect(code).toBe(0)
    expect(values.mock.calls[0]?.[0]?.agent).toBe('override-agent')
  })

  it('returns 1 on malformed JSON stdin', async () => {
    const { deps, error } = makeDeps({ stdinBody: '{ not json' })
    const code = await main(deps)
    expect(code).toBe(1)
    expect(error.mock.calls[0]?.[0]).toMatch(/invalid JSON/)
  })

  it('returns 1 when validation fails (missing required field)', async () => {
    const { deps, error } = makeDeps({ argv: ['--agent', 'planner'] })
    const code = await main(deps)
    expect(code).toBe(1)
    expect(error.mock.calls[0]?.[0]).toMatch(/validation failed/)
  })

  it('returns 1 when costUsd is unknown and the model has no pricing entry', async () => {
    const { deps, error } = makeDeps({
      argv: [
        '--agent',
        'planner',
        '--model',
        'mystery-model',
        '--prompt-tokens',
        '100',
        '--completion-tokens',
        '50',
      ],
    })
    const code = await main(deps)
    expect(code).toBe(1)
    expect(error).toHaveBeenCalled()
  })

  it('returns 2 when the DB insert throws', async () => {
    const log = vi.fn<(msg: string) => void>()
    const error = vi.fn<(msg: string) => void>()
    const values = vi.fn(async () => {
      throw new Error('connection refused')
    })
    const insert = vi.fn(() => ({ values }))
    const db = { insert }
    const code = await main({
      argv: [
        '--agent',
        'planner',
        '--model',
        'claude-opus-4-7',
        '--prompt-tokens',
        '100',
        '--completion-tokens',
        '50',
      ],
      stdin: makeStdin('', { isTTY: true }),
      database: db as never,
      log,
      error,
    })
    expect(code).toBe(2)
    expect(error.mock.calls[0]?.[0]).toMatch(/db insert failed/)
  })
})
