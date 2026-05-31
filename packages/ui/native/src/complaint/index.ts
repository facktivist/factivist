/**
 * Native Complaint surface — barrel.
 * S1 scope ships Composer/PhotoTray/CategoryPicker/SubmitBar/Card/List;
 * ConstituencyPicker / PhotoGallery / FlagAction land in S03 commit.
 *
 * The compound's runtime value is also named `Complaint`. The types
 * file exports an interface named `Complaint` (full-detail shape) that
 * we re-export under its detail alias to avoid the name collision.
 */
export * from './Complaint.tsx'
export type {
  COMPLAINT_SLOTS,
  Complaint as ComplaintDetail,
  ComplaintCardProps,
  ComplaintCategory,
  ComplaintCategoryPickerProps,
  ComplaintComposerPayload,
  ComplaintComposerProps,
  ComplaintConstituencyPickerProps,
  ComplaintFlagActionProps,
  ComplaintFlagReason,
  ComplaintListProps,
  ComplaintPhoto,
  ComplaintPhotoGalleryProps,
  ComplaintPhotoTrayProps,
  ComplaintSlot,
  ComplaintSubmitBarProps,
  ComplaintSummary,
  ConstituencyNode,
} from './Complaint.types.ts'
