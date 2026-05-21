import { z } from 'zod';

import { EMAIL_REGEX, SLUG_REGEX, UUID_V4_REGEX } from '../constants/patterns.ts';

/**
 * Branded UUID v4 identifier.
 *
 * Use this for any internal entity ID (DB row, aggregate root, etc.).
 * Branding prevents accidental mixing of unrelated string IDs at the type level.
 */
export const idSchema = z
  .string()
  .regex(UUID_V4_REGEX, 'Must be a valid UUID v4')
  .brand<'Id'>();

export type Id = z.infer<typeof idSchema>;

/**
 * Email address. Normalized to lowercase + trimmed before validation.
 *
 * Uses Zod's built-in email check plus an explicit regex guard.
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Must be a valid email address')
  .regex(EMAIL_REGEX, 'Must be a valid email address')
  .brand<'Email'>();

export type Email = z.infer<typeof emailSchema>;

/**
 * URL-safe slug: lowercase alphanumerics with single hyphens between groups.
 *
 * Examples — valid: `my-post`, `factivist-2026`. Invalid: `-bad`, `bad-`, `Bad`.
 */
export const slugSchema = z
  .string()
  .min(1, 'Slug cannot be empty')
  .max(80, 'Slug cannot exceed 80 characters')
  .regex(SLUG_REGEX, 'Slug must be lowercase alphanumerics separated by single hyphens');

export type Slug = z.infer<typeof slugSchema>;

/**
 * ISO-8601 timestamp string. Branded for type-level safety.
 */
export const timestampSchema = z
  .string()
  .datetime({ offset: true, message: 'Must be an ISO-8601 timestamp' })
  .brand<'Timestamp'>();

export type Timestamp = z.infer<typeof timestampSchema>;

/**
 * Coerce an unknown timestamp input to a `Date`. Throws on invalid input.
 */
export const parseTimestamp = (input: unknown): Date => {
  const parsed = timestampSchema.parse(input);
  return new Date(parsed);
};
