/**
 * `env-file` — dedicated, unbypassable check that no `.env` (or `.env.<flavor>`)
 * file is ever staged for commit. `.env.example` is allowed as a template.
 *
 * This guardrail exists separately from `secret-leak` so that `sudo` and other
 * bypass classes can wave through the noisier API-key scan when there is a
 * legitimate reason (false-positive on a sample, intentional fixture), while
 * .env commits remain a categorical no — they are how secrets actually leak
 * in practice. There is no scenario in which committing a `.env` file is
 * correct; if you need to share env values, use `.env.example` plus a
 * password manager or the project's secret store.
 *
 * The check has zero file I/O — it only inspects file *names* — so it is
 * cheap enough to run on every pre-commit even on large changesets.
 */

import { basename } from 'node:path'

import type { Guardrail, Verdict } from '../types.ts'

const ENV_FILE_RE = /^\.env(\..+)?$/

export const isEnvFileName = (name: string): boolean => {
  if (name === '.env.example') return false
  return ENV_FILE_RE.test(name)
}

export const envFile: Guardrail = {
  name: 'env-file',
  description: 'Block any .env file from being committed (`.env.example` is allowed).',
  acceptsBypass: [],
  run: async (ctx): Promise<Verdict> => {
    const findings: string[] = []
    for (const rel of ctx.stagedFiles) {
      if (isEnvFileName(basename(rel))) findings.push(`${rel}: env file committed`)
    }
    if (findings.length === 0) return { ok: true }
    return {
      ok: false,
      reason: `${findings.length} env file(s) staged for commit`,
      details: [
        ...findings,
        'Move shared variables to .env.example and use your secret manager for real values.',
      ],
    }
  },
}
