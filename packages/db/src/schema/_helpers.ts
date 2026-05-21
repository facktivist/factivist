/**
 * Schema-level helpers shared across tables.
 *
 * Factivist uses prefixed text PKs (Stripe-style) rather than native UUID
 * columns: the prefix encodes the entity type and makes IDs greppable in
 * logs and URLs. Always store as `text` so the prefix is durable.
 */

/**
 * Build an ID generator bound to a specific entity prefix.
 *
 * @example
 *   const newUserId = createId('usr');
 *   // → "usr_3f2a...-..." (prefix + RFC 4122 UUID)
 *
 * @throws {Error} if `prefix` is empty, contains an underscore, or contains
 *   non `[a-z0-9]` characters. Prefixes must be short, lowercase, and stable.
 */
export const createId = (prefix: string): (() => string) => {
  if (!prefix) {
    throw new Error('createId: prefix must be a non-empty string')
  }
  if (!/^[a-z0-9]+$/.test(prefix)) {
    throw new Error(`createId: prefix must contain only lowercase alphanumerics, got "${prefix}"`)
  }
  return () => `${prefix}_${crypto.randomUUID()}`
}
