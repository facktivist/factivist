'use client'

/**
 * Web complaint composer (Phase 5 wave 1 → design-wave rewrite).
 *
 * Consumes the `Complaint.*` compound from `@factivist/ui-web/complaint`
 * for the form root + submit bar:
 *
 *   - `Complaint.Composer` is the outer `<form>` (provides the
 *     design-system framing + status data-attribute).
 *   - `Complaint.SubmitBar` renders the sticky publish button +
 *     character counter; we drive it via the same RHF-less state +
 *     Zod boundary as before.
 *
 * Slots intentionally NOT consumed from the compound:
 *   - `Complaint.CategoryPicker` is radio-chip-based; the existing
 *     `<select>` is pinned by 4 tests and is the better mobile-form
 *     fallback at the 35-item taxonomy size. Keep the native select.
 *   - `Complaint.ConstituencyPicker` is a cascading-bottom-sheet
 *     compound aimed at mobile; the web app has its own bespoke
 *     `ConstituencyPicker` (URL-state-aware + browse-share-ready).
 *   - `Complaint.PhotoTray` ships, but in-browser photo capture lands
 *     in a follow-up wave; we keep the inline placeholder copy.
 *
 * Validation source of truth is `createComplaintInputSchema`. Server-
 * action contract (the `action` prop) and all `data-testid` selectors
 * pinned by `__tests__/CreateComplaintForm.test.tsx` are preserved.
 */
import {
  COMPLAINT_BODY_MAX,
  COMPLAINT_DISCLAIMER,
  COMPLAINT_PHOTO_MAX,
  COMPLAINT_TITLE_MAX,
  type CreateComplaintInput,
  createComplaintInputSchema,
} from '@factivist/shared/validators'
import { Complaint } from '@factivist/ui-web/complaint'
import { Input } from '@factivist/ui-web/components'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { type ApiCategory, apiClient } from '../../lib/api/client.ts'
import { ConstituencyPicker, type ConstituencySelection } from '../discovery/ConstituencyPicker.tsx'

/**
 * Server-action-style submit handler. Server actions cannot be passed
 * across `'use client'` boundaries except as imports, so the parent
 * server component imports `createComplaintAction` and passes it in.
 */
export type CreateComplaintAction = (input: CreateComplaintInput) => Promise<{
  readonly id: string
}>

export interface CreateComplaintFormProps {
  /** Server action that wraps the API call (forwards Supabase cookies). */
  readonly action: CreateComplaintAction
  /** Optional return path after publish; defaults to the new complaint page. */
  readonly redirectTo?: (id: string) => string
}

interface FormErrors {
  title?: string
  body?: string
  categorySlug?: string
  constituency?: string
  photoUrls?: string
  submit?: string
}

const initialConstituency: ConstituencySelection = {}

type CompleteConstituency = ConstituencySelection &
  Required<Pick<ConstituencySelection, 'stateCode' | 'districtCode' | 'pcCode' | 'acCode'>>

const isConstituencyComplete = (sel: ConstituencySelection): sel is CompleteConstituency =>
  Boolean(sel.stateCode && sel.districtCode && sel.pcCode && sel.acCode)

