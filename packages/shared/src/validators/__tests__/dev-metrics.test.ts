import { describe, expect, it } from 'vitest'

import { llmCallInsertSchema, llmCallSnakeInsertSchema } from '../dev-metrics.ts'

describe('llmCallInsertSchema (camelCase)', () => {
  const valid = {
    agent: 'planner',
    model: 'claude-opus-4-7',
    promptTokens: 1000,
    completionTokens: 200,
    costUsd: 0.03,
  }

  it('parses a minimal valid row with default cacheReadTokens = 0 and batched = false', () => {
    const parsed = llmCallInsertSchema.parse(valid)
    expect(parsed.cacheReadTokens).toBe(0)
    expect(parsed.batched).toBe(false)
    expect(parsed.agent).toBe('planner')
  })

  it('accepts batched = true (Anthropic Batch API discount flag)', () => {
    const parsed = llmCallInsertSchema.parse({ ...valid, batched: true })
    expect(parsed.batched).toBe(true)
  })

  it('accepts a Date or ISO string for ts', () => {
    const withDate = llmCallInsertSchema.parse({ ...valid, ts: new Date() })
    expect(withDate.ts).toBeInstanceOf(Date)
    const withIso = llmCallInsertSchema.parse({ ...valid, ts: '2026-05-22T10:00:00.000Z' })
    expect(typeof withIso.ts).toBe('string')
  })

  it('rejects empty agent', () => {
    const res = llmCallInsertSchema.safeParse({ ...valid, agent: '' })
    expect(res.success).toBe(false)
  })

  it('rejects an agent string > 64 chars', () => {
    const res = llmCallInsertSchema.safeParse({ ...valid, agent: 'a'.repeat(65) })
    expect(res.success).toBe(false)
  })

  it('rejects a model string > 128 chars', () => {
    const res = llmCallInsertSchema.safeParse({ ...valid, model: 'm'.repeat(129) })
    expect(res.success).toBe(false)
  })

  it('rejects negative token counts', () => {
    const res = llmCallInsertSchema.safeParse({ ...valid, promptTokens: -1 })
    expect(res.success).toBe(false)
  })

  it('rejects non-integer token counts', () => {
    const res = llmCallInsertSchema.safeParse({ ...valid, completionTokens: 1.5 })
    expect(res.success).toBe(false)
  })

  it('rejects negative costUsd', () => {
    const res = llmCallInsertSchema.safeParse({ ...valid, costUsd: -0.01 })
    expect(res.success).toBe(false)
  })

  it('rejects costUsd outside numeric(10,6) range', () => {
    const res = llmCallInsertSchema.safeParse({ ...valid, costUsd: 10_000 })
    expect(res.success).toBe(false)
  })

  it('rejects non-finite costUsd', () => {
    const res = llmCallInsertSchema.safeParse({ ...valid, costUsd: Number.POSITIVE_INFINITY })
    expect(res.success).toBe(false)
  })

  it('accepts an optional taskId', () => {
    const parsed = llmCallInsertSchema.parse({ ...valid, taskId: 'ruflo-task-42' })
    expect(parsed.taskId).toBe('ruflo-task-42')
  })

  it('rejects an empty taskId when provided', () => {
    const res = llmCallInsertSchema.safeParse({ ...valid, taskId: '' })
    expect(res.success).toBe(false)
  })
})

describe('llmCallSnakeInsertSchema (snake_case → camelCase transform)', () => {
  const snake = {
    agent: 'metrics-coder',
    model: 'claude-sonnet-4-6',
    prompt_tokens: 500,
    completion_tokens: 100,
    cost_usd: 0.002,
  }

  it('transforms snake_case keys to camelCase', () => {
    const parsed = llmCallSnakeInsertSchema.parse(snake)
    expect(parsed.promptTokens).toBe(500)
    expect(parsed.completionTokens).toBe(100)
    expect(parsed.costUsd).toBe(0.002)
    expect(parsed.cacheReadTokens).toBe(0)
    expect(parsed.batched).toBe(false)
  })

  it('propagates the batched flag through the transform', () => {
    const parsed = llmCallSnakeInsertSchema.parse({ ...snake, batched: true })
    expect(parsed.batched).toBe(true)
  })

  it('honours snake_case cache_read_tokens + task_id', () => {
    const parsed = llmCallSnakeInsertSchema.parse({
      ...snake,
      cache_read_tokens: 250,
      task_id: 't1',
    })
    expect(parsed.cacheReadTokens).toBe(250)
    expect(parsed.taskId).toBe('t1')
  })

  it('also accepts camelCase keys (for mixed payloads)', () => {
    const parsed = llmCallSnakeInsertSchema.parse({
      agent: 'metrics-coder',
      model: 'claude-sonnet-4-6',
      promptTokens: 500,
      completionTokens: 100,
      costUsd: 0.002,
    })
    expect(parsed.promptTokens).toBe(500)
  })

  it('prefers camelCase when both forms are present', () => {
    const parsed = llmCallSnakeInsertSchema.parse({
      ...snake,
      prompt_tokens: 1,
      promptTokens: 999,
    })
    expect(parsed.promptTokens).toBe(999)
  })

  it('errors when promptTokens is missing entirely', () => {
    const { prompt_tokens, ...rest } = snake
    void prompt_tokens
    const res = llmCallSnakeInsertSchema.safeParse(rest)
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path.includes('promptTokens'))).toBe(true)
    }
  })

  it('errors when completionTokens is missing entirely', () => {
    const { completion_tokens, ...rest } = snake
    void completion_tokens
    const res = llmCallSnakeInsertSchema.safeParse(rest)
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path.includes('completionTokens'))).toBe(true)
    }
  })

  it('errors when costUsd is missing entirely', () => {
    const { cost_usd, ...rest } = snake
    void cost_usd
    const res = llmCallSnakeInsertSchema.safeParse(rest)
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path.includes('costUsd'))).toBe(true)
    }
  })

  it('forwards an ISO ts unchanged', () => {
    const parsed = llmCallSnakeInsertSchema.parse({
      ...snake,
      ts: '2026-05-22T10:00:00.000Z',
    })
    expect(parsed.ts).toBe('2026-05-22T10:00:00.000Z')
  })
})
