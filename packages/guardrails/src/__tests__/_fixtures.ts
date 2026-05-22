/**
 * Shared test helpers: in-memory file readers and a context builder that
 * lets each test focus on the policy under test instead of plumbing.
 */

import type { GuardrailContext } from '../types.ts'

const DEFAULT_CWD = '/tmp/fake-root'

export const buildCtx = (overrides: Partial<GuardrailContext> = {}): GuardrailContext => ({
  cwd: DEFAULT_CWD,
  stagedFiles: [],
  env: {},
  branch: 'main',
  ...overrides,
})

/**
 * Build a reader that resolves `<cwd>/<rel>` lookups against a flat
 * `{ rel → content }` map. Tests can key by the same relative path they
 * pass in `stagedFiles`, which keeps assertions readable.
 */
export const inMemoryReader =
  (files: Record<string, string>, cwd: string = DEFAULT_CWD) =>
  async (path: string): Promise<string> => {
    const prefix = `${cwd}/`
    const rel = path.startsWith(prefix) ? path.slice(prefix.length) : path
    if (rel in files) return files[rel] as string
    throw new Error(`no fixture for ${rel}`)
  }
