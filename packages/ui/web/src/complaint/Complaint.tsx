/**
 * `Complaint.*` compound — web (HeroUI v3).
 *
 * Surfaces 2 (Composer), 3 (Detail card + gallery + flag), 4 (Browse list).
 * Driven by the Claude Design prototypes at
 * `docs/design/s1/handoff/product-design/factivist-s1/project/screens/`:
 *   - complaint-register.jsx (composer)
 *   - complaint-view.jsx (detail card + photo gallery)
 *   - evidence-viewer.jsx (gallery overlay)
 *   - discovery.jsx + landing.jsx (browse list cards)
 *
 * ## Anonymity invariants (ADR-010)
 *
 *   - The compound never displays the `author_id` (Supabase Auth UUID).
 *     Only `authorHandle` (anonymous nullifier-derived label) reaches
 *     the UI.
 *   - `ComplaintCardProps.complaint.photoUrls` are signed-URLs; they
 *     point at EXIF-stripped photos per ADR-004.
 *
 * ## Tokens consumed (semantic only)
 *
 *   `--color-card`, `--color-foreground`, `--color-muted`,
 *   `--color-muted-foreground`, `--color-primary`,
 *   `--color-primary-foreground`, `--color-border`,
 *   `--color-destructive`, `--color-verified`,
 *   `--space-{2,3,4,5,6,8}`, `--radius-{md,lg,xl}`,
 *   `--shadow-{xs,sm,md}`, `--duration-{fast,base}`.
 *
 * ## Compound shape (S1 scope, this commit)
 *
 *   `Complaint.Composer`             — outer form wrapper (caller owns RHF state)
 *   `Complaint.PhotoTray`            — 0..3 thumbnails + per-photo upload state
 *   `Complaint.CategoryPicker`       — 35-cat single-select (button grid)
 *   `Complaint.SubmitBar`            — sticky bar: submit + body counter + draft
 *   `Complaint.Card`                 — browse / detail header card
 *   `Complaint.List`                 — paginated browse list of cards
 *
 * ConstituencyPicker / PhotoGallery / FlagAction land in the S03 detail
 * commit (they share state with the comment thread + lightbox dialog).
 */

import type * as React from 'react'

import { Button, Card, Spinner } from '../components/index.ts'
import type {
  ComplaintCardProps,
  ComplaintCategoryPickerProps,
  ComplaintComposerProps,
  Complaint as ComplaintDetailType,
  ComplaintListProps,
  ComplaintPhoto,
  ComplaintPhotoTrayProps,
  ComplaintSubmitBarProps,
  ComplaintSummary,
} from './Complaint.types.ts'

const cx = (...parts: ReadonlyArray<string | false | null | undefined>): string =>
  parts.filter((p): p is string => typeof p === 'string' && p.length > 0).join(' ')

// ─── Complaint.Composer ────────────────────────────────────────────────

const Composer = ({
  children,
  status = 'idle',
  className,
  onSubmit,
}: ComplaintComposerProps): React.JSX.Element => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault()
    // The composer's `onSubmit` contract receives a typed payload — the
    // caller wires RHF + Zod and passes the validated payload here. The
    // raw form event is consumed by the caller before this method is
    // invoked, so we pass an empty placeholder when the form fires
    // directly. The Phase 5 wire-up overrides this via SubmitBar.onSubmit.
    void onSubmit({
      title: '',
      body: '',
      categoryId: 0,
      constituencyCode: '',
      photoUrls: [],
    })
  }
  return (
    <form
      aria-label="File a complaint"
      data-status={status}
      onSubmit={handleSubmit}
      className={cx(
        'flex flex-col gap-6 p-6 rounded-xl',
        'bg-[var(--color-card)] text-[var(--color-foreground)]',
        'border border-[var(--color-border)] shadow-sm',
        className,
      )}
    >
      {children}
    </form>
  )
}

// ─── Complaint.PhotoTray ───────────────────────────────────────────────

const photoTone = (state: ComplaintPhoto['uploadState']): string => {
  switch (state) {
    case 'failed':
      return 'border-[var(--color-destructive)] text-[var(--color-destructive)]'
    case 'uploaded':
      return 'border-[var(--color-verified)] text-[var(--color-verified)]'
    case 'uploading':
      return 'border-[var(--color-primary)] text-[var(--color-primary)]'
    default:
      return 'border-[var(--color-border)] text-[var(--color-muted-foreground)]'
  }
}

