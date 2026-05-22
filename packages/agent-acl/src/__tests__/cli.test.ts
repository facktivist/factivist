import { describe, expect, it } from 'vitest'

import { type CliIO, runCli } from '../cli.ts'

import { createFixtureRoot, rootAcl } from './_fixtures.ts'

const captureIO = async (
  argv: string[],
  overrides: Partial<CliIO> = {},
): Promise<{ code: number; out: string; err: string }> => {
  const out: string[] = []
  const err: string[] = []
  const code = await runCli({
    argv: ['bun', 'cli.ts', ...argv],
    cwd: '/tmp',
    stdout: { write: (c) => out.push(c) },
    stderr: { write: (c) => err.push(c) },
    ...overrides,
  })
  return { code, out: out.join(''), err: err.join('') }
}

describe('runCli', () => {
  it('list prints every agent and marks the coordinator', async () => {
    const root = await createFixtureRoot([rootAcl()])
    const { code, out } = await captureIO(['list'], { loadRoot: root })
    expect(code).toBe(0)
    expect(out).toContain('coordinator (coordinator)')
    expect(out).toContain('web-agent')
  })

  it('check returns 0 for an allowed access', async () => {
    const root = await createFixtureRoot([rootAcl()])
    const { code, out } = await captureIO(
      ['check', 'web-agent', 'apps/web/src/page.tsx', 'write'],
      { loadRoot: root },
    )
    expect(code).toBe(0)
    expect(out).toMatch(/\[ALLOW\] web-agent write apps\/web\/src\/page\.tsx/)
  })

  it('check returns 1 for a denied access', async () => {
    const root = await createFixtureRoot([rootAcl()])
    const { code, out } = await captureIO(['check', 'web-agent', 'apps/api/handler.ts', 'write'], {
      loadRoot: root,
    })
    expect(code).toBe(1)
    expect(out).toMatch(/\[DENY\]/)
  })

  it('check rejects missing args', async () => {
    const { code, err } = await captureIO(['check'])
    expect(code).toBe(2)
    expect(err).toMatch(/Usage: acl check/)
  })

  it('check rejects unknown actions', async () => {
    const root = await createFixtureRoot([rootAcl()])
    const { code, err } = await captureIO(['check', 'web-agent', 'apps/web/x.ts', 'nuke'], {
      loadRoot: root,
    })
    expect(code).toBe(2)
    expect(err).toMatch(/unknown action "nuke"/)
  })

  it('explain prints scope for an agent', async () => {
    const root = await createFixtureRoot([rootAcl()])
    const { code, out } = await captureIO(['explain', 'web-agent'], { loadRoot: root })
    expect(code).toBe(0)
    expect(out).toMatch(/apps\/web/)
  })

  it('explain rejects missing agent name', async () => {
    const { code, err } = await captureIO(['explain'])
    expect(code).toBe(2)
    expect(err).toMatch(/Usage: acl explain/)
  })

  it('rejects unknown commands', async () => {
    const { code, err } = await captureIO(['unknown'])
    expect(code).toBe(2)
    expect(err).toMatch(/Usage: acl/)
  })
})
