/**
 * CLI: `bun run acl <command>`.
 *
 *   check <agent> <path> <read|write|exec>  — fail-closed permission check
 *   list                                     — every declared agent
 *   explain <agent>                          — show effective scope per layer
 */

import { resolve } from 'node:path'
import process from 'node:process'

import { checkAcl, explain, listAgents } from './check.ts'
import { loadAcl } from './loader.ts'
import type { AclAction } from './types.ts'

export interface CliIO {
  argv: string[]
  cwd: string
  stdout: { write: (chunk: string) => void }
  stderr: { write: (chunk: string) => void }
  loadRoot?: string
}

const isAction = (value: string): value is AclAction =>
  value === 'read' || value === 'write' || value === 'exec'

export const runCli = async (io: CliIO): Promise<number> => {
  const [, , cmd, ...rest] = io.argv
  const root = io.loadRoot ?? io.cwd
  if (cmd === 'list') {
    const index = await loadAcl(resolve(root))
    for (const name of listAgents(index)) {
      io.stdout.write(`${name}${name === index.coordinator ? ' (coordinator)' : ''}\n`)
    }
    return 0
  }
  if (cmd === 'explain') {
    const agent = rest[0]
    if (!agent) {
      io.stderr.write('Usage: acl explain <agent>\n')
      return 2
    }
    const index = await loadAcl(resolve(root))
    for (const line of explain(index, agent)) io.stdout.write(`${line}\n`)
    return 0
  }
  if (cmd === 'check') {
    const [agent, path, action] = rest
    if (!agent || !path || !action) {
      io.stderr.write('Usage: acl check <agent> <path> <read|write|exec>\n')
      return 2
    }
    if (!isAction(action)) {
      io.stderr.write(`unknown action "${action}" (expected read | write | exec)\n`)
      return 2
    }
    const index = await loadAcl(resolve(root))
    const verdict = checkAcl(index, agent, { path, action })
    if (verdict.ok) {
      io.stdout.write(
        `[ALLOW] ${agent} ${action} ${path} — rule "${verdict.matched.rule}" (${verdict.matched.layer})\n`,
      )
      return 0
    }
    io.stdout.write(`[DENY] ${agent} ${action} ${path} — ${verdict.reason}\n`)
    return 1
  }
  io.stderr.write('Usage: acl (list | check <agent> <path> <action> | explain <agent>)\n')
  return 2
}

/* v8 ignore start */
const main = async (): Promise<void> => {
  const code = await runCli({
    argv: process.argv,
    cwd: process.cwd(),
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