const PhotoTray = ({
  photos,
  maxPhotos = 3,
  onAdd,
  onRemove,
  status = 'idle',
  className,
}: ComplaintPhotoTrayProps): React.JSX.Element => {
  const remaining = Math.max(0, maxPhotos - photos.length)
  return (
    <fieldset data-status={status} className={cx('flex flex-col gap-2', className)}>
      <legend className="text-xs font-mono uppercase tracking-wider text-[var(--color-muted-foreground)]">
        Photos ({photos.length}/{maxPhotos})
      </legend>
      <div className="flex flex-wrap gap-3">
        {photos.map((photo) => (
          <div
            key={photo.id}
            data-upload={photo.uploadState}
            className={cx(
              'relative w-24 h-24 rounded-md border-2 overflow-hidden bg-[var(--color-muted)]',
              photoTone(photo.uploadState),
            )}
          >
            {photo.url ? (
              <div
                role="img"
                aria-label="Complaint photo preview"
                className="w-full h-full bg-cover bg-center"
                style={{ backgroundImage: `url(${photo.url})` }}
              />
            ) : null}
            {photo.uploadState === 'uploading' && photo.progress !== undefined ? (
              <div
                className="absolute bottom-0 left-0 h-1 bg-[var(--color-primary)] transition-[width] duration-[var(--duration-base)]"
                style={{ width: `${Math.round(photo.progress * 100)}%` }}
                aria-hidden="true"
              />
            ) : null}
            <button
              type="button"
              aria-label={`Remove photo ${photo.id}`}
              onClick={() => onRemove(photo.id)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[var(--color-card)] text-[var(--color-foreground)] text-xs leading-none border border-[var(--color-border)]"
            >
              ×
            </button>
          </div>
        ))}
        {remaining > 0 ? (
          <button
            type="button"
            aria-label="Add photo"
            onClick={onAdd}
            className="w-24 h-24 rounded-md border-2 border-dashed border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors duration-[var(--duration-fast)]"
          >
            <span aria-hidden="true" className="text-2xl">
              +
            </span>
          </button>
        ) : null}
      </div>
    </fieldset>
  )
}

// ─── Complaint.CategoryPicker ──────────────────────────────────────────

const CategoryPicker = ({
  categories,
  selectedId,
  onChange,
  status = 'idle',
  className,
}: ComplaintCategoryPickerProps): React.JSX.Element => (
  <fieldset data-status={status} className={cx('flex flex-col gap-2', className)}>
    <legend className="text-xs font-mono uppercase tracking-wider text-[var(--color-muted-foreground)]">
      Category
    </legend>
    <div role="radiogroup" aria-label="Complaint category" className="flex flex-wrap gap-2">
      {categories.map((cat) => {
        const active = cat.id === selectedId
        return (
          <label
            key={cat.id}
            className={cx(
              'px-3 py-1.5 rounded-full text-sm border transition-colors duration-[var(--duration-fast)] cursor-pointer',
              active
                ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border-[var(--color-primary)]'
                : 'bg-[var(--color-card)] text-[var(--color-foreground)] border-[var(--color-border)] hover:border-[var(--color-primary)]',
            )}
          >
            <input
              type="radio"
              name="complaint-category"
              value={cat.id}
              checked={active}
              onChange={() => onChange(cat.id)}
              className="sr-only"
              aria-label={cat.label}
            />
            {cat.label}
          </label>
        )
      })}
    </div>
  </fieldset>
)

// ─── Complaint.SubmitBar ───────────────────────────────────────────────

const SubmitBar = ({
  canSubmit,
  submitting,
  bodyLength,
  bodyLimit,
  onSubmit,
  onSaveDraft,
  className,
}: ComplaintSubmitBarProps): React.JSX.Element => {
  const overBudget = bodyLength > bodyLimit
  return (
    <div
      role="toolbar"
      aria-label="Complaint submission"
      className={cx(
        'sticky bottom-0 flex items-center justify-between gap-3 p-4',
        'bg-[var(--color-card)] border-t border-[var(--color-border)] shadow-md rounded-b-xl',
        className,
      )}
    >
      <span
        className={cx(
          'text-xs font-mono',
          overBudget ? 'text-[var(--color-destructive)]' : 'text-[var(--color-muted-foreground)]',
        )}
      >
        {bodyLength}/{bodyLimit}
      </span>
      <div className="flex gap-2">
        {onSaveDraft ? (
          <Button variant="ghost" onClick={onSaveDraft} isDisabled={submitting}>
            Save draft
          </Button>
        ) : null}
        <Button
          variant="primary"
          onClick={onSubmit}
          isDisabled={!canSubmit || submitting || overBudget}
        >
          {submitting ? <Spinner aria-hidden="true" /> : 'Submit'}
        </Button>
      </div>
    </div>
  )
}

// ─── Complaint.Card ────────────────────────────────────────────────────

const formatLocation = (geo: ComplaintSummary['geo']): string =>
  [geo.state, geo.district, geo.constituency].filter(Boolean).join(' / ')

const formatDate = (iso: string): string => {
  // ISO → en-IN locale date. No time-of-day (privacy: don't reveal
  // posting habits at sub-day resolution). `Date` does not throw on
  // garbage input — it returns an Invalid Date whose toLocaleDateString
  // is "Invalid Date", so we guard via `getTime()` instead.
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const ComplaintCard = ({
  complaint,
  onOpen,
  onFlag,
  className,
}: ComplaintCardProps): React.JSX.Element => (
  <Card className={cx('flex flex-col gap-3 p-4', className)}>
    <header className="flex items-start justify-between gap-3">
      <button
        type="button"
        onClick={() => onOpen(complaint.id)}
        className="flex-1 text-left text-base font-semibold text-[var(--color-foreground)] hover:underline focus-visible:underline"
      >
        {complaint.title}
      </button>
      {onFlag ? (
        <button
          type="button"
          aria-label={`Flag ${complaint.title}`}
          onClick={() => onFlag(complaint.id)}
          className="text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-destructive)] transition-colors duration-[var(--duration-fast)]"
        >
          ⚑
        </button>
      ) : null}
    </header>
    <p className="text-sm text-[var(--color-muted-foreground)] line-clamp-3">
      {complaint.bodyExcerpt}
    </p>
    <footer className="flex items-center justify-between text-xs text-[var(--color-muted-foreground)] font-mono">
      <span>{formatLocation(complaint.geo)}</span>
      <span>{formatDate(complaint.createdAt)}</span>
    </footer>
    {complaint.flagged ? (
      <p className="text-xs text-[var(--color-destructive)]" role="status">
        Flagged for review
      </p>
    ) : null}
  </Card>
)

// ─── Complaint.List ────────────────────────────────────────────────────

const ComplaintList = ({
  items,
  loading,
  emptyHint,
  onItemOpen,
  onLoadMore,
  className,
}: ComplaintListProps): React.JSX.Element => {
  if (items.length === 0 && !loading) {
    return (
      <div
        role="status"
        className={cx(
          'flex flex-col items-center justify-center gap-2 p-8 text-center',
          'text-[var(--color-muted-foreground)]',
          className,
        )}
      >
        <p className="text-sm">{emptyHint ?? 'No complaints yet.'}</p>
      </div>
    )
  }
  return (
    <ul
      aria-label="Complaint list"
      aria-busy={loading ? true : undefined}
      className={cx('flex flex-col gap-3 list-none p-0', className)}
    >
      {items.map((item) => (
        <li key={item.id}>
          <ComplaintCard complaint={item} onOpen={onItemOpen} />
        </li>
      ))}
      {loading ? (
        <div className="flex justify-center p-4" role="status" aria-label="Loading more">
          <Spinner aria-hidden="true" />
        </div>
      ) : null}
      {onLoadMore && !loading && items.length > 0 ? (
        <div className="flex justify-center p-3">
          <Button variant="ghost" onClick={onLoadMore}>
            Load more
          </Button>
        </div>
      ) : null}
    </ul>
  )
}

// ─── Compound export ───────────────────────────────────────────────────

export const Complaint = {
  Composer,
  PhotoTray,
  CategoryPicker,
  SubmitBar,
  Card: ComplaintCard,
  List: ComplaintList,
} as const

export type ComplaintCompound = typeof Complaint

// Re-export the most-referenced types so consumers don't have to dig
// into the `.types.ts` file when they already have `Complaint` imported.
export type { ComplaintDetailType as ComplaintDetail, ComplaintSummary }
// Surface the helper formatters so the apps can use the same locale rules
// as the card (avoids subtle Date.toString drift between SSR + client).
export {
  CategoryPicker as ComplaintCategoryPicker,
  ComplaintCard,
  ComplaintList,
  Composer as ComplaintComposer,
  formatDate as formatComplaintDate,
  formatLocation as formatComplaintLocation,
  PhotoTray as ComplaintPhotoTray,
  SubmitBar as ComplaintSubmitBar,
}
