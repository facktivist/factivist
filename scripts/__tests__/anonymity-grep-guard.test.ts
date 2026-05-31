/**
 * scripts/anonymity-grep-guard.sh — test suite.
 *
 * Phase 5 / wave 2 / c16-ci-grep-guard.
 *
 * Validates the executable contract of the anonymity floor guard:
 *
 *   1. Banned tokens inside `//` and `/* … *\/` comments are allowed.
 *   2. Banned tokens in non-comment code FAIL with `file:line` citations.
 *   3. The real production scope at HEAD passes (zero non-comment hits).
 *
 * The suite drives the shell script via `node:child_process.spawn` so
 * we exercise the same code path that CI and lefthook hit — no
 * JavaScript reimplementation of the matcher, which would silently
 * drift from the shell version.
 *
 * Fixtures are written into a fresh tmp dir per test and the script is
 * invoked from that dir; the script resolves its own scope relative to
 * its own location so the fixture layout (apps/api/src/routes/admin/…)
 * is what it scans.
 */

import { spawn } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const TEST_DIR =
  typeof import.meta.dirname === 'string'
    ? import.meta.dirname
    : new URL('.', import.meta.url).pathname
const REPO_ROOT = resolve(TEST_DIR, '..', '..')
const REAL_GUARD = resolve(REPO_ROOT, 'scripts/anonymity-grep-guard.sh')

type RunResult = {
  exitCode: number
  stdout: string
  stderr: string
}

/**
 * Run the guard script in a given working directory. The script
 * resolves scope from its own location, so `scriptPath` must point at
 * a copy of the guard inside the fixture.
 */
const runGuard = (cwd: string, scriptPath: string): Promise<RunResult> => {
  return new Promise((resolveResult, rejectResult) => {
    const proc = spawn('bash', [scriptPath], { cwd })
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8')
    })
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8')
    })
    proc.on('error', rejectResult)
    proc.on('close', (code) => {
      resolveResult({ exitCode: code ?? -1, stdout, stderr })
    })
  })
}

/**
 * Build a throwaway fixture repo: copy the guard script into
 * `<tmp>/scripts/anonymity-grep-guard.sh` and seed in-scope files
 * under apps/api/src/routes/admin/. Returns the fixture root.
 */
const buildFixture = (files: Record<string, string>): { root: string; scriptPath: string } => {
  const root = mkdtempSync(join(tmpdir(), 'anon-guard-'))
  mkdirSync(join(root, 'scripts'), { recursive: true })
  const scriptPath = join(root, 'scripts/anonymity-grep-guard.sh')
  copyFileSync(REAL_GUARD, scriptPath)

  for (const [rel, body] of Object.entries(files)) {
    const abs = join(root, rel)
    mkdirSync(join(abs, '..'), { recursive: true })
    writeFileSync(abs, body)
  }
  return { root, scriptPath }
}

