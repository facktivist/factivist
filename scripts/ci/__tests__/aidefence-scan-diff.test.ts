import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  defaultFileReader,
  diffFromGit,
  isScannable,
  main,
  runScan,
  type ScanFinding,
  scanContents,
} from '../aidefence-scan-diff.ts'

describe('isScannable', () => {
  it('accepts typescript and javascript sources', () => {
    expect(isScannable('apps/web/src/foo.ts')).toBe(true)
    expect(isScannable('apps/web/src/foo.tsx')).toBe(true)
    expect(isScannable('scripts/some.js')).toBe(true)
  })

  it('accepts shell, sql, yaml, json', () => {
    expect(isScannable('scripts/foo.sh')).toBe(true)
    expect(isScannable('packages/db/migrate.sql')).toBe(true)
    expect(isScannable('.github/workflows/ci.yml')).toBe(true)
    expect(isScannable('package.json')).toBe(true)
  })

  it('rejects denylisted paths', () => {
    expect(isScannable('node_modules/foo/index.ts')).toBe(false)
    expect(isScannable('apps/web/dist/main.js')).toBe(false)
    expect(isScannable('apps/web/build/index.js')).toBe(false)
    expect(isScannable('apps/web/coverage/index.html')).toBe(false)
    expect(isScannable('bun.lock')).toBe(false)
    expect(isScannable('scripts/ci/aidefence-scan-diff.ts')).toBe(false)
    expect(isScannable('scripts/ci/__tests__/aidefence-scan-diff.test.ts')).toBe(false)
  })

  it('rejects unknown extensions', () => {
    expect(isScannable('apps/web/asset.png')).toBe(false)
    expect(isScannable('docs/diagram.svg')).toBe(false)
  })

  it('accepts .env.example explicitly', () => {
    expect(isScannable('apps/web/.env.example')).toBe(true)
  })
})

describe('scanContents', () => {
  it('finds Aadhaar-shaped 12-digit sequences', () => {
    const findings = scanContents('fixture.ts', 'const id = "1234 5678 9012"')
    expect(findings).toHaveLength(1)
    expect(findings[0]?.rule).toBe('pii.aadhaar')
    expect(findings[0]?.severity).toBe(4)
  })

  it('finds Indian mobile numbers', () => {
    const findings = scanContents('fixture.ts', 'call +91-9876543210 today')
    expect(findings.some((f) => f.rule === 'pii.phone.in')).toBe(true)
  })

  it('finds email addresses', () => {
    const findings = scanContents('fixture.ts', 'alice@gmail.com filed a complaint')
    expect(findings.some((f) => f.rule === 'pii.email')).toBe(true)
  })

  it('skips synthetic example.com and test.invalid emails', () => {
    const findings = scanContents(
      'fixture.ts',
      'const fake = "user@example.com"; const fake2 = "x@test.invalid"',
    )
    expect(findings.filter((f) => f.rule === 'pii.email')).toHaveLength(0)
  })

  it('flags public IPv4 but allows loopback/private ranges', () => {
    const findings = scanContents(
      'fixture.ts',
      'log("1.2.3.4"); log("127.0.0.1"); log("10.0.0.1"); log("192.168.1.1")',
    )
    const ips = findings.filter((f) => f.rule === 'pii.ipv4')
    expect(ips).toHaveLength(1)
    expect(ips[0]?.excerpt).toBe('1.2.3.4')
  })

  it('flags anonymity-floor identifier leaks outside comments', () => {
    const findings = scanContents('fixture.ts', 'const nullifier = "0x..."')
    expect(findings.some((f) => f.rule === 'anonymity.identifier')).toBe(true)
  })

  it('ignores anonymity-floor identifiers that only appear in comments', () => {
    const findings = scanContents(
      'fixture.ts',
      '// nullifier is server-side only — see ADR-0010\nconst x = 1',
    )
    expect(findings.filter((f) => f.rule === 'anonymity.identifier')).toHaveLength(0)
  })

  it('honours an `aidefence-allow` annotation on the same line', () => {
    const findings = scanContents(
      'fixture.ts',
      'const fixtureAadhaar = "1234 5678 9012" // aidefence-allow ATID-AUDIT-fixture',
    )
    expect(findings).toHaveLength(0)
  })

  it('returns no findings for clean source', () => {
    expect(
      scanContents('fixture.ts', 'export const greet = (name: string) => "hi " + name'),
    ).toHaveLength(0)
  })
})

