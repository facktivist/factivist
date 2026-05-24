import { getTableConfig } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'

import { devMetricsSchema, llmCalls } from '../dev_metrics.ts'

describe('dev_metrics.llm_calls table', () => {
  const config = getTableConfig(llmCalls)
  const byKey = new Map(config.columns.map((c) => [c.name, c]))

  it('lives in the `dev_metrics` Postgres schema (not public)', () => {
    expect(config.schema).toBe('dev_metrics')
    expect(devMetricsSchema.schemaName).toBe('dev_metrics')
  })

  it('uses the plural snake_case table name', () => {
    expect(config.name).toBe('llm_calls')
  })

  it('exposes every documented column', () => {
    const names = config.columns.map((c) => c.name).sort()
    expect(names).toEqual(
      [
        'id',
        'agent',
        'model',
        'promptTokens',
        'completionTokens',
        'cacheReadTokens',
        'costUsd',
        'batched',
        'taskId',
        'ts',
      ].sort(),
    )
    for (const col of config.columns) {
      // biome-ignore lint/suspicious/noExplicitAny: keyAsName is internal
      expect((col as any).keyAsName).toBe(true)
    }
  })

  it('declares `id` as a UUID primary key with defaultRandom (server-generated)', () => {
    const id = byKey.get('id')
    expect(id?.primary).toBe(true)
    expect(id?.getSQLType()).toBe('uuid')
    // defaultRandom() emits `gen_random_uuid()` at the SQL layer — no JS defaultFn.
    expect(id?.hasDefault).toBe(true)
  })

  it('marks all required columns NOT NULL', () => {
    for (const key of [
      'agent',
      'model',
      'promptTokens',
      'completionTokens',
      'cacheReadTokens',
      'costUsd',
      'batched',
      'ts',
    ] as const) {
      expect(byKey.get(key)?.notNull).toBe(true)
    }
  })

  it('defaults `batched` to false (Anthropic Batch API discount flag)', () => {
    const col = byKey.get('batched')
    expect(col?.getSQLType()).toBe('boolean')
    expect(col?.hasDefault).toBe(true)
    // biome-ignore lint/suspicious/noExplicitAny: default value is internal
    expect((col as any).default).toBe(false)
  })

  it('allows nulls only on `taskId`', () => {
    expect(byKey.get('taskId')?.notNull).toBe(false)
  })

  it('defaults `cacheReadTokens` to 0', () => {
    const col = byKey.get('cacheReadTokens')
    expect(col?.hasDefault).toBe(true)
    // biome-ignore lint/suspicious/noExplicitAny: default value is internal
    expect((col as any).default).toBe(0)
  })

  it('uses numeric(10,6) for `costUsd`', () => {
    const col = byKey.get('costUsd')
    expect(col?.getSQLType()).toBe('numeric(10, 6)')
  })

  it('uses timestamp with time zone + defaultNow for `ts`', () => {
    const col = byKey.get('ts')
    expect(col?.dataType).toBe('date')
    expect(col?.getSQLType()).toMatch(/timestamp with time zone/i)
    expect(col?.hasDefault).toBe(true)
  })

  it('declares the agent+ts and taskId indices', () => {
    const names = config.indexes.map((idx) => idx.config.name).sort()
    expect(names).toEqual(['llm_calls_by_agent', 'llm_calls_by_task_id'])

    const byAgent = config.indexes.find((idx) => idx.config.name === 'llm_calls_by_agent')
    // biome-ignore lint/suspicious/noExplicitAny: drizzle index column union is internal
    const agentCols = byAgent?.config.columns.map((col: any) => col.name)
    expect(agentCols).toEqual(['agent', 'ts'])

    const byTaskId = config.indexes.find((idx) => idx.config.name === 'llm_calls_by_task_id')
    // biome-ignore lint/suspicious/noExplicitAny: drizzle index column union is internal
    const taskCols = byTaskId?.config.columns.map((col: any) => col.name)
    expect(taskCols).toEqual(['taskId'])
  })

  it('all indices are non-unique (this is a time-series append-log)', () => {
    for (const idx of config.indexes) {
      expect(idx.config.unique).toBeFalsy()
    }
  })
})
