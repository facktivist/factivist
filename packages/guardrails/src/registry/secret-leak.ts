/**
 * `secret-leak` — scan staged file *contents* for plausible API keys, JWTs,
 * and PEM private keys.
 *
 * `.env` file *names* are NOT this guardrail's job — `env-file` handles them
 * with stronger guarantees (no bypass). Splitting concerns lets us accept a
 * `sudo` bypass here (false positives on fixture data happen) without
 * weakening the .env hard rule.
 *
 * Patterns are intentionally narrow to keep the false-positive rate
 * manageable; when in doubt the gate fails and asks for a rewrite, a
 * `.gitignore` entry, or an explicit `sudo` bypass with a written reason.
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { Guardrail, Verdict } from '../types.ts'

const PATTERNS: { name: string; re: RegExp }[] = [
  { name: 'AWS access key', re: /AKIA[0-9A-Z]{16}/ },
  { name: 'GitHub PAT', re: /\bghp_[A-Za-z0-9]{36,}\b/ },
  { name: 'Stripe live key', re: /\bsk_live_[A-Za-z0-9]{20,}\b/ },
  { name: 'OpenAI key', re: /\bsk-[A-Za-z0-9]{32,}\b/ },
  { name: 'Anthropic key', re: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/ },
  { name: 'JWT', re: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/ },
  { name: 'private key block', re: /-----BEGIN (RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
]

export const secretLeak: Guardrail = {
  name: 'secret-leak',
  description: 'Scan staged file contents for plausible API keys, JWTs, and PEM private keys.',
  acceptsBypass: ['sudo'],
  run: async (ctx): Promise<Verdict> => {
    /* v8 ignore next — fallback is exercised in production but tests always inject. */
    const reader = ctx.readFile ?? ((p) => readFile(p, 'utf8'))
    const findings: string[] = []
    for (const rel of ctx.stagedFiles) {
      let body: string
      try {
        body = await reader(join(ctx.cwd, rel))
      } catch {
        continue
      }
      for (const pattern of PATTERNS) {
        if (pattern.re.test(body)) {
          findings.push(`${rel}: ${pattern.name}`)
          break
        }
      }
    }
    if (findings.length === 0) return { ok: true }
    return {
      ok: false,
      reason: `${findings.length} potential secret(s) in staged files`,
      details: findings,
    }
  },
}
