import { describe, expect, it } from 'vitest'

import { acceptBypass, isExperimentBranch, parseBypass } from '../bypass.ts'

describe('parseBypass', () => {
  it('returns {} when no bypass env is set', () => {
    expect(parseBypass({})).toEqual({})
  })

  it('rejects unknown class names', () => {
    const out = parseBypass({ BYPASS_GUARDRAILS: 'nope', BYPASS_REASON: 'x' })
    expect(out.error).toMatch(/unknown BYPASS_GUARDRAILS/)
  })

  it('requires a reason for any class', () => {
    const out = parseBypass({ BYPASS_GUARDRAILS: 'local' })
    expect(out.error).toMatch(/BYPASS_REASON is required/)
  })

  it('requires an incident ID for hotfix', () => {
    const out = parseBypass({ BYPASS_GUARDRAILS: 'hotfix', BYPASS_REASON: 'outage' })
    expect(out.error).toMatch(/BYPASS_INCIDENT_ID/)
  })

  it('returns a populated request for valid hotfix bypass', () => {
    const out = parseBypass({
      BYPASS_GUARDRAILS: 'hotfix',
      BYPASS_REASON: 'outage',
      BYPASS_INCIDENT_ID: 'INC-1',
    })
    expect(out.request).toEqual({ class: 'hotfix', reason: 'outage', incidentId: 'INC-1' })
  })

  it('returns a populated request for local bypass', () => {
    const out = parseBypass({ BYPASS_GUARDRAILS: 'local', BYPASS_REASON: 'sandbox' })
    expect(out.request).toEqual({ class: 'local', reason: 'sandbox' })
  })

  it('trims whitespace from inputs', () => {
    const out = parseBypass({
      BYPASS_GUARDRAILS: '  experiment  ',
      BYPASS_REASON: '  testing  ',
    })
    expect(out.request).toEqual({ class: 'experiment', reason: 'testing' })
  })

  it('accepts sudo as a valid class without an incident ID', () => {
    const out = parseBypass({ BYPASS_GUARDRAILS: 'sudo', BYPASS_REASON: 'master override' })
    expect(out.request).toEqual({ class: 'sudo', reason: 'master override' })
  })
})

describe('acceptBypass', () => {
  it('returns an error for unbypassable guardrails', () => {
    const out = acceptBypass({ class: 'hotfix', reason: 'r' }, [])
    expect('error' in out && out.error).toMatch(/does not accept any bypass/)
  })

  it('returns an error when the class is not accepted', () => {
    const out = acceptBypass({ class: 'hotfix', reason: 'r' }, ['local'])
    expect('error' in out && out.error).toMatch(/accepts local, not hotfix/)
  })

  it('accepts a valid request', () => {
    const out = acceptBypass({ class: 'local', reason: 'r' }, ['local'])
    expect('request' in out && out.request.class).toBe('local')
  })
})

describe('isExperimentBranch', () => {
  it('returns true for experiment/* branches', () => {
    expect(isExperimentBranch('experiment/scratch')).toBe(true)
  })

  it('returns false for main and feature branches', () => {
    expect(isExperimentBranch('main')).toBe(false)
    expect(isExperimentBranch('feat/x')).toBe(false)
    expect(isExperimentBranch(undefined)).toBe(false)
  })
})
