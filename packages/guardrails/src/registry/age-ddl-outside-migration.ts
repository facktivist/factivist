/**
 * `age-ddl-outside-migration` — Apache AGE DDL (graph create, vertex/edge
 * labels) must live inside `packages/db/drizzle/age/*.sql`. Catching DDL
 * sprinkled across application code prevents the domain knowledge graph
 * from drifting away from a single migration-managed source of truth.
 *
 * Accepts no bypass — AGE schema changes are deliberate, reviewed, and
 * one-way. There is no production scenario where an ad-hoc DDL command in
 * application code is acceptable.
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { Guardrail, Verdict } from '../types.ts'

const ALLOWED_PREFIX = 'packages/db/drizzle/age/'

const DDL_PATTERNS = [
  /\bcreate_graph\s*\(/i,
  /\bcreate_vlabel\s*\(/i,
  /\bcreate_elabel\s*\(/i,
  /\bag_catalog\.create_/i,
  /\bLOAD\s+'age'/i,
]

export const looksLikeCodePath = (rel: string): boolean =>
  rel.endsWith('.ts') || rel.endsWith('.tsx') || rel.endsWith('.sql')

export const ageDdlOutsideMigration: Guardrail = {
  name: 'age-ddl-outside-migration',
  description:
    'AGE DDL (create_graph, create_vlabel, create_elabel) may only appear in packages/db/drizzle/age/*.sql.',
  acceptsBypass: [],
  run: async (ctx): Promise<Verdict> => {
    /* v8 ignore next — fallback is exercised in production but tests always inject. */
    const reader = ctx.readFile ?? ((p) => readFile(p, 'utf8'))
    const findings: string[] = []
    for (const rel of ctx.stagedFiles) {
      if (!looksLikeCodePath(rel)) continue
      if (rel.startsWith(ALLOWED_PREFIX)) continue
      let body: string
      try {
        body = await reader(join(ctx.cwd, rel))
      } catch {
        continue
      }
      for (const re of DDL_PATTERNS) {
        if (re.test(body)) {
          findings.push(`${rel}: AGE DDL outside migration directory`)
          break
        }
      }
    }
    if (findings.length === 0) return { ok: true }
    return {
      ok: false,
      reason: `${findings.length} file(s) contain AGE DDL outside the migration directory`,
      details: findings,
    }
  },
}