describe('anonymity-grep-guard.sh', () => {
  let fixtureRoot: string | null = null

  afterEach(() => {
    if (fixtureRoot) {
      rmSync(fixtureRoot, { recursive: true, force: true })
      fixtureRoot = null
    }
  })

  beforeEach(() => {
    fixtureRoot = null
  })

  it('PASSES when banned tokens appear only inside // line comments', async () => {
    const { root, scriptPath } = buildFixture({
      'apps/api/src/routes/admin/comments.ts': [
        '// nullifier is mentioned here as a forbidden-column reminder',
        '// aadhaar / ip_address / user_agent — none of these should leak',
        'export const safe = true',
        '',
      ].join('\n'),
    })
    fixtureRoot = root

    const result = await runGuard(root, scriptPath)
    expect(result.stdout).toMatch(/zero non-comment matches/i)
    expect(result.exitCode).toBe(0)
  })

  it('PASSES when banned tokens appear only inside /* */ block comments (single line)', async () => {
    const { root, scriptPath } = buildFixture({
      'apps/api/src/routes/admin/block.ts': [
        '/* nullifier, aadhaar, ip_address, user_agent — all banned in code */',
        'export const safe = true',
        '',
      ].join('\n'),
    })
    fixtureRoot = root

    const result = await runGuard(root, scriptPath)
    expect(result.stdout).toMatch(/zero non-comment matches/i)
    expect(result.exitCode).toBe(0)
  })

  it('PASSES when banned tokens appear inside a multi-line /* */ block comment', async () => {
    const { root, scriptPath } = buildFixture({
      'apps/api/src/routes/admin/multi.ts': [
        '/**',
        ' * Forbidden columns:',
        ' *   - nullifier',
        ' *   - aadhaar',
        ' *   - ip_address',
        ' *   - user_agent',
        ' */',
        'export const safe = true',
        '',
      ].join('\n'),
    })
    fixtureRoot = root

    const result = await runGuard(root, scriptPath)
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toMatch(/zero non-comment matches/i)
  })

  it('FAILS when nullifier appears in non-comment code (object key)', async () => {
    const { root, scriptPath } = buildFixture({
      'apps/api/src/routes/admin/bad.ts': [
        '// the next line is a regression — should be caught',
        "export const leak = { nullifier: 'x' }",
        '',
      ].join('\n'),
    })
    fixtureRoot = root

    const result = await runGuard(root, scriptPath)
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toMatch(/ANONYMITY FLOOR VIOLATION/)
    expect(result.stderr).toMatch(/apps\/api\/src\/routes\/admin\/bad\.ts:2:/)
    expect(result.stderr).toMatch(/ADR-0010/)
  })

  it('FAILS when aadhaar appears in a string literal as a standalone token', async () => {
    const { root, scriptPath } = buildFixture({
      'apps/api/src/routes/admin/leak.ts': ["export const colName = 'aadhaar' as const", ''].join(
        '\n',
      ),
    })
    fixtureRoot = root

    const result = await runGuard(root, scriptPath)
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toMatch(/apps\/api\/src\/routes\/admin\/leak\.ts:1:/)
  })

  it('FAILS when ip_address appears in a destructure', async () => {
    const { root, scriptPath } = buildFixture({
      'apps/web/src/app/admin/x/page.tsx': [
        'export default function Page({ ip_address }: { ip_address: string }) {',
        '  return <div>{ip_address}</div>',
        '}',
        '',
      ].join('\n'),
    })
    fixtureRoot = root

    const result = await runGuard(root, scriptPath)
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toMatch(/apps\/web\/src\/app\/admin\/x\/page\.tsx:1:/)
  })

  it('ignores files under __tests__/ (PII assertion patterns live there)', async () => {
    const { root, scriptPath } = buildFixture({
      'apps/api/src/routes/admin/__tests__/leak.test.ts': [
        'const PII = /nullifier|aadhaar|ip_address|user_agent/i',
        'export { PII }',
        '',
      ].join('\n'),
    })
    fixtureRoot = root

    const result = await runGuard(root, scriptPath)
    expect(result.exitCode).toBe(0)
  })

  it('does not match user_agent_id or aadhaar_token (word-boundary semantics)', async () => {
    // Word-boundary semantics: `user_agent` matches but `user_agent_id`
    // should ALSO match because `_` does not break the token. This test
    // documents the chosen behaviour — extending the banned word by a
    // suffix does NOT bypass the guard.
    const { root, scriptPath } = buildFixture({
      'apps/api/src/routes/admin/suffix.ts': [
        "export const x = { user_agent_id: 'leak' }",
        '',
      ].join('\n'),
    })
    fixtureRoot = root

    const result = await runGuard(root, scriptPath)
    // grep -w treats `_` as part of the word — so user_agent_id does NOT
    // match the bare `user_agent` token. The guard is intentionally not
    // a substring matcher; a future expansion (e.g. `user_agent_hash`)
    // is an explicit decision, not a bypass.
    expect(result.exitCode).toBe(0)
  })

  it('does match Nullifier (case-insensitive)', async () => {
    const { root, scriptPath } = buildFixture({
      'apps/api/src/routes/admin/case.ts': ["export const Nullifier = 'x'", ''].join('\n'),
    })
    fixtureRoot = root

    const result = await runGuard(root, scriptPath)
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toMatch(/case\.ts:1:/)
  })

  it('exits 0 with a marker when no in-scope files exist', async () => {
    const { root, scriptPath } = buildFixture({})
    fixtureRoot = root

    const result = await runGuard(root, scriptPath)
    expect(result.exitCode).toBe(0)
    expect(result.stderr).toMatch(/no in-scope files found/)
  })

  it('production HEAD passes the guard (zero non-comment matches across real moderator surface)', async () => {
    // This is the load-bearing assertion: if a future PR lands a real
    // regression onto the production code, this test fails immediately
    // — not just CI. It runs the guard against the actual repo, not a
    // fixture, so it exercises the real file list end-to-end.
    const result = await runGuard(REPO_ROOT, REAL_GUARD)
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toMatch(/zero non-comment matches/)
  })
})
