/**
 * `Profile.*` compound contract — mobile (HeroUI Native + Uniwind).
 *
 * Same anonymity floor as web (ADR-010): no PII ever.
 */

import type { ComplaintSummary } from '../complaint/Complaint.types.ts'

export interface CitizenProfile {
  readonly handle: string
  readonly nullifierExcerpt: string
  readonly stats: {
    readonly complaintCount: number
    readonly commentCount: number
    readonly flagsReceived: number
  }
  readonly joinedAt: string
}

interface NativeProps {
  readonly style?: unknown
  readonly accessibilityLabel?: string
  readonly testID?: string
}

export interface ProfileHandleProps extends NativeProps {
  readonly handle: string
  readonly nullifierExcerpt: string
}

export interface ProfileStatsProps extends NativeProps {
  readonly stats: CitizenProfile['stats']
}

export interface ProfileComplaintListProps extends NativeProps {
  readonly handle: string
  readonly items: ReadonlyArray<ComplaintSummary>
  readonly loading?: boolean
  readonly onItemOpen: (id: string) => void
  readonly onEndReached?: () => void
}

export const PROFILE_SLOTS = {
  Handle: 'Profile.Handle',
  Stats: 'Profile.Stats',
  ComplaintList: 'Profile.ComplaintList',
} as const

export type ProfileSlot = (typeof PROFILE_SLOTS)[keyof typeof PROFILE_SLOTS]
