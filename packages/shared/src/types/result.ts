/**
 * Discriminated `Result<T, E>` union.
 *
 * Prefer returning `Result` from fallible functions over `throw`
 * for predictable, type-checked error paths.
 */
export type Result<T, E = Error> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: E }

/** Construct a successful `Result`. */
export const ok = <T>(data: T): Result<T, never> => ({ ok: true, data })

/** Construct a failed `Result`. */
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error })

/** Type guard: narrow a `Result` to its success variant. */
export const isOk = <T, E>(
  result: Result<T, E>,
): result is { readonly ok: true; readonly data: T } => result.ok

/** Type guard: narrow a `Result` to its failure variant. */
export const isErr = <T, E>(
  result: Result<T, E>,
): result is { readonly ok: false; readonly error: E } => !result.ok

/**
 * Unwrap a successful result or throw the embedded error.
 *
 * Use sparingly — most call sites should prefer `isOk` / `isErr` branching.
 */
export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (result.ok) return result.data
  throw result.error instanceof Error ? result.error : new Error(String(result.error))
}
