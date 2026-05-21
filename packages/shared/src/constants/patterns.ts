/**
 * Reusable regex patterns. Shared between client-side hints and
 * Zod validators in `../validators/`.
 */

/**
 * RFC 4122 v4 UUID pattern (8-4-4-4-12, lowercase or uppercase hex).
 * The third group must start with `4`; the fourth with one of `8|9|a|b`.
 */
export const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Pragmatic email regex.
 *
 * RFC 5322 strict matching is intentionally avoided. Use Zod's `.email()`
 * for full validation; this pattern is best-suited for client-side hints
 * and quick guards.
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * URL-safe slug: lowercase alphanumerics separated by single hyphens.
 * Must not start or end with a hyphen.
 */
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