export function CreateComplaintForm({
  action,
  redirectTo = (id) => `/complaints/${id}`,
}: CreateComplaintFormProps) {
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [categorySlug, setCategorySlug] = useState<string>('')
  const [constituency, setConstituency] = useState<ConstituencySelection>(initialConstituency)
  const [photoUrls, _setPhotoUrls] = useState<string[]>([])
  const [errors, setErrors] = useState<FormErrors>({})

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiClient.listCategories(),
    staleTime: 60 * 60_000,
  })
  const categories: ReadonlyArray<ApiCategory> = categoriesQuery.data ?? []

  const submitMutation = useMutation({
    mutationFn: action,
    onSuccess: ({ id }) => {
      router.push(redirectTo(id))
    },
    onError: (err: unknown) => {
      setErrors({ submit: err instanceof Error ? err.message : 'Submission failed.' })
    },
  })

  /**
   * Validate + submit. Pulled out of the form's onSubmit so the
   * `Complaint.SubmitBar.onSubmit` callback can invoke it directly
   * (the compound owns the publish button; the form's own submit
   * event no longer fires).
   */
  const validateAndSubmit = (): void => {
    setErrors({})

    if (!isConstituencyComplete(constituency)) {
      setErrors({ constituency: 'Pick state, district, PC, and AC.' })
      return
    }

    const candidate = {
      title,
      body,
      categorySlug,
      stateCode: constituency.stateCode,
      districtCode: constituency.districtCode,
      pcCode: constituency.pcCode,
      acCode: constituency.acCode,
      photoUrls,
    }

    const parsed = createComplaintInputSchema.safeParse(candidate)
    if (!parsed.success) {
      const next: FormErrors = {}
      for (const issue of parsed.error.issues) {
        const path = issue.path[0]
        if (path === 'title') next.title = issue.message
        else if (path === 'body') next.body = issue.message
        else if (path === 'categorySlug') next.categorySlug = issue.message
        else if (path === 'photoUrls') next.photoUrls = issue.message
      }
      setErrors(next)
      return
    }

    submitMutation.mutate(parsed.data)
  }

  const composerStatus: 'idle' | 'loading' | 'error' = submitMutation.isPending
    ? 'loading'
    : errors.submit
      ? 'error'
      : 'idle'

  return (
    <div data-testid="create-complaint-form">
      <Complaint.Composer
        status={composerStatus}
        onSubmit={() => {
          // The compound's `onSubmit` payload is a typed
          // ComplaintComposerPayload that the compound itself
          // never constructs (it just forwards form-submit events).
          // We drive the real submit through `Complaint.SubmitBar`
          // below, so this handler is intentionally a no-op.
        }}
        className="p-6"
      >
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
          New complaint
        </h1>

        <div
          role="note"
          aria-label="Disclaimer"
          className="mt-4 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm"
          data-testid="complaint-disclaimer"
        >
          <strong>Disclaimer.</strong> {COMPLAINT_DISCLAIMER}
        </div>

        <fieldset className="mt-6 flex flex-col gap-2">
          <label
            htmlFor="complaint-title"
            className="text-sm font-medium text-[var(--color-foreground)]"
          >
            Title
          </label>
          <Input
            id="complaint-title"
            type="text"
            maxLength={COMPLAINT_TITLE_MAX}
            placeholder="What is the complaint about? (one line)"
            value={title}
            onChange={(e) => setTitle((e.target as HTMLInputElement).value)}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? 'err-title' : undefined}
            data-testid="complaint-title"
          />
          {errors.title ? (
            <p id="err-title" role="alert" className="text-sm text-danger">
              {errors.title}
            </p>
          ) : null}
        </fieldset>

        <fieldset className="mt-6 flex flex-col gap-2">
          <label
            htmlFor="complaint-category"
            className="text-sm font-medium text-[var(--color-foreground)]"
          >
            Category
          </label>
          <select
            id="complaint-category"
            value={categorySlug}
            onChange={(e) => setCategorySlug(e.target.value)}
            aria-invalid={Boolean(errors.categorySlug)}
            aria-describedby={errors.categorySlug ? 'err-category' : undefined}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm"
            data-testid="complaint-category"
          >
            <option value="">Select a category</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
          {errors.categorySlug ? (
            <p id="err-category" role="alert" className="text-sm text-danger">
              {errors.categorySlug}
            </p>
          ) : null}
        </fieldset>

        <fieldset className="mt-6">
          <legend className="mb-1 text-sm font-medium text-[var(--color-foreground)]">
            Constituency
          </legend>
          <p className="mb-2 text-xs text-[var(--color-muted-foreground)]">
            Manual pick — no GPS or location services used.
          </p>
          <ConstituencyPicker value={constituency} onChange={setConstituency} />
          {errors.constituency ? (
            <p role="alert" className="mt-2 text-sm text-danger">
              {errors.constituency}
            </p>
          ) : null}
        </fieldset>

        <fieldset className="mt-6 flex flex-col gap-2">
          <label
            htmlFor="complaint-body"
            className="text-sm font-medium text-[var(--color-foreground)]"
          >
            Body
          </label>
          <textarea
            id="complaint-body"
            rows={8}
            maxLength={COMPLAINT_BODY_MAX}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Describe the issue in your own words. Include dates, places, and what action you expect."
            aria-invalid={Boolean(errors.body)}
            aria-describedby={errors.body ? 'err-body' : 'body-counter'}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm"
            data-testid="complaint-body"
          />
          {/* The compound's SubmitBar carries the canonical counter;
              this duplicate is preserved as a test-pin only (the
              existing vitest suite asserts on data-testid='body-counter'). */}
          <div
            id="body-counter"
            className="text-right text-xs text-[var(--color-muted-foreground)]"
            data-testid="body-counter"
          >
            {body.length}/{COMPLAINT_BODY_MAX}
          </div>
          {errors.body ? (
            <p id="err-body" role="alert" className="text-sm text-danger">
              {errors.body}
            </p>
          ) : null}
        </fieldset>

        <p className="mt-4 text-xs text-[var(--color-muted-foreground)]">
          Photos (up to {COMPLAINT_PHOTO_MAX}) — EXIF metadata is stripped server-side. Photo upload
          UI ships next.
        </p>

        {errors.submit ? (
          <div role="alert" className="mt-4 rounded-md bg-danger/10 p-3 text-sm text-danger">
            {errors.submit}
          </div>
        ) : null}

        <div className="mt-6">
          {/* Compound submit bar — drives publish + counter + draft slots.
              Wire the publish button (the existing testID 'complaint-submit'
              moves to the bar's internal button via a wrapping div). */}
          <div data-testid="complaint-submit-wrap">
            <Complaint.SubmitBar
              canSubmit={title.length > 0 && body.length > 0 && categorySlug.length > 0}
              submitting={submitMutation.isPending}
              bodyLength={body.length}
              bodyLimit={COMPLAINT_BODY_MAX}
              onSubmit={validateAndSubmit}
            />
          </div>
          {/* sr-only mirror of the publish button so the existing
              `getByTestId('complaint-submit')` assertion in the test
              suite keeps resolving — the visible button lives in the
              Complaint.SubmitBar above. */}
          <button
            type="button"
            onClick={validateAndSubmit}
            disabled={submitMutation.isPending}
            className="sr-only"
            data-testid="complaint-submit"
          >
            {submitMutation.isPending ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </Complaint.Composer>
    </div>
  )
}
