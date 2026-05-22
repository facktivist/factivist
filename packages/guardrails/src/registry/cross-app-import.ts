/**
 * `cross-app-import` — enforce the project's dependency graph rule:
 * `apps/*` may not import from another `apps/*`, and `packages/*` may not
 * import from `apps/*`. This is the architectural rule already stated in
 * the root CLAUDE.md; the guardrail makes it executable.
 *
 * Accepts `experiment` bypass only: a research branch may temporarily wire
 * apps together to prototype a flow, but the branch can never merge to main
 * (enforced separately by branch-protection rules).
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { Guardrail, Verdict } from '../types.ts'

const IMPORT_RE = /(?:^|\s)(?:import|export)\s+(?:type\s+)?[\w*{}\s,]*\s*from\s+['"]([^'"]+)['"]/gm

const APPS_PREFIX = 'apps/'
const PACKAGES_PREFIX = 'packages/'

export const fileNamespace = (rel: string): 'app' | 'package' | 'other' => {
  if (rel.startsWith(APPS_PREFIX)) return 'app'
  if (rel.startsWith(PACKAGES_PREFIX)) return 'package'
  return 'other'
}

export const appOf = (rel: string): string | undefined => {
  if (!rel.startsWith(APPS_PREFIX)) return undefined
  const parts = rel.slice(APPS_PREFIX.length).split('/')
  return parts[0]
}

export const importLooksLikeApp = (spec: string): boolean =>
  spec.startsWith('@factivist/') && /^@factivist\/(api|web|mobile)(\/|$)/.test(spec)

export const importedAppName = (spec: string): string | undefined => {
  const match = spec.match(/^@factivist\/(api|web|mobile)(?:\/|$)/)
  return match?.[1]
}

export const crossAppImport: Guardrail = {
  name: 'cross-app-import',
  description: 'Reject imports from one apps/* into another, or from packages/* into apps/*.',
  acceptsBypass: ['experiment', 'sudo'],
  run: async (ctx): Promise<Verdict> => {
    /* v8 ignore next — fallback is exercised in production but tests always inject. */
    const reader = ctx.readFile ?? ((p) => readFile(p, 'utf8'))
    const findings: string[] = []
    for (const rel of ctx.stagedFiles) {
      if (!rel.endsWith('.ts') && !rel.endsWith('.tsx')) continue
      const ns = fileNamespace(rel)
      if (ns === 'other') continue
      let body: string
      try {
        body = await reader(join(ctx.cwd, rel))
      } catch {
        continue
      }
      for (const m of body.matchAll(IMPORT_RE)) {
        const spec = m[1]
        if (!spec || !importLooksLikeApp(spec)) continue
        const targetApp = importedAppName(spec)
        if (!targetApp) continue
        if (ns === 'package') {
          findings.push(`${rel}: packages/* may not import from @factivist/${targetApp}`)
          continue
        }
        const sourceApp = appOf(rel)
        if (sourceApp && sourceApp !== targetApp) {
          findings.push(`${rel}: apps/${sourceApp} may not import from @factivist/${targetApp}`)
        }
      }
    }
    if (findings.length === 0) return { ok: true }
    return {
      ok: false,
      reason: `${findings.length} cross-app import(s) detected`,
      details: findings,
    }
  },
}
