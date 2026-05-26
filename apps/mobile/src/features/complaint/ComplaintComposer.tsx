import {
  COMPLAINT_BODY_MAX,
  COMPLAINT_DISCLAIMER,
  COMPLAINT_TITLE_MAX,
  type CreateComplaintInput,
  createComplaintInputSchema,
} from '@factivist/shared/validators'
import { Button, Card, Input, TextArea, TextField } from '@factivist/ui-native/components'
import { useMutation, useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Image, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ApiError, apiClient } from '../../lib/api/client.ts'

import {
  ConstituencyPickerNative,
  type ConstituencySelection,
} from './ConstituencyPicker.native.tsx'
import { MAX_PHOTOS, usePhotoCapture } from './usePhotoCapture.ts'
import { useTusUpload } from './useTusUpload.ts'

/**
 * Mobile complaint composer.
 *
 * Glues ConstituencyPicker + categories + title + body + photo capture +
 * tus upload + RHF + `apiClient.createComplaint`. Parity with
 * `apps/web/src/features/complaint/CreateComplaintForm.tsx` per ADR-019:
 * same field order, same Zod boundary, no FAB.
 *
 * Submission flow:
 *   1. RHF validates title/body/categorySlug via the shared Zod schema.
 *   2. ConstituencyPicker holds its own state; we surface a manual error
 *      if the user hasn't drilled all four levels.
 *   3. If photos exist, `useTusUpload.uploadAll(slug, ...)` runs first —
 *      we synthesise a temporary slug from the title for the storage path
 *      (real slug is server-issued on POST /complaints). Upload returns
 *      public URLs which we pass to `createComplaint`.
 *   4. On 503 with `S1_COMPLAINT_SUBMIT_OFF`, render the "paused" notice
 *      so users don't hammer retry.
 *
 * The 35-category list (ATID-COMPL-003) renders as a press-list since
 * HeroUI Native ships a Picker primitive separately; we keep this view
 * self-contained.
 */

interface ComposerFormFields {
  title: string
  body: string
  categorySlug: string
}

const initialConstituency: ConstituencySelection = {}

type CompleteConstituency = ConstituencySelection &
  Required<Pick<ConstituencySelection, 'stateCode' | 'districtCode' | 'pcCode' | 'acCode'>>

const isConstituencyComplete = (sel: ConstituencySelection): sel is CompleteConstituency =>
  Boolean(sel.stateCode && sel.districtCode && sel.pcCode && sel.acCode)

const tempSlugFromTitle = (title: string): string => {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/gu, '-')
    .replace(/-+/gu, '-')
    .replace(/^-|-$/gu, '')
    .slice(0, 40)
  const suffix = Math.floor(Math.random() * 36 ** 6)
    .toString(36)
    .padStart(6, '0')
  return `${base || 'draft'}-${suffix}`
}

interface ComplaintComposerProps {
  /** Citizen nullifier — forwarded to upload-sign and POST /complaints. */
  readonly nullifier?: string
}

