/**
 * Generic utility types used across Factivist packages.
 *
 * These are pure type-level constructs; the runtime helpers live in
 * sibling files (e.g. `result.ts`).
 */

/**
 * Generic nominal/branded-type helper.
 *
 * Stamp a primitive with a phantom brand to prevent accidental mixing
 * at the type level. Pair with Zod's `.brand<T>()` for runtime guards.
 *
 * @example
 *   type UserId = Branded<string, 'UserId'>
 */
export type Branded<T, B extends string> = T & { readonly __brand: B }

/** Recursively mark all properties of `T` as `readonly`. */
export type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T

/** Make selected keys of `T` optional. */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/** Make selected keys of `T` required. */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>

/** Paginated list envelope used by API list responses. */
export interface Paginated<T> {
  readonly items: ReadonlyArray<T>
  readonly total: number
  readonly page: number
  readonly limit: number
  readonly hasMore: boolean
}

/**
 * Compute whether a paginated response has more items beyond the current page.
 *
 * Exposed as a runtime helper so callers don't reinvent the off-by-one.
 */
export const hasMorePages = (page: number, limit: number, total: number): boolean => {
  if (page < 1 || limit < 1 || total < 0) return false
  return page * limit < total
}
