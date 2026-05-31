/**
 * Sentry PII scrubber — shared across `apps/web`, `apps/api`, and
 * `apps/mobile`.
 *
 * Phase 8 §8.6 calls for a `beforeSend` PII scrub on every Sentry
 * client. The four PII classes Factivist must NEVER leak to a
 * third-party error tracker:
 *
 *   1. Aadhaar numbers (12-digit, with or without spaces/hyphens).
 *   2. Email addresses.
 *   3. Phone numbers (Indian 10-digit, with or without +91).
 *   4. File paths under the `complaint-photos/` bucket (these encode
 *      `<slug>/<photoId>` which is correlatable with a citizen's
 *      submission even though the photo itself is stripped).
 *
 * The scrubber is a pure function: pass any object, get a deep-copy
 * with PII replaced by `[redacted]` tokens. Sentry's `beforeSend` hook
 * receives the full event; we walk every string field including
 * breadcrumbs, contexts, and request bodies.
 *
 * NOT covered (intentional):
 *   - Photo bytes themselves — never go anywhere near Sentry; this
 *     scrubber operates on event payloads, not file uploads.
 *   - Citizen nullifiers / Polygon transaction hashes — these are
 *     **public** on-chain; not PII.
 *
 * Test coverage: see `__tests__/sentry-scrub.test.ts`.
 */

const AADHAAR_REGEX = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g
const EMAIL_REGEX = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
// Indian mobile: optional +91 / 91 / 0 prefix, then a 10-digit number
// starting 6-9. We tolerate spaces and hyphens anywhere between digits
// by counting digits with a lookahead instead of structured groups.
// (This catches +91 98765 43210, 9876543210, 0987-654-3210, etc.)
const PHONE_REGEX = /(?:(?:\+91|91|0)[\s-]?)?(?=[6-9](?:[\s-]?\d){9})(?:[6-9](?:[\s-]?\d){9})/g
const PHOTO_PATH_REGEX = /complaint-photos\/[A-Za-z0-9_\-./]+/g

const REDACTED = '[redacted]'

/**
 * Scrub PII from a single string. Returns the input unchanged when no
 * PII is found, so callers can quick-check identity.
 */
export const scrubString = (input: string): string => {
  if (!input) return input
  return input
    .replace(AADHAAR_REGEX, REDACTED)
    .replace(EMAIL_REGEX, REDACTED)
    .replace(PHONE_REGEX, REDACTED)
    .replace(PHOTO_PATH_REGEX, `complaint-photos/${REDACTED}`)
}

/**
 * Recursive deep-scrub. Walks arrays, plain objects, and strings.
 * Returns the input value when it's `null`, `undefined`, or a primitive
 * other than string. Cycles are broken via a `WeakSet`.
 */
export const scrubValue = <T>(input: T, seen: WeakSet<object> = new WeakSet()): T => {
  if (input === null || input === undefined) return input
  if (typeof input === 'string') return scrubString(input) as T
  if (typeof input !== 'object') return input

  if (seen.has(input as object)) return input
  seen.add(input as object)

  if (Array.isArray(input)) {
    return input.map((v) => scrubValue(v, seen)) as unknown as T
  }
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    out[key] = scrubValue(value, seen)
  }
  return out as T
}

/**
 * `beforeSend` hook ready to be wired into Sentry init. Returns
 * `null` to drop the event (e.g. when the event is itself a known-
 * noisy upstream error); otherwise returns the scrubbed event.
 *
 * Note: we use `Record<string, unknown>` rather than `@sentry/types`'
 * `Event` to keep `packages/shared` zero-dep (only Zod allowed).
 */
export type SentryEvent = Record<string, unknown>

export interface SentryHint {
  readonly originalException?: unknown
  readonly syntheticException?: Error | null
}

export const beforeSend = (event: SentryEvent, _hint?: SentryHint): SentryEvent | null => {
  // Drop events that originate from the synthetic exception we throw in
  // tests to avoid recursive reports. They carry the marker
  // `__factivist_test_synthetic__`.
  if (event.tags && typeof event.tags === 'object') {
    const tags = event.tags as Record<string, unknown>
    if (tags.__factivist_test_synthetic__ === true) return null
  }
  return scrubValue(event)
}

/**
 * Sample list of breadcrumb categories that are always dropped (too
 * noisy + might carry photo bytes / cookies). Exported so each app's
 * Sentry init can compose it with its own list.
 */
export const dropBreadcrumbCategories = [
  // Skip `console` so we don't ship internal `console.log` lines that
  // might include scratch debug data.
  'console',
  // Skip XHR/fetch bodies — Sentry's HTTP breadcrumbs include request
  // bodies on some platforms.
  'xhr',
  'fetch',
] as const