export function ComplaintComposer({ nullifier }: ComplaintComposerProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ComposerFormFields>({
    defaultValues: { title: '', body: '', categorySlug: '' },
    mode: 'onSubmit',
  })

  const [constituency, setConstituency] = useState<ConstituencySelection>(initialConstituency)
  const [constituencyError, setConstituencyError] = useState<string | undefined>(undefined)
  const [submitError, setSubmitError] = useState<string | undefined>(undefined)
  const [submissionPaused, setSubmissionPaused] = useState(false)

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiClient.listCategories(),
    staleTime: 60 * 60_000,
  })
  const categories = categoriesQuery.data ?? []

  const photoCapture = usePhotoCapture()
  const tusUpload = useTusUpload({ nullifier })

  const watchedTitle = watch('title')
  const watchedBody = watch('body')
  const watchedCategorySlug = watch('categorySlug')

  const mutation = useMutation({
    mutationFn: async (input: CreateComplaintInput) => apiClient.createComplaint(input),
    onSuccess: ({ id }) => {
      router.push(`/complaint/${id}` as never)
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError && err.status === 503) {
        const body = err.body as { code?: string } | undefined
        if (body?.code === 'S1_COMPLAINT_SUBMIT_OFF') {
          setSubmissionPaused(true)
          return
        }
      }
      setSubmitError(err instanceof Error ? err.message : 'Submission failed.')
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(undefined)
    setConstituencyError(undefined)

    if (!isConstituencyComplete(constituency)) {
      setConstituencyError('Pick state, district, PC, and AC.')
      return
    }

    let photoUrls: string[] = []
    if (photoCapture.photos.length > 0) {
      try {
        const draftSlug = tempSlugFromTitle(values.title)
        photoUrls = await tusUpload.uploadAll(draftSlug, photoCapture.photos)
      } catch (err) {
        setSubmitError(
          err instanceof Error ? `Photo upload failed: ${err.message}` : 'Photo upload failed.',
        )
        return
      }
    }

    const candidate = {
      title: values.title,
      body: values.body,
      categorySlug: values.categorySlug,
      stateCode: constituency.stateCode,
      districtCode: constituency.districtCode,
      pcCode: constituency.pcCode,
      acCode: constituency.acCode,
      photoUrls,
    }
    const parsed = createComplaintInputSchema.safeParse(candidate)
    if (!parsed.success) {
      setSubmitError(parsed.error.issues[0]?.message ?? 'Validation failed.')
      return
    }
    mutation.mutate(parsed.data)
  })

  if (submissionPaused) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']} testID="composer-paused">
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 16 }}>
          <Card>
            <Card.Body>
              <Card.Title>Submissions are paused</Card.Title>
              <Card.Description>
                Factivist has temporarily paused new complaint submissions while we sort out a
                moderation backlog. Please try again later.
              </Card.Description>
            </Card.Body>
          </Card>
        </ScrollView>
      </SafeAreaView>
    )
  }

  const photoSlotsRemaining = MAX_PHOTOS - photoCapture.photos.length

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']} testID="complaint-composer">
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 16, gap: 16 }}>
        <Card>
          <Card.Header>
            <Card.Title>New complaint</Card.Title>
          </Card.Header>
          <Card.Body>
            <View
              accessibilityRole="alert"
              className="mb-4 rounded-md border border-warning-300 bg-warning-100 p-3"
            >
              <Text className="text-sm">
                <Text className="font-semibold">Disclaimer. </Text>
                {COMPLAINT_DISCLAIMER}
              </Text>
            </View>

            <Text className="mb-1 text-sm font-medium">Title</Text>
            <Controller
              control={control}
              name="title"
              rules={{
                required: 'Title is required.',
                maxLength: { value: COMPLAINT_TITLE_MAX, message: 'Title too long.' },
              }}
              render={({ field: { value, onChange, onBlur } }) => (
                <TextField>
                  <Input
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    maxLength={COMPLAINT_TITLE_MAX}
                    placeholder="What is the complaint about?"
                    testID="complaint-title"
                    accessibilityLabel="Complaint title"
                  />
                </TextField>
              )}
            />
            {errors.title ? (
              <Text accessibilityRole="alert" className="mt-1 text-sm text-destructive">
                {errors.title.message}
              </Text>
            ) : null}

            <Text className="mt-4 mb-1 text-sm font-medium">Category</Text>
            <Controller
              control={control}
              name="categorySlug"
              rules={{ required: 'Pick a category.' }}
              render={({ field: { value, onChange } }) => (
                <View className="flex-row flex-wrap gap-2">
                  {categories.length === 0 ? (
                    <Text className="text-sm text-muted-foreground">Loading categories…</Text>
                  ) : null}
                  {categories.map((c) => {
                    const selected = value === c.slug
                    return (
                      <Pressable
                        key={c.slug}
                        onPress={() => onChange(c.slug)}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        testID={`category-${c.slug}`}
                        className={`rounded-full border px-3 py-1 ${
                          selected ? 'border-blue-600 bg-blue-50' : 'border-zinc-300'
                        }`}
                      >
                        <Text className="text-sm">{c.label}</Text>
                      </Pressable>
                    )
                  })}
                </View>
              )}
            />
            {errors.categorySlug ? (
              <Text accessibilityRole="alert" className="mt-1 text-sm text-destructive">
                {errors.categorySlug.message}
              </Text>
            ) : null}

            <Text className="mt-4 mb-1 text-sm font-medium">Constituency</Text>
            <Text className="mb-2 text-xs text-muted-foreground">
              Manual pick — no GPS or location services used.
            </Text>
            <ConstituencyPickerNative value={constituency} onChange={setConstituency} />
            {constituencyError ? (
              <Text accessibilityRole="alert" className="mt-1 text-sm text-destructive">
                {constituencyError}
              </Text>
            ) : null}

            <Text className="mt-4 mb-1 text-sm font-medium">Body</Text>
            <Controller
              control={control}
              name="body"
              rules={{
                required: 'Body is required.',
                maxLength: { value: COMPLAINT_BODY_MAX, message: 'Body too long.' },
              }}
              render={({ field: { value, onChange, onBlur } }) => (
                <TextField>
                  <TextArea
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    numberOfLines={6}
                    maxLength={COMPLAINT_BODY_MAX}
                    placeholder="Describe the issue in your own words."
                    testID="complaint-body"
                    accessibilityLabel="Complaint body"
                  />
                </TextField>
              )}
            />
            <Text className="mt-1 text-right text-xs text-muted-foreground" testID="body-counter">
              {watchedBody.length}/{COMPLAINT_BODY_MAX}
            </Text>
            {errors.body ? (
              <Text accessibilityRole="alert" className="mt-1 text-sm text-destructive">
                {errors.body.message}
              </Text>
            ) : null}

            <Text className="mt-4 mb-1 text-sm font-medium">
              Photos ({photoCapture.photos.length}/{MAX_PHOTOS})
            </Text>
            <View className="flex-row flex-wrap gap-2" testID="photo-tray">
              {photoCapture.photos.map((p) => (
                <View key={p.uri} className="relative">
                  <Image
                    source={{ uri: p.uri }}
                    style={{ width: 88, height: 88, borderRadius: 6 }}
                    testID={`photo-thumb-${p.uri}`}
                  />
                  <Pressable
                    onPress={() => photoCapture.removePhoto(p.uri)}
                    accessibilityRole="button"
                    accessibilityLabel="Remove photo"
                    className="absolute right-1 top-1 rounded-full bg-zinc-900/70 px-2"
                    testID={`photo-remove-${p.uri}`}
                  >
                    <Text className="text-xs text-white">×</Text>
                  </Pressable>
                </View>
              ))}
            </View>
            {photoSlotsRemaining > 0 ? (
              <View className="mt-2 flex-row gap-2">
                <Button
                  variant="secondary"
                  onPress={photoCapture.pickFromLibrary}
                  isDisabled={photoCapture.isCapturing}
                  testID="photo-pick"
                >
                  <Button.Label>Pick from library</Button.Label>
                </Button>
                <Button
                  variant="secondary"
                  onPress={photoCapture.takePhoto}
                  isDisabled={photoCapture.isCapturing}
                  testID="photo-camera"
                >
                  <Button.Label>Take photo</Button.Label>
                </Button>
              </View>
            ) : null}
            {photoCapture.error ? (
              <Text accessibilityRole="alert" className="mt-1 text-sm text-destructive">
                {photoCapture.error}
              </Text>
            ) : null}
            {tusUpload.isUploading ? (
              <Text className="mt-2 text-xs text-muted-foreground" testID="photo-uploading">
                Uploading photos…
              </Text>
            ) : null}

            {submitError ? (
              <View
                accessibilityRole="alert"
                className="mt-4 rounded-md border border-destructive bg-destructive/10 p-3"
              >
                <Text className="text-sm text-destructive">{submitError}</Text>
              </View>
            ) : null}
          </Card.Body>
          <Card.Footer>
            <Button
              variant="primary"
              onPress={onSubmit}
              isDisabled={
                mutation.isPending ||
                tusUpload.isUploading ||
                !watchedTitle ||
                !watchedBody ||
                !watchedCategorySlug
              }
              testID="complaint-submit"
            >
              <Button.Label>
                {mutation.isPending || tusUpload.isUploading ? 'Publishing…' : 'Publish'}
              </Button.Label>
            </Button>
          </Card.Footer>
        </Card>
      </ScrollView>
    </SafeAreaView>
  )
}
