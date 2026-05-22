import { describe, expect, it } from 'vitest'

import { memoryAuditTransport } from '../audit.ts'
import { check } from '../check.ts'
import type { Guardrail, Verdict } from '../types.ts'

import { buildCtx } from './_fixtures.ts'

const failing = (
  acceptsBypass: Guardrail['acceptsBypass'] = ['local'],
  verdict: Extract<Verdict, { ok: false }> = { ok: false, reason: 'no good', details: ['d1'] },
): Guardrail => ({
  name: 'failing',
  description: 'always fails',
  acceptsBypass,
  run: async () => verdict,
})

const passing: Guardrail = {
  name: 'passing',
  description: 'always passes',
  acceptsBypass: [],
  run: async () => ({ ok: true }),
}

describe('check', () => {
  it('records a pass when the guardrail returns ok', async () => {
    const audit = memoryAuditTransport()
    const result = await check(passing, buildCtx(), { audit })
    expect(result.outcome).toBe('pass')
    expect(audit.entries[0]?.outcome).toBe('pass')
  })

  it('records a fail with reason and details when there is no bypass', async () => {
    const audit = memoryAuditTransport()
    const result = await check(failing(), buildCtx(), { audit })
    expect(result.outcome).toBe('fail')
    expect(result.reason).toBe('no good')
    expect(result.details).toEqual(['d1'])
    expect(audit.entries[0]?.outcome).toBe('fail')
  })

  it('records a fail when bypass parsing errors', async () => {
    const audit = memoryAuditTransport()
    const ctx = buildCtx({ env: { BYPASS_GUARDRAILS: 'unknown', BYPASS_REASON: 'r' } })
    const result = await check(failing(), ctx, { audit })
    expect(result.outcome).toBe('fail')
    expect(result.details?.some((d) => d.startsWith('bypass rejected'))).toBe(true)
  })

  it('records a fail when the guardrail rejects the bypass class', async () => {
    const audit = memoryAuditTransport()
    const ctx = buildCtx({
      env: { BYPASS_GUARDRAILS: 'hotfix', BYPASS_REASON: 'r', BYPASS_INCIDENT_ID: 'INC-1' },
    })
    const result = await check(failing(['local']), ctx, { audit })
    expect(result.outcome).toBe('fail')
    expect(result.details?.some((d) => /accepts local/.test(d))).toBe(true)
  })

  it('records a fail when experiment bypass is requested off-branch', async () => {
    const audit = memoryAuditTransport()
    const ctx = buildCtx({
      branch: 'feat/x',
      env: { BYPASS_GUARDRAILS: 'experiment', BYPASS_REASON: 'r' },
    })
    const result = await check(failing(['experiment']), ctx, { audit })
    expect(result.outcome).toBe('fail')
    expect(result.details?.some((d) => /experiment\/\*/.test(d))).toBe(true)
  })

  it('accepts experiment bypass on an experiment/* branch', async () => {
    const audit = memoryAuditTransport()
    const ctx = buildCtx({
      branch: 'experiment/scratch',
      env: { BYPASS_GUARDRAILS: 'experiment', BYPASS_REASON: 'trying it' },
    })
    const result = await check(failing(['experiment']), ctx, { audit })
    expect(result.outcome).toBe('bypassed')
    expect(audit.entries[0]?.outcome).toBe('bypassed')
    expect(audit.entries[0]?.bypass?.class).toBe('experiment')
  })

  it('accepts local bypass on any branch', async () => {
    const audit = memoryAuditTransport()
    const ctx = buildCtx({ env: { BYPASS_GUARDRAILS: 'local', BYPASS_REASON: 'sandbox' } })
    const result = await check(failing(['local']), ctx, { audit })
    expect(result.outcome).toBe('bypassed')
  })

  it('forwards actor and branch into the audit entry', async () => {
    const audit = memoryAuditTransport()
    await check(passing, buildCtx({ branch: 'feat/x' }), { audit, actor: 'web-agent' })
    expect(audit.entries[0]?.actor).toBe('web-agent')
    expect(audit.entries[0]?.branch).toBe('feat/x')
  })
})
