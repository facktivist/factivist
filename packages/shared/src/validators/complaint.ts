import { z } from 'zod'

import { slugSchema } from './primitives.ts'

/**
 * Complaint domain validators.
 *
 * Single source of truth for client + server. The API and the React Hook
 * Form composer both consume `createComplaintInputSchema`; the UI surfaces
 * the {@link FLAG_REASONS} list to render the reason picker.
 *
 * References:
 *  - ATID-COMPL-001, ATID-COMPL-005 (5000-char body, ≤3 photos)
 *  - ATID-COMPL-004 (manual constituency picker, no GPS)
 *  - ATID-LEGAL-010 (disclaimer string verbatim)
 *  - ADR-013 (manual geo tagging)
 *  - ADR-017 (combobox + breadcrumb picker)
 *  - ADR-020 (`pii-leak` as a distinct flag reason)
 */

/** Verbatim legal disclaimer rendered above the body and stored on the row. */
export const COMPLAINT_DISCLAIMER = 'User-submitted; not verified by Factivist.' as const

/** Hard limits (mirror the API Zod boundary). */
export const COMPLAINT_TITLE_MAX = 120 as const
export const COMPLAINT_BODY_MAX = 5000 as const
export const COMPLAINT_PHOTO_MAX = 3 as const

/**
 * Flag reasons surfaced in the moderation picker.
 *
 * Order matters — it's the visual order shown to the citizen. `pii-leak`
 * comes first because ADR-020 pins the legally most urgent category up.
 */
export const FLAG_REASONS = [
  'pii-leak',
  'harassment',
  'misinformation',
  'spam',
  'off-topic',
] as const

export type FlagReason = (typeof FLAG_REASONS)[number]

export const flagReasonSchema = z.enum(FLAG_REASONS)

/** Human-readable label for each reason — kept here so labels stay in sync. */
export const FLAG_REASON_LABEL: Readonly<Record<FlagReason, string>> = {
  'pii-leak': 'PII / personal data leak',
  harassment: 'Harassment or abuse',
  misinformation: 'Misinformation',
  spam: 'Spam',
  'off-topic': 'Off-topic',
}

/**
 * Constituency tuple — every published complaint MUST carry all four codes.
 *
 * Codes are slugs (lowercase, hyphen-separated) per ADR-012, populated by
 * the Phase 1 reference dataset.
 */
export const constituencyTupleSchema = z.object({
  stateCode: slugSchema,
  districtCode: slugSchema,
  pcCode: slugSchema,
  acCode: slugSchema,
})

export type ConstituencyTuple = z.infer<typeof constituencyTupleSchema>

/**
 * Create-complaint input. Photos are transported as already-uploaded URLs
 * (the file upload is a separate multipart endpoint server-side).
 */
export const createComplaintInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Add a one-line title.')
    .max(COMPLAINT_TITLE_MAX, `Title must be at most ${COMPLAINT_TITLE_MAX} characters.`),
  body: z
    .string()
    .min(1, 'Add a complaint body.')
    .max(COMPLAINT_BODY_MAX, `${COMPLAINT_BODY_MAX} character limit reached.`),
  categorySlug: slugSchema,
  stateCode: slugSchema,
  districtCode: slugSchema,
  pcCode: slugSchema,
  acCode: slugSchema,
  photoUrls: z
    .array(z.url())
    .max(COMPLAINT_PHOTO_MAX, `You can attach up to ${COMPLAINT_PHOTO_MAX} photos.`)
    .default([]),
})

export type CreateComplaintInput = z.input<typeof createComplaintInputSchema>
export type CreateComplaint = z.output<typeof createComplaintInputSchema>

/** Discovery / browse filters. Empty / undefined means "all". */
export const discoveryFiltersSchema = z.object({
  q: z.string().trim().min(1).optional(),
  stateCode: slugSchema.optional(),
  districtCode: slugSchema.optional(),
  pcCode: slugSchema.optional(),
  acCode: slugSchema.optional(),
  categorySlug: slugSchema.optional(),
  sort: z.enum(['newest', 'most-commented', 'most-flagged']).default('newest'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
})

export type DiscoveryFiltersInput = z.input<typeof discoveryFiltersSchema>
export type DiscoveryFilters = z.output<typeof discoveryFiltersSchema>

/** Flag-complaint input. */
export const flagComplaintInputSchema = z.object({
  reason: flagReasonSchema,
  note: z.string().trim().max(500).optional(),
})

export type FlagComplaintInput = z.infer<typeof flagComplaintInputSchema>
