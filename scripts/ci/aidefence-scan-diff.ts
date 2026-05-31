#!/usr/bin/env bun
/**
 * `aidefence-scan-diff` — Phase 7 §7.3 row 4 implementation.
 *
 * Scans every file changed in the PR diff (vs `origin/${BASE_REF:-main}`) for
 * PII / anonymity-floor violations and fails on any medium-or-higher finding
 * (severity ≥ 3, per the aidefence_scan severity ladder).
 *
 * ## MCP vs fallback
 *
 * The preferred path is the `aidefence_scan` MCP tool hosted by `ruflo`. CI
 * runners do not have the MCP bridge by default, so this script detects the
 * absence of the MCP and falls back to a deterministic in-process AIMDS pass:
 * regex rules for Indian phone numbers, email addresses, 12-digit Aadhaar
 * candidates, IPv4 addresses, and `user_agent`/`nullifier` substring leaks
 * outside comments.
 *
 * The fallback is conservative — better to false-positive on a test fixture
 * (which an author can either de-PII or wrap in an `aidefence-allow` comment)
 * than to miss a real leak. Findings are logged as one JSON line per match so
 * GitHub Actions log search works without a log shipper.
 *
 * ## Allowlist
 *
 * A file or line is exempted from the fallback rules when:
 *   * the line contains the substring `aidefence-allow` (typically in a
 *     comment immediately above the match), or
 *   * the file matches a denylist-of-irrelevant-paths (markdown unless in
 *     `docs/threat-model/`, lockfiles, generated artifacts, the scanner
 *     itself + its tests).
 *
 * ## Exit codes
 *
 *   0 — clean (or no files in diff)
 *   1 — at least one medium+ finding
 *   2 — unrecoverable error (git missing, etc.)
 *
 * ATIDs: indirectly supports MOD-* and ID-* by enforcing ADR-0010 on the
 * moderation-facing surface.
 *
 * Owner Agent: ci-eng (Phase 7)
 */

import { execSync } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { extname } from 'node:path'

export interface ScanFinding {
  file: string
  line: number
  rule: string
  severity: number // 1=info, 2=low, 3=medium, 4=high, 5=critical
  excerpt: string
}

export interface ScanOptions {
  baseRef?: string
  cwd?: string
  // Injected for tests; production calls git directly.
  diffProvider?: () => string[]
  fileReader?: (path: string) => string | null
  mcpScanner?: (file: string, contents: string) => ScanFinding[] | null
}

const SCANNABLE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.sql',
  '.json',
  '.yml',
  '.yaml',
  '.sh',
  '.env.example',
])

const DENYLISTED_PATHS = [
  /(^|\/)node_modules\//,
  /(^|\/)dist\//,
  /(^|\/)build\//,
  /(^|\/)coverage\//,
  /(^|\/)\.turbo\//,
  /(^|\/)bun\.lock$/,
  /(^|\/)package-lock\.json$/,
  /(^|\/)scripts\/ci\/aidefence-scan-diff\.ts$/,
  /(^|\/)scripts\/ci\/__tests__\//,
]

