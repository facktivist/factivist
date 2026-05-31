/**
 * Web-side role constants. Kept in sync with `apps/api/src/lib/rbac.ts`
 * `ROLES`. A drift test in `__tests__/roles.test.ts` (added by the test
 * wave) will assert structural equality once cross-package imports
 * settle. Until then this is the single source of truth on the web side.
 */

export const ADMIN_ROLES = ['admin', 'moderator'] as const
export type Role = (typeof ADMIN_ROLES)[number]

export const isAdminRole = (value: string): value is Role =>
  (ADMIN_ROLES as readonly string[]).includes(value)