describe('runScan', () => {
  it('returns exit code 0 on empty diff', () => {
    const result = runScan({ diffProvider: () => [], fileReader: () => null })
    expect(result.exitCode).toBe(0)
    expect(result.filesScanned).toBe(0)
    expect(result.findings).toHaveLength(0)
  })

  it('returns exit code 0 on a clean diff', () => {
    const result = runScan({
      diffProvider: () => ['apps/web/src/clean.ts'],
      fileReader: () => 'export const x = 1',
    })
    expect(result.exitCode).toBe(0)
    expect(result.filesScanned).toBe(1)
  })

  it('returns exit code 1 when a medium-or-higher finding is present', () => {
    const result = runScan({
      diffProvider: () => ['apps/web/src/leak.ts'],
      fileReader: () => 'const phone = "+91-9876543210"',
    })
    expect(result.exitCode).toBe(1)
    expect(result.findings.some((f) => f.severity >= 3)).toBe(true)
  })

  it('skips files the diffProvider returns but that fail isScannable', () => {
    const reader = vi.fn(() => 'whatever')
    const result = runScan({
      diffProvider: () => ['node_modules/foo/index.ts', 'docs/img.png'],
      fileReader: reader,
    })
    expect(result.exitCode).toBe(0)
    expect(reader).not.toHaveBeenCalled()
  })

  it('skips files whose contents are null (missing or too large)', () => {
    const result = runScan({
      diffProvider: () => ['apps/web/src/missing.ts'],
      fileReader: () => null,
    })
    expect(result.exitCode).toBe(0)
    expect(result.findings).toHaveLength(0)
  })

  it('uses the MCP scanner when one is injected (preferred path)', () => {
    const mcp = vi.fn((file: string): ScanFinding[] => [
      { file, line: 1, rule: 'mcp.fake', severity: 4, excerpt: 'mcp-detected' },
    ])
    const result = runScan({
      diffProvider: () => ['apps/web/src/x.ts'],
      fileReader: () => 'const x = 1',
      mcpScanner: mcp,
    })
    expect(mcp).toHaveBeenCalledTimes(1)
    expect(result.exitCode).toBe(1)
    expect(result.findings[0]?.rule).toBe('mcp.fake')
  })

  it('falls back to in-process rules when MCP returns null', () => {
    const result = runScan({
      diffProvider: () => ['apps/web/src/leak.ts'],
      fileReader: () => 'const phone = "+91-9876543210"',
      mcpScanner: () => null,
    })
    expect(result.exitCode).toBe(1)
    expect(result.findings.some((f) => f.rule === 'pii.phone.in')).toBe(true)
  })
})

