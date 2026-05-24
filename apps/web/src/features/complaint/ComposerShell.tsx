'use client'

/**
 * Client wrapper that renders `<CreateComplaintForm />` and switches to
 * a "submissions paused" Card when the server action signals the
 * `S1_COMPLAINT_SUBMIT_OFF` feature flag.
 *
 * Mirrors the mobile composer's `submissionPaused` branch at
 * `apps/mobile/src/features/complaint/ComplaintComposer.tsx:169-185`,
 * keeping the cross-platform UX symmetric per ADR-0019.
 */

import type { CreateComplaintInput } from '@factivist/shared/validators'
import { Card } from '@factivist/ui-web/components'
import { useState } from 'react'
import { CreateComplaintForm } from './CreateComplaintForm.tsx'
import { SUBMISSION_PAUSED_MESSAGE } from './composerSignals.ts'

export interface ComposerShellProps {
  readonly action: (input: CreateComplaintInput) => Promise<{ readonly id: string }>
}

export function ComposerShell({ action }: ComposerShellProps) {
  const [paused, setPaused] = useState(false)

  const wrappedAction = async (input: CreateComplaintInput) => {
    try {
      return await action(input)
    } catch (err) {
      if (err instanceof Error && err.message === SUBMISSION_PAUSED_MESSAGE) {
        setPaused(true)
      }
      throw err
    }
  }

  if (paused) {
    return (
      <main
        className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-6"
        data-testid="composer-paused"
      >
        <Card className="w-full p-6">
          <h1 className="text-2xl font-semibold tracking-tight">Submissions are paused</h1>
          <p className="mt-3 text-base text-muted-foreground">
            Factivist has temporarily paused new complaint submissions while we sort out a
            moderation backlog. Please try again later.
          </p>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <CreateComplaintForm action={wrappedAction} />
    </main>
  )
}
