/**
 * Tiny picomatch-style glob matcher — just enough for our ACL needs.
 *
 * Supported syntax:
 *   - `*`         — any chars except `/`
 *   - `**`        — any chars including `/`
 *   - `?`         — single char except `/`
 *   - exact literals
 *
 * Anything fancier (brace groups, character classes, negation in-pattern)
 * is intentionally out — keep the surface small so the policy is easy to
 * audit. Denial is expressed via a separate `deny` list at the rule level.
 */

const escapeRegex = (s: string): string => s.replace(/[.+^${}()|[\]\\]/g, '\\$&')

export const compileGlob = (pattern: string): RegExp => {
  let body = ''
  let i = 0
  while (i < pattern.length) {
    const ch = pattern[i] as string
    if (ch === '*') {
      if (pattern[i + 1] === '*') {
        body += '.*'
        i += 2
        // Swallow a trailing `/` after `**` so `apps/**/foo` matches `apps/foo`.
        if (pattern[i] === '/') i++
      } else {
        body += '[^/]*'
        i += 1
      }
    } else if (ch === '?') {
      body += '[^/]'
      i += 1
    } else {
      body += escapeRegex(ch)
      i += 1
    }
  }
  return new RegExp(`^${body}$`)
}

export const globMatches = (pattern: string, candidate: string): boolean => {
  if (pattern === '*') return true
  return compileGlob(pattern).test(candidate)
}

/**
 * Match a path against a list of patterns. Returns the first match (kept as
 * the "rule that allowed/denied this access" in audit output).
 */
export const firstMatch = (patterns: readonly string[], candidate: string): string | undefined => {
  for (const p of patterns) {
    if (globMatches(p, candidate)) return p
  }
  return undefined
}
