'use client'

import {
  COMPLAINT_BODY_MAX,
  COMPLAINT_DISCLAIMER,
  COMPLAINT_PHOTO_MAX,
  COMPLAINT_TITLE_MAX,
  type CreateComplaintInput,
  createComplaintInputSchema,
} from '@factivist/shared/validators'
import { Button, Card, Input } from '@factivist/ui-web/components'
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

  // RHF would normally drive this; we keep state local + lean to avoid
  // adding `react-hook-form` to the web bundle before the canonical
  // package is wired. The validation source of truth is the Zod schema.
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
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

  return (
    <form onSubmit={handleSubmit} noValidate data-testid="create-complaint-form">
      <Card className="p-6">
        <h1 className="text-2xl font-semibold tracking-tight">New complaint</h1>

        <div
          role="note"
          aria-label="Disclaimer"
          className="mt-4 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm"
          data-testid="complaint-disclaimer"
        >
          <strong>Disclaimer.</strong> {COMPLAINT_DISCLAIMER}
        </div>

        <fieldset className="mt-6 flex flex-col gap-2">
          <label htmlFor="complaint-title" className="text-sm font-medium">
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
          <label htmlFor="complaint-category" className="text-sm font-medium">
            Category
          </label>
          <select
            id="complaint-category"
            value={categorySlug}
            onChange={(e) => setCategorySlug(e.target.value)}
            aria-invalid={Boolean(errors.categorySlug)}
            aria-describedby={errors.categorySlug ? 'err-category' : undefined}
            className="rounded-md border bg-background px-3 py-2 text-sm"
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
          <legend className="mb-1 text-sm font-medium">Constituency</legend>
          <p className="mb-2 text-xs text-muted-foreground">
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
          <label htmlFor="complaint-body" className="text-sm font-medium">
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
            className="rounded-md border bg-background px-3 py-2 text-sm"
            data-testid="complaint-body"
          />
          <div
            id="body-counter"
            className="text-right text-xs text-muted-foreground"
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

        <p className="mt-4 text-xs text-muted-foreground">
          Photos (up to {COMPLAINT_PHOTO_MAX}) — EXIF metadata is stripped server-side. Photo upload
          UI ships next.
        </p>

        {errors.submit ? (
          <div role="alert" className="mt-4 rounded-md bg-danger/10 p-3 text-sm text-danger">
            {errors.submit}
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="submit"
            variant="primary"
            isDisabled={submitMutation.isPending}
            data-testid="complaint-submit"
          >
            {submitMutation.isPending ? 'Publishing…' : 'Publish'}
          </Button>
        </div>
      </Card>
    </form>
  )
}
