import { z } from 'zod'

import { DEFAULT_PAGE_SIZE, ENVIRONMENTS, MAX_PAGE_SIZE, MIN_PAGE_SIZE } from '../constants/app.ts'

/**
 * Pagination query params. All fields optional with sensible defaults.
 *
 * - `page`   — 1-indexed page number (default: 1)
 * - `limit`  — items per page, clamped to [MIN_PAGE_SIZE, MAX_PAGE_SIZE]
 * - `cursor` — opaque cursor for cursor-based pagination (optional)
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce
    .number()
    .int()
    .min(MIN_PAGE_SIZE, `Limit must be at least ${MIN_PAGE_SIZE}`)
    .max(MAX_PAGE_SIZE, `Limit must not exceed ${MAX_PAGE_SIZE}`)
    .default(DEFAULT_PAGE_SIZE),
  cursor: z.string().min(1).optional(),
})

export type PaginationInput = z.input<typeof paginationSchema>
export type Pagination = z.output<typeof paginationSchema>

/** Environment string schema, locked to {@link ENVIRONMENTS}. */
export const environmentSchema = z.enum(ENVIRONMENTS)
