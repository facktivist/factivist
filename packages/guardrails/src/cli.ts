/**
 * CLI entry: `bun run guardrails <command>`.
 *
 *   check <name> [--staged-files ...] — run one guardrail (used by hooks)
 *   check-all [--staged-files ...]    — run every guardrail; exit 1 on any fail
 *   list                              — print the registry
 *
 * Staged files default to `git diff --cached --name-only -z`, but tests
 * (and any caller) can override via `--staged-files a.ts b.ts`. The CLI
 * also recognizes `--branch` and `--actor` for explicit context.
 */

import { spawnSync } from 'node:child_process'
import process from 'node:process'

import { cliAuditTransport } from './audit.ts'
import { type CheckResult, check } from './check.ts'
import { ALL, byName } from './registry/index.ts'
import type { AuditTransport, GuardrailContext } from './types.ts'

export interface CliIO {
  argv: string[]
  cwd: string
  env: Record<string, string | undefined>
  stdout: { write: (chunk: string) => void }
  stderr: { write: (chunk: string) => void }
  audit?: AuditTransport
  /** Override for tests; production reads `git diff --cached`. */
  getStagedFiles?: (cwd: string) => string[]
  /** Override for tests; production runs `git rev-parse --abbrev-ref HEAD`. */
  getBranch?: (cwd: string) => string | undefined
}

/**
 * Default git accessors. Split out so tests can call them with a fake `spawn`
 * (or override via `io.getStagedFiles` / `io.getBranch`).
 */
export const _defaultStagedFiles = (
  cwd: string,
  spawnImpl: typeof spawnSync = spawnSync,
): string[] => {
  const r = spawnImpl('git', ['diff', '--cached', '--name-only', '-z'], {
    cwd,
    encoding: 'utf8',
  })
  if (r.status !== 0) return []
  return r.stdout.split('\0').filter(Boolean)
}

export const _defaultBranch = (
  cwd: string,
  spawnImpl: typeof spawnSync = spawnSync,
): string | undefined => {
  const r = spawnImpl('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd,
    encoding: 'utf8',
  })
  if (r.status !== 0) return undefined
  const out = r.stdout.trim()
  return out.length === 0 ? undefined : out
}

/* v8 ignore next 2 — thin wrappers around the tested `_default*` functions. */
const defaultStagedFiles = (cwd: string): string[] => _defaultStagedFiles(cwd)
const defaultBranch = (cwd: string): string | undefined => _defaultBranch(cwd)

interface ParsedArgs {
  flagFiles?: string[]
  branch?: string
  actor?: string
}

const parseFlags = (rest: string[]): ParsedArgs => {
  const args: ParsedArgs = {}
  for (let i = 0; i < rest.length; i++) {
    const token = rest[i]
    if (token === '--staged-files') {
      const files: string[] = []
      i++
      while (i < rest.length && !rest[i]?.startsWith('--')) {
        files.push(rest[i] as string)
        i++
      }
      i--
      args.flagFiles = files
    } else if (token === '--branch' && i + 1 < rest.length) {
      args.branch = rest[++i]
    } else if (token === '--actor' && i + 1 < rest.length) {
      args.actor = rest[++i]
    }
  }
  return args
}

const formatResult = (result: CheckResult): string => {
  if (result.outcome === 'pass') return `[PASS] ${result.guardrail}\n`
  if (result.outcome === 'bypassed') {
    const reason = result.bypass?.reason ?? '(no reason)'
    return `[BYPASS] ${result.guardrail}: ${reason} (class=${result.bypass?.class})\n`
  }
  const lines = [`[FAIL] ${result.guardrail}: ${result.reason ?? 'failed'}`]
  for (const d of result.details ?? []) lines.push(`  - ${d}`)
  return `${lines.join('\n')}\n`
}

const buildContext = (io: CliIO, args: ParsedArgs): GuardrailContext => ({
  cwd: io.cwd,
  stagedFiles: args.flagFiles ?? (io.getStagedFiles ?? defaultStagedFiles)(io.cwd),
  branch: args.branch ?? (io.getBranch ?? defaultBranch)(io.cwd),
  env: io.env,
})

export const runCli = async (io: CliIO): Promise<number> => {
  const audit = io.audit ?? cliAuditTransport()
  const [, , cmd, ...rest] = io.argv
  if (cmd === 'list') {
    for (const g of ALL) io.stdout.write(`${g.name}\t${g.description}\n`)
    return 0
  }
  if (cmd === 'check') {
    const name = rest[0]
    if (!name) {
      io.stderr.write('Usage: guardrails check <name> [--staged-files ...]\n')
      return 2
    }
    const guardrail = byName(name)
    if (!guardrail) {
      io.stderr.write(`unknown guardrail "${name}" (try \`guardrails list\`)\n`)
      return 2
    }
    const args = parseFlags(rest.slice(1))
    const result = await check(guardrail, buildContext(io, args), {
      audit,
      actor: args.actor,
    })
    io.stdout.write(formatResult(result))
    return result.outcome === 'fail' ? 1 : 0
  }
  if (cmd === 'check-all') {
    const args = parseFlags(rest)
    const ctx = buildContext(io, args)
    let exitCode = 0
    for (const guardrail of ALL) {
      const result = await check(guardrail, ctx, { audit, actor: args.actor })
      io.stdout.write(formatResult(result))
      if (result.outcome === 'fail') exitCode = 1
    }
    return exitCode
  }
  io.stderr.write('Usage: guardrails (list | check <name> | check-all) [flags]\n')
  return 2
}

/* v8 ignore start */
const main = async (): Promise<void> => {
  const code = await runCli({
    argv: process.argv,
    cwd: process.cwd(),
    env: process.env,
    stdout: process.stdout,
    stderr: process.stderr,
  })
  if (code !== 0) process.exit(code)
}

if (import.meta.main) {
  main().catch((err) => {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`)
    process.exit(1)
  })
}
/* v8 ignore stop */
