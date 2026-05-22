import { describe, expect, it } from 'vitest'

import { checkAcl, explain, listAgents } from '../check.ts'
import { loadAcl } from '../loader.ts'

import { createFixtureRoot, rootAcl } from './_fixtures.ts'

describe('checkAcl', () => {
  it('coordinator passes everything by default', async () => {
    const root = await createFixtureRoot([rootAcl()])
    const index = await loadAcl(root)
    const verdict = checkAcl(index, 'coordinator', { path: 'anywhere/here.ts', action: 'write' })
    expect(verdict.ok).toBe(true)
  })

  it('coordinator deny rules still apply', async () => {
    const root = await createFixtureRoot([rootAcl()])
    const index = await loadAcl(root)
    const verdict = checkAcl(index, 'coordinator', { path: '.env', action: 'write' })
    expect(verdict.ok).toBe(false)
    expect(verdict.ok === false && verdict.reason).toMatch(/\.env/)
  })

  it('worker agents pass when path matches an allow rule', async () => {
    const root = await createFixtureRoot([rootAcl()])
    const index = await loadAcl(root)
    const verdict = checkAcl(index, 'web-agent', { path: 'apps/web/src/page.tsx', action: 'write' })
    expect(verdict.ok).toBe(true)
    expect(verdict.ok && verdict.matched.rule).toBe('apps/web/**')
  })

  it('worker agents fail when nothing matches', async () => {
    const root = await createFixtureRoot([rootAcl()])
    const index = await loadAcl(root)
    const verdict = checkAcl(index, 'web-agent', {
      path: 'apps/api/src/handler.ts',
      action: 'write',
    })
    expect(verdict.ok).toBe(false)
    expect(verdict.ok === false && verdict.reason).toMatch(/not permitted to write/)
  })

  it('worker agents fail when the action has no scope at all', async () => {
    const root = await createFixtureRoot([rootAcl()])
    const index = await loadAcl(root)
    const verdict = checkAcl(index, 'reader', { path: 'apps/web/x.ts', action: 'write' })
    expect(verdict.ok).toBe(false)
    expect(verdict.ok === false && verdict.reason).toMatch(/no write scope/)
  })

  it('"*" wildcard scope passes any path', async () => {
    const root = await createFixtureRoot([rootAcl()])
    const index = await loadAcl(root)
    const verdict = checkAcl(index, 'reader', { path: 'anywhere/at/all.ts', action: 'read' })
    expect(verdict.ok).toBe(true)
    expect(verdict.ok && verdict.matched.rule).toBe('*')
  })

  it('overlays add to allow scope additively', async () => {
    const root = await createFixtureRoot([
      rootAcl(),
      {
        path: 'apps/web/.agent-acl.yaml',
        content: `version: 1
agents:
  web-agent:
    read: ["apps/web/.next/**"]
`,
      },
    ])
    const index = await loadAcl(root)
    const verdict = checkAcl(index, 'web-agent', {
      path: 'apps/web/.next/cache.bin',
      action: 'read',
    })
    expect(verdict.ok).toBe(true)
  })

  it('deny rules from overlays take precedence over allow rules', async () => {
    const root = await createFixtureRoot([
      rootAcl(),
      {
        path: 'apps/mobile/.agent-acl.yaml',
        content: `version: 1
agents:
  web-agent:
    deny: ["apps/web/ios/**"]
`,
      },
    ])
    const index = await loadAcl(root)
    const verdict = checkAcl(index, 'web-agent', {
      path: 'apps/web/ios/build.txt',
      action: 'write',
    })
    expect(verdict.ok).toBe(false)
    expect(verdict.ok === false && verdict.reason).toMatch(
      /denied .* by rule "apps\/web\/ios\/\*\*"/,
    )
  })

  it('rejects unknown agents', async () => {
    const root = await createFixtureRoot([rootAcl()])
    const index = await loadAcl(root)
    const verdict = checkAcl(index, 'ghost-agent', { path: 'x.ts', action: 'read' })
    expect(verdict.ok).toBe(false)
    expect(verdict.ok === false && verdict.reason).toMatch(/not declared/)
  })

  it('attributes a match to the layer the rule came from', async () => {
    // The overlay grants access to a path the root scope does NOT cover.
    // This proves the overlay's rule is the one that allowed the access,
    // and the layer attribution reflects that.
    const root = await createFixtureRoot([
      rootAcl(),
      {
        path: 'apps/web/.agent-acl.yaml',
        content: `version: 1
agents:
  web-agent:
    read: ["docs/overlay-only.md"]
`,
      },
    ])
    const index = await loadAcl(root)
    const verdict = checkAcl(index, 'web-agent', {
      path: 'docs/overlay-only.md',
      action: 'read',
    })
    expect(verdict.ok).toBe(true)
    expect(verdict.ok && verdict.matched.layer).toContain('apps/web/.agent-acl.yaml')
  })

  it('exec action consults the exec scope', async () => {
    const root = await createFixtureRoot([rootAcl()])
    const index = await loadAcl(root)
    expect(checkAcl(index, 'web-agent', { path: 'apps/web/dev.sh', action: 'exec' }).ok).toBe(true)
    expect(checkAcl(index, 'web-agent', { path: 'apps/api/dev.sh', action: 'exec' }).ok).toBe(false)
  })
})

describe('listAgents', () => {
  it('returns every declared agent, sorted', async () => {
    const root = await createFixtureRoot([rootAcl()])
    const index = await loadAcl(root)
    expect(listAgents(index)).toEqual(['coordinator', 'reader', 'web-agent'])
  })

  it('includes agents that appear only in overlays', async () => {
    const root = await createFixtureRoot([
      rootAcl(),
      {
        path: 'packages/db/.agent-acl.yaml',
        content: `version: 1
agents:
  db-agent:
    read: ["packages/db/**"]
`,
      },
    ])
    const index = await loadAcl(root)
    expect(listAgents(index)).toContain('db-agent')
  })
})

describe('explain', () => {
  it('shows the per-layer scope for an agent', async () => {
    const root = await createFixtureRoot([rootAcl()])
    const index = await loadAcl(root)
    const lines = explain(index, 'web-agent')
    expect(lines.join('\n')).toMatch(/read:\s+apps\/web\/\*\*/)
    expect(lines.join('\n')).toMatch(/write:\s+apps\/web\/\*\*/)
  })

  it('returns a single line for unknown agents', async () => {
    const root = await createFixtureRoot([rootAcl()])
    const index = await loadAcl(root)
    const lines = explain(index, 'ghost')
    expect(lines).toEqual(['agent "ghost" is not declared'])
  })

  it('handles agents with only wildcard scopes', async () => {
    const root = await createFixtureRoot([rootAcl()])
    const index = await loadAcl(root)
    const lines = explain(index, 'reader')
    expect(lines.join('\n')).toMatch(/read:\s+\*/)
  })
})