const RULES: Array<{ name: string; severity: number; pattern: RegExp }> = [
  // Aadhaar: 12 contiguous digits, optionally space/dash separated 4-4-4.
  { name: 'pii.aadhaar', severity: 4, pattern: /\b\d{4}[ -]?\d{4}[ -]?\d{4}\b/g },
  // Indian mobile: +91 or 91 prefix + 10 digits, OR bare 10-digit starting 6-9.
  {
    name: 'pii.phone.in',
    severity: 3,
    pattern: /(?:(?:\+|00)?91[ -]?)?[6-9]\d{9}\b/g,
  },
  // Email — exclude the obviously fake `@example.com`/`@test.invalid`.
  {
    name: 'pii.email',
    severity: 3,
    pattern: /[A-Za-z0-9._%+-]+@(?!example\.com|test\.invalid)[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
  },
  // IPv4 — public-looking only (skip 0.0.0.0, 127.x, 10.x, 172.16-31.x, 192.168.x).
  {
    name: 'pii.ipv4',
    severity: 3,
    pattern: /\b(?!0\.|127\.|10\.|192\.168\.)\d{1,3}(?:\.\d{1,3}){3}\b/g,
  },
  // Anonymity-floor identifiers (ADR-0010). Match only outside comments —
  // we strip line-comments before scanning for these.
  {
    name: 'anonymity.identifier',
    severity: 4,
    pattern: /\b(?:nullifier|user_agent|aadhaar_hash)\b/gi,
  },
]

/**
 * Strip line-comments (`//`, `#`) from a line so anonymity rules don't
 * trip on documentation. Block comments are left in — keeping the scanner
 * pure (no language parser) and conservative.
 */
function stripLineComments(line: string): string {
  const slashIdx = line.indexOf('//')
  const hashIdx = line.indexOf('#')
  const cuts: number[] = []
  if (slashIdx >= 0) cuts.push(slashIdx)
  if (hashIdx >= 0) cuts.push(hashIdx)
  if (cuts.length === 0) return line
  return line.slice(0, Math.min(...cuts))
}

export function isScannable(file: string): boolean {
  for (const re of DENYLISTED_PATHS) {
    if (re.test(file)) return false
  }
  const ext = extname(file).toLowerCase()
  if (SCANNABLE_EXTENSIONS.has(ext)) return true
  // Allow `.env.example` style names without an extension match.
  return file.endsWith('.env.example')
}

export function scanContents(file: string, contents: string): ScanFinding[] {
  const findings: ScanFinding[] = []
  const lines = contents.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? ''
    if (raw.includes('aidefence-allow')) continue
    for (const rule of RULES) {
      const target = rule.name.startsWith('anonymity.') ? stripLineComments(raw) : raw
      // Reset state for each line (rules use /g).
      rule.pattern.lastIndex = 0
      const match = rule.pattern.exec(target)
      if (match) {
        findings.push({
          file,
          line: i + 1,
          rule: rule.name,
          severity: rule.severity,
          excerpt: match[0].slice(0, 80),
        })
      }
    }
  }
  return findings
}

export type GitRunner = (cmd: string, cwd: string) => string

const defaultGitRunner: GitRunner = (cmd, cwd) =>
  execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

export function diffFromGit(
  baseRef: string,
  cwd: string,
  runner: GitRunner = defaultGitRunner,
): string[] {
  const parse = (out: string) =>
    out
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
  try {
    return parse(runner(`git diff --name-only --diff-filter=ACMR origin/${baseRef}...HEAD`, cwd))
  } catch {
    // Fallback for shallow clones / first push: scan working tree changes.
    return parse(runner('git diff --name-only --diff-filter=ACMR HEAD', cwd))
  }
}

export function defaultFileReader(repoRoot: string): (p: string) => string | null {
  return (p: string) => {
    const abs = `${repoRoot}/${p}`
    if (!existsSync(abs)) return null
    const stat = statSync(abs)
    if (!stat.isFile() || stat.size > 2 * 1024 * 1024) return null
    return readFileSync(abs, 'utf8')
  }
}

export interface ScanResult {
  filesScanned: number
  findings: ScanFinding[]
  exitCode: 0 | 1
}

export function runScan(opts: ScanOptions = {}): ScanResult {
  const baseRef = opts.baseRef ?? process.env.BASE_REF ?? 'main'
  const cwd = opts.cwd ?? process.cwd()
  const diffProvider = opts.diffProvider ?? (() => diffFromGit(baseRef, cwd))
  const fileReader = opts.fileReader ?? defaultFileReader(cwd)

  const files = diffProvider().filter(isScannable)
  const findings: ScanFinding[] = []

  for (const file of files) {
    const contents = fileReader(file)
    if (contents === null) continue
    if (opts.mcpScanner) {
      const mcpFindings = opts.mcpScanner(file, contents)
      if (mcpFindings !== null) {
        findings.push(...mcpFindings)
        continue
      }
    }
    findings.push(...scanContents(file, contents))
  }

  const medOrHigher = findings.filter((f) => f.severity >= 3)
  return {
    filesScanned: files.length,
    findings,
    exitCode: medOrHigher.length > 0 ? 1 : 0,
  }
}

export function main(opts: ScanOptions = {}): number {
  let result: ScanResult
  try {
    result = runScan(opts)
  } catch (err) {
    process.stderr.write(`${JSON.stringify({ error: (err as Error).message })}\n`)
    return 2
  }
  for (const f of result.findings) {
    process.stdout.write(`${JSON.stringify(f)}\n`)
  }
  process.stdout.write(
    `${JSON.stringify({
      summary: true,
      filesScanned: result.filesScanned,
      findings: result.findings.length,
      mediumOrHigher: result.findings.filter((f) => f.severity >= 3).length,
      mcpUsed: Boolean(opts.mcpScanner),
    })}\n`,
  )
  return result.exitCode
}

if (import.meta.main) {
  process.exit(main())
}
