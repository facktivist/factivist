import { describe, expect, it } from 'vitest'

import { loadAcl } from '../loader.ts'

import { createFixtureRoot, rootAcl } from './_fixtures.ts'

describe('loadAcl', () => {
  it('loads the root ACL', async () => {
    const root = await createFixtureRoot([rootAcl()])
    const index = await loadAcl(root)
    expect(index.layers).toHaveLength(1)
    expect(index.coordinator).toBe('coordinator')
    expect(Object.keys(index.layers[0]?.file.agents ?? {}).sort()).toEqual([
      'coordinator',
      'reader',
      'web-agent',
    ])
  })

  it('overlays packages/* and apps/* layers in load order', async () => {
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
    expect(index.layers.length).toBe(3)
    const sources = index.layers.map((l) => l.base)
    // packages/* is discovered before apps/* (deterministic alpha order
    // within each parent directory) — root always first.
    expect(sources).toEqual(['.', 'packages/db', 'apps/web'])
  })

  it('throws when root ACL is missing', async () => {
    const root = await createFixtureRoot([])
    await expect(loadAcl(root)).rejects.toThrow(/missing root/)
  })

  it('throws on unsupported schema version', async () => {
    const root = await createFixtureRoot([
      {
        path: '.agent-acl.yaml',
        content: `version: 99\ncoordinator: c\nagents: {}`,
      },
    ])
    await expect(loadAcl(root)).rejects.toThrow(/unsupported version 99/)
  })

  it('throws when the agents map is missing', async () => {
    const root = await createFixtureRoot([
      {
        path: '.agent-acl.yaml',
        content: `version: 1\ncoordinator: c`,
      },
    ])
    await expect(loadAcl(root)).rejects.toThrow(/missing the required `agents`/)
  })

  it('throws when the root ACL is empty', async () => {
    const root = await createFixtureRoot([{ path: '.agent-acl.yaml', content: '' }])
    await expect(loadAcl(root)).rejects.toThrow(/is empty/)
  })

  it('ignores overlays whose source file is missing', async () => {
    const root = await createFixtureRoot([rootAcl()])
    const index = await loadAcl(root)
    expect(index.layers).toHaveLength(1)
  })

  it('returns layers even when packages/ and apps/ are absent', async () => {
    const root = await createFixtureRoot([rootAcl()])
    const index = await loadAcl(root)
    expect(index.coordinator).toBe('coordinator')
  })

  it('uses the deepest coordinator declaration when overlays override', async () => {
    const root = await createFixtureRoot([
      rootAcl(),
      {
        path: 'packages/db/.agent-acl.yaml',
        content: `version: 1\ncoordinator: override-coord\nagents:\n  override-coord:\n    read: "*"\n`,
      },
    ])
    const index = await loadAcl(root)
    expect(index.coordinator).toBe('override-coord')
  })
})
