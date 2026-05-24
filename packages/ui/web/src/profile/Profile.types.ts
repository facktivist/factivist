/**
 * `Profile.*` compound contract — web (HeroUI v3).
 *
 * Surface: 6 — Citizen profile (anonymous handle, count of complaints, NO PII).
 *
 * Per ADR-010 the profile MUST NOT expose: real name, address, photo of
 * citizen, raw nullifier, device fingerprint, IP, geo beyond the
 * constituency they participate in.
 */

import type { ComplaintSummary } from '../complaint/Complaint.types.ts'

/** Public profile shape — what the API returns, sanitized. */
export interface CitizenProfile {
  /** Anonymous handle. */
  readonly handle: string
  /** Nullifier prefix, first 8 chars only (never the full value). */
  readonly nullifierExcerpt: string
  /** Aggregate counts. */
  readonly stats: {
    readonly complaintCount: number
    readonly commentCount: number
    readonly flagsReceived: number
  }
  /** Joined-at timestamp (ISO-8601), rounded to the day for privacy. */
  readonly joinedAt: string
}

// ─── Profile.Handle ───────────────────────────────────────────────────
/** Renders the handle + nullifier excerpt with copy-affordance. */
export interface ProfileHandleProps {
  readonly handle: string
  readonly nullifierExcerpt: string
  readonly className?: string
}

// ─── Profile.Stats ────────────────────────────────────────────────────
export interface ProfileStatsProps {
  readonly stats: CitizenProfile['stats']
  readonly className?: string
}

// ─── Profile.ComplaintList ────────────────────────────────────────────
export interface ProfileComplaintListProps {
  readonly handle: string
  readonly items: ReadonlyArray<ComplaintSummary>
  readonly loading?: boolean
  readonly onItemOpen: (id: string) => void
  readonly className?: string
}

export const PROFILE_SLOTS = {
  Handle: 'Profile.Handle',
  Stats: 'Profile.Stats',
  ComplaintList: 'Profile.ComplaintList',
} as const

export type ProfileSlot = (typeof PROFILE_SLOTS)[keyof typeof PROFILE_SLOTS]
