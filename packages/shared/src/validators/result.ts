import { z } from 'zod'

/**
 * Wrap any pair of schemas in a discriminated `Result<T, E>` envelope.
 *
 * Use for API responses where success/failure should be discriminated
 * without throwing.
 *
 * @example
 *   const userResultSchema = resultSchema(userSchema, z.string())
 *   userResultSchema.parse({ ok: true, data: user })
 */
export const resultSchema = <T extends z.ZodTypeAny, E extends z.ZodTypeAny>(data: T, error: E) =>
  z.discriminatedUnion('ok', [
    z.object({ ok: z.literal(true), data }),
    z.object({ ok: z.literal(false), error }),
  ])