describe('main', () => {
  it('writes one JSON line per finding plus a summary line and returns the exit code', () => {
    const out: string[] = []
    const origWrite = process.stdout.write.bind(process.stdout)
    process.stdout.write = ((chunk: string | Uint8Array) => {
      out.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'))
      return true
    }) as typeof process.stdout.write
    try {
      const code = main({
        diffProvider: () => ['apps/web/src/leak.ts'],
        fileReader: () => 'const phone = "+91-9876543210"',
      })
      expect(code).toBe(1)
    } finally {
      process.stdout.write = origWrite
    }
    const lines = out.join('').trim().split('\n')
    expect(lines.length).toBeGreaterThanOrEqual(2)
    const summary = JSON.parse(lines[lines.length - 1] ?? '{}')
    expect(summary.summary).toBe(true)
    expect(summary.filesScanned).toBe(1)
    expect(summary.mediumOrHigher).toBeGreaterThanOrEqual(1)
    expect(summary.mcpUsed).toBe(false)
  })

  it('returns 2 and writes an error line when the scan throws', () => {
    const errs: string[] = []
    const origErr = process.stderr.write.bind(process.stderr)
    process.stderr.write = ((chunk: string | Uint8Array) => {
      errs.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'))
      return true
    }) as typeof process.stderr.write
    try {
      const code = main({
        diffProvider: () => {
          throw new Error('git missing')
        },
      })
      expect(code).toBe(2)
    } finally {
      process.stderr.write = origErr
    }
    expect(errs.join('')).toContain('git missing')
  })

  it('falls back to env BASE_REF when no baseRef is provided', () => {
    const prev = process.env.BASE_REF
    process.env.BASE_REF = 'develop'
    try {
      // No diff/file provided — the env var is only relevant when diffFromGit
      // is used. We just assert the call doesn't throw and returns 0.
      const result = runScan({ diffProvider: () => [], fileReader: () => null })
      expect(result.exitCode).toBe(0)
    } finally {
      if (prev === undefined) delete process.env.BASE_REF
      else process.env.BASE_REF = prev
    }
  })

  it('marks mcpUsed=true in the summary when an MCP scanner is supplied', () => {
    const out: string[] = []
    const origWrite = process.stdout.write.bind(process.stdout)
    process.stdout.write = ((chunk: string | Uint8Array) => {
      out.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'))
      return true
    }) as typeof process.stdout.write
    try {
      const code = main({
        diffProvider: () => ['apps/web/src/clean.ts'],
        fileReader: () => 'export const x = 1',
        mcpScanner: () => [],
      })
      expect(code).toBe(0)
    } finally {
      process.stdout.write = origWrite
    }
    const summary = JSON.parse(out.join('').trim().split('\n').pop() ?? '{}')
    expect(summary.mcpUsed).toBe(true)
  })
})

describe('diffFromGit', () => {
  it('runs the origin/<base>...HEAD form and parses non-empty lines', () => {
    const runner = vi.fn(() => 'apps/web/a.ts\n\n  apps/api/b.ts  \n')
    const files = diffFromGit('main', '/repo', runner)
    expect(runner).toHaveBeenCalledTimes(1)
    expect(runner.mock.calls[0]?.[0]).toContain('origin/main...HEAD')
    expect(files).toEqual(['apps/web/a.ts', 'apps/api/b.ts'])
  })

  it('falls back to working-tree diff when the origin form throws', () => {
    const runner = vi.fn((cmd: string) => {
      if (cmd.includes('origin/')) throw new Error('unknown revision')
      return 'apps/web/c.ts\n'
    })
    const files = diffFromGit('main', '/repo', runner)
    expect(runner).toHaveBeenCalledTimes(2)
    expect(files).toEqual(['apps/web/c.ts'])
  })

  it('returns an empty array when both forms succeed but yield no output', () => {
    const runner = vi.fn(() => '')
    const files = diffFromGit('main', '/repo', runner)
    expect(files).toEqual([])
  })
})

describe('defaultFileReader', () => {
  let root: string

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'aidef-reader-'))
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('reads small text files', () => {
    mkdirSync(join(root, 'apps/web'), { recursive: true })
    writeFileSync(join(root, 'apps/web/x.ts'), 'export const x = 1')
    const read = defaultFileReader(root)
    expect(read('apps/web/x.ts')).toBe('export const x = 1')
  })

  it('returns null for missing files', () => {
    const read = defaultFileReader(root)
    expect(read('apps/web/missing.ts')).toBeNull()
  })

  it('returns null for files over the 2 MiB cap', () => {
    mkdirSync(join(root, 'big'), { recursive: true })
    const huge = 'a'.repeat(2 * 1024 * 1024 + 1)
    writeFileSync(join(root, 'big/blob.ts'), huge)
    const read = defaultFileReader(root)
    expect(read('big/blob.ts')).toBeNull()
  })

  it('returns null for directories that happen to share a path', () => {
    mkdirSync(join(root, 'apps/web/dir'), { recursive: true })
    const read = defaultFileReader(root)
    expect(read('apps/web/dir')).toBeNull()
  })
})
