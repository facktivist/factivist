/**
 * `Complaint.*` compound contract — web (HeroUI v3).
 *
 * Surfaces: 2 (Composer), 3 (Detail), 4 (Browse/List).
 *
 * Tokens consumed: surface, surfaceElevated, text, textMuted, textOnBrand,
 *   brand, border, borderStrong, ring, dangerBg, dangerText, warningBg,
 *   warningText, successBg, successText, infoBg, infoText, space-2..8,
 *   radius-md/lg, shadow-light/medium, motion.duration.fast/base.
 */

import type { OnboardingStatus as Status } from '../onboarding/Onboarding.types.ts'

/** A complaint as returned by `apps/api/src/routes/complaint`. */
export interface ComplaintSummary {
  readonly id: string
  readonly title: string
  readonly bodyExcerpt: string
  readonly categoryId: number
  /** Constituency `state/district/constituency` triple (lowercase slugs). */
  readonly geo: {
    readonly state: string
    readonly district: string
    readonly constituency: string
  }
  readonly photoUrls: ReadonlyArray<string>
  readonly createdAt: string // ISO-8601
  readonly commentCount: number
  readonly flagged: boolean
}

/** Full complaint shape (detail view). */
export interface Complaint extends ComplaintSummary {
  readonly body: string
  readonly authorHandle: string // anonymous handle — never PII
}

/** One of the 35 S1 complaint categories. Final list lives in packages/shared. */
export interface ComplaintCategory {
  readonly id: number
  readonly slug: string
  readonly label: string
  /** Optional icon name (lookup table in compound implementation). */
  readonly icon?: string
}

/** Cascading constituency node — used by both composer + filters. */
export interface ConstituencyNode {
  readonly code: string
  readonly label: string
  readonly level: 'state' | 'district' | 'constituency'
  /** Lazy-loaded; never required to fully populate. */
  readonly children?: ReadonlyArray<ConstituencyNode>
}

// ─── Complaint.Composer ───────────────────────────────────────────────
/**
 * Top-level composer wrapper. Owns no state; consumers wire React Hook
 * Form + Zod (`packages/shared/schemas/complaint`).
 */
export interface ComplaintComposerProps {
  /** Slot for `Complaint.PhotoTray`, pickers, body editor, etc. */
  readonly children?: React.ReactNode
  readonly status?: Status
  readonly className?: string
  readonly onSubmit: (payload: ComplaintComposerPayload) => void | Promise<void>
}

export interface ComplaintComposerPayload {
  readonly title: string
  readonly body: string
  readonly categoryId: number
  readonly constituencyCode: string
  /** Already-uploaded photo URLs (EXIF-stripped server-side, ADR-004). */
  readonly photoUrls: ReadonlyArray<string>
}

// ─── Complaint.PhotoTray ──────────────────────────────────────────────
/**
 * 1–3 photos per complaint (S1 cap). Tray shows ordered thumbnails with
 * remove affordance + add-more button when count < 3.
 */
export interface ComplaintPhotoTrayProps {
  readonly photos: ReadonlyArray<ComplaintPhoto>
  readonly maxPhotos?: 3
  readonly onAdd: () => void
  readonly onRemove: (photoId: string) => void
  readonly status?: Status
  readonly className?: string
}

export interface ComplaintPhoto {
  readonly id: string
  /** Local preview URL (object URL) OR uploaded URL after tus completes. */
  readonly url: string
  readonly uploadState: 'pending' | 'uploading' | 'uploaded' | 'failed'
  readonly progress?: number // 0..1, only while uploading
}

// ─── Complaint.CategoryPicker ─────────────────────────────────────────
/** Picker for the 35-item S1 category taxonomy. Single-select. */
export interface ComplaintCategoryPickerProps {
  readonly categories: ReadonlyArray<ComplaintCategory>
  readonly selectedId: number | null
  readonly onChange: (id: number) => void
  readonly status?: Status
  readonly className?: string
}

// ─── Complaint.ConstituencyPicker ─────────────────────────────────────
/**
 * Cascading state → district → constituency picker. Manual selection per
 * ADR-013 (no geo-IP auto-resolve in S1). Implementation MAY pre-fetch
 * the root list and lazy-load child levels.
 */
export interface ComplaintConstituencyPickerProps {
  readonly value: {
    readonly state?: string
    readonly district?: string
    readonly constituency?: string
  }
  readonly onChange: (next: ComplaintConstituencyPickerProps['value']) => void
  /** Lazy data source. Called per level; cached at the composer level. */
  readonly loadChildren: (parentCode: string | null) => Promise<ReadonlyArray<ConstituencyNode>>
  readonly status?: Status
  readonly className?: string
}

// ─── Complaint.SubmitBar ──────────────────────────────────────────────
/**
 * Sticky bottom bar — submit affordance + character count + draft toggle.
 * Elevated (shadow-medium) on web; sticky-positioned by default.
 */
export interface ComplaintSubmitBarProps {
  readonly canSubmit: boolean
  readonly submitting: boolean
  readonly bodyLength: number
  readonly bodyLimit: number
  readonly onSubmit: () => void
  readonly onSaveDraft?: () => void
  readonly className?: string
}

// ─── Complaint.Card ───────────────────────────────────────────────────
/** Browse / list / search-result card. */
export interface ComplaintCardProps {
  readonly complaint: ComplaintSummary
  readonly onOpen: (id: string) => void
  readonly onFlag?: (id: string) => void
  readonly className?: string
}

// ─── Complaint.PhotoGallery ───────────────────────────────────────────
/** Read-only photo gallery in the detail view; tap to lightbox. */
export interface ComplaintPhotoGalleryProps {
  readonly photoUrls: ReadonlyArray<string>
  readonly onPhotoOpen?: (index: number) => void
  readonly className?: string
}

// ─── Complaint.FlagAction ─────────────────────────────────────────────
/**
 * Flag-for-moderation control. Two-step (open dialog → reason → confirm).
 * Reasons are a fixed enum (manual moderation queue, S1 has no LLM mod).
 */
export type ComplaintFlagReason =
  | 'spam'
  | 'abuse'
  | 'pii-leak'
  | 'off-topic'
  | 'duplicate'
  | 'other'

export interface ComplaintFlagActionProps {
  readonly complaintId: string
  readonly onFlag: (input: { readonly id: string; readonly reason: ComplaintFlagReason }) => void
  readonly status?: Status
  readonly className?: string
}

// ─── Complaint.List ───────────────────────────────────────────────────
/** Browse list (paginated/virtualized in implementation). */
export interface ComplaintListProps {
  readonly items: ReadonlyArray<ComplaintSummary>
  readonly loading?: boolean
  readonly emptyHint?: string
  readonly onItemOpen: (id: string) => void
  readonly onLoadMore?: () => void
  readonly className?: string
}

// ─── Slot map ─────────────────────────────────────────────────────────
export const COMPLAINT_SLOTS = {
  Composer: 'Complaint.Composer',
  PhotoTray: 'Complaint.PhotoTray',
  CategoryPicker: 'Complaint.CategoryPicker',
  ConstituencyPicker: 'Complaint.ConstituencyPicker',
  SubmitBar: 'Complaint.SubmitBar',
  Card: 'Complaint.Card',
  PhotoGallery: 'Complaint.PhotoGallery',
  FlagAction: 'Complaint.FlagAction',
  List: 'Complaint.List',
} as const

export type ComplaintSlot = (typeof COMPLAINT_SLOTS)[keyof typeof COMPLAINT_SLOTS]
