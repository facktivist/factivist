/**
 * `Complaint.*` compound contract — mobile (HeroUI Native + Uniwind).
 *
 * Mirror of `@factivist/ui-web/complaint` with mobile deltas:
 *   - `style?: unknown` + `accessibilityLabel?` + `testID?` on every props
 *     interface (via `NativeProps`).
 *   - `PhotoTray` uses Expo ImagePicker / Camera; the callback shape is
 *     identical to web (`onAdd`, `onRemove`) but the picker UX differs.
 *   - `ConstituencyPicker` uses bottom-sheet pages instead of cascading
 *     dropdowns (per `building-native-ui` skill).
 *   - `SubmitBar` is keyboard-aware and respects safe-area insets.
 */

/** Shared domain types are duplicated here (not imported from web) to keep
 * `@factivist/ui-native` independent of `@factivist/ui-web`. They MUST stay
 * structurally identical — Phase 5 may extract them into
 * `@factivist/shared/types/complaint`. */

export interface ComplaintSummary {
  readonly id: string
  readonly title: string
  readonly bodyExcerpt: string
  readonly categoryId: number
  readonly geo: {
    readonly state: string
    readonly district: string
    readonly constituency: string
  }
  readonly photoUrls: ReadonlyArray<string>
  readonly createdAt: string
  readonly commentCount: number
  readonly flagged: boolean
}

export interface Complaint extends ComplaintSummary {
  readonly body: string
  readonly authorHandle: string
}

export interface ComplaintCategory {
  readonly id: number
  readonly slug: string
  readonly label: string
  readonly icon?: string
}

export interface ConstituencyNode {
  readonly code: string
  readonly label: string
  readonly level: 'state' | 'district' | 'constituency'
  readonly children?: ReadonlyArray<ConstituencyNode>
}

export type ComplaintFlagReason =
  | 'spam'
  | 'abuse'
  | 'pii-leak'
  | 'off-topic'
  | 'duplicate'
  | 'other'

type Status = 'idle' | 'loading' | 'error' | 'success' | 'disabled'

interface NativeProps {
  readonly style?: unknown
  readonly accessibilityLabel?: string
  readonly testID?: string
}

// ─── Compounds ────────────────────────────────────────────────────────

export interface ComplaintComposerProps extends NativeProps {
  readonly children?: React.ReactNode
  readonly status?: Status
  readonly onSubmit: (payload: ComplaintComposerPayload) => void | Promise<void>
}

export interface ComplaintComposerPayload {
  readonly title: string
  readonly body: string
  readonly categoryId: number
  readonly constituencyCode: string
  readonly photoUrls: ReadonlyArray<string>
}

export interface ComplaintPhotoTrayProps extends NativeProps {
  readonly photos: ReadonlyArray<ComplaintPhoto>
  readonly maxPhotos?: 3
  readonly onAdd: () => void
  readonly onRemove: (photoId: string) => void
  readonly status?: Status
}

export interface ComplaintPhoto {
  readonly id: string
  readonly url: string
  readonly uploadState: 'pending' | 'uploading' | 'uploaded' | 'failed'
  readonly progress?: number
}

export interface ComplaintCategoryPickerProps extends NativeProps {
  readonly categories: ReadonlyArray<ComplaintCategory>
  readonly selectedId: number | null
  readonly onChange: (id: number) => void
  readonly status?: Status
}

export interface ComplaintConstituencyPickerProps extends NativeProps {
  readonly value: {
    readonly state?: string
    readonly district?: string
    readonly constituency?: string
  }
  readonly onChange: (next: ComplaintConstituencyPickerProps['value']) => void
  readonly loadChildren: (parentCode: string | null) => Promise<ReadonlyArray<ConstituencyNode>>
  readonly status?: Status
}

export interface ComplaintSubmitBarProps extends NativeProps {
  readonly canSubmit: boolean
  readonly submitting: boolean
  readonly bodyLength: number
  readonly bodyLimit: number
  readonly onSubmit: () => void
  readonly onSaveDraft?: () => void
}

export interface ComplaintCardProps extends NativeProps {
  readonly complaint: ComplaintSummary
  readonly onOpen: (id: string) => void
  readonly onFlag?: (id: string) => void
}

export interface ComplaintPhotoGalleryProps extends NativeProps {
  readonly photoUrls: ReadonlyArray<string>
  readonly onPhotoOpen?: (index: number) => void
}

export interface ComplaintFlagActionProps extends NativeProps {
  readonly complaintId: string
  readonly onFlag: (input: { readonly id: string; readonly reason: ComplaintFlagReason }) => void
  readonly status?: Status
}

export interface ComplaintListProps extends NativeProps {
  readonly items: ReadonlyArray<ComplaintSummary>
  readonly loading?: boolean
  readonly emptyHint?: string
  readonly onItemOpen: (id: string) => void
  readonly onEndReached?: () => void
}

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
