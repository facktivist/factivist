/**
 * Application-wide constants.
 *
 * ZERO runtime dependencies. All values are immutable (`as const`).
 */

/** Public-facing application name. */
export const APP_NAME = 'factivist' as const

/** Default number of items per paginated page. */
export const DEFAULT_PAGE_SIZE = 20 as const

/** Maximum number of items per paginated page. */
export const MAX_PAGE_SIZE = 100 as const

/** Minimum number of items per paginated page. */
export const MIN_PAGE_SIZE = 1 as const

/** Supported runtime environments. */
export const ENVIRONMENTS = ['development', 'staging', 'production', 'test'] as const
export type Environment = (typeof ENVIRONMENTS)[number]

/** HTTP status codes commonly returned by the Factivist API. */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const

export type HttpStatus = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS]

/**
 * Type guard: is the value a known HTTP status code?
 *
 * Useful for narrowing arbitrary numbers (e.g. from `fetch().status`) to
 * the discriminated set defined in {@link HTTP_STATUS}.
 */
export const isHttpStatus = (value: unknown): value is HttpStatus => {
  if (typeof value !== 'number') return false
  for (const code of Object.values(HTTP_STATUS)) {
    if (code === value) return true
  }
  return false
}
