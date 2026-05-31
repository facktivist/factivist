'use client'

import { FLAG_REASON_LABEL, FLAG_REASONS, type FlagReason } from '@factivist/shared/validators'
import { AlertDialog, Button } from '@factivist/ui-web/components'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'

import { apiClient } from '../../lib/api/client.ts'

/**
 * Flag-for-moderation control.
 *
 * Two-step interaction: click → reason picker → confirm. The reason list
 * is sourced from `@factivist/shared`'s `FLAG_REASONS`, which pins
 * `pii-leak` first per ADR-020 (legally most urgent — feeds the 24h NCII
 * / 36h takedown clock in ADR-014).
 *
 * HeroUI v3 AlertDialog compound surface is
 * `Trigger > Backdrop > Container > Dialog > {Header > Heading, Body, Footer}`.
 */
export interface FlagButtonProps {
  readonly complaintId: string
  readonly className?: string
}

export function FlagButton({ complaintId, className }: FlagButtonProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<FlagReason>('pii-leak')
  const [submitted, setSubmitted] = useState(false)

  const mutation = useMutation({
    mutationFn: (r: FlagReason) => apiClient.flagComplaint(complaintId, { reason: r }),
    onSuccess: () => {
      setSubmitted(true)
      setTimeout(() => setOpen(false), 800)
    },
  })

  return (
    <div className={className}>
      <AlertDialog
        isOpen={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) {
            setSubmitted(false)
            mutation.reset()
          }
        }}
      >
        <AlertDialog.Trigger>
          <Button
            variant="ghost"
            size="sm"
            data-testid={`flag-trigger-${complaintId}`}
            aria-label="Flag this complaint for moderation"
          >
            Flag
          </Button>
        </AlertDialog.Trigger>
        <AlertDialog.Backdrop>
          <AlertDialog.Container>
            <AlertDialog.Dialog>
              <AlertDialog.Header>
                <AlertDialog.Heading>Flag this complaint</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <p className="text-sm text-muted-foreground">
                  Pick the reason that best fits. Moderators see flags only, never your identity.
                </p>

                <fieldset className="mt-4">
                  <legend className="sr-only">Reason</legend>
                  <ul className="flex flex-col gap-2">
                    {FLAG_REASONS.map((r) => {
                      const id = `flag-${complaintId}-${r}`
                      return (
                        <li key={r}>
                          <label
                            htmlFor={id}
                            className="flex cursor-pointer items-start gap-2 rounded-md border p-2 text-sm hover:bg-muted"
                          >
                            <input
                              id={id}
                              type="radio"
                              name={`flag-reason-${complaintId}`}
                              value={r}
                              checked={reason === r}
                              onChange={() => setReason(r)}
                              data-testid={`flag-reason-${r}`}
                            />
                            <span>
                              <span className="font-medium">{FLAG_REASON_LABEL[r]}</span>
                              {r === 'pii-leak' ? (
                                <span className="ml-2 rounded bg-warning/20 px-1.5 py-0.5 text-xs text-warning">
                                  Priority review
                                </span>
                              ) : null}
                            </span>
                          </label>
                        </li>
                      )
                    })}
                  </ul>
                </fieldset>

                {submitted ? (
                  <p role="status" className="mt-3 text-sm text-success">
                    Flag submitted. Thank you.
                  </p>
                ) : null}
                {mutation.isError ? (
                  <p role="alert" className="mt-3 text-sm text-danger">
                    {mutation.error instanceof Error ? mutation.error.message : 'Could not flag.'}
                  </p>
                ) : null}
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <AlertDialog.CloseTrigger />
                <Button
                  variant="primary"
                  isDisabled={mutation.isPending || submitted}
                  onPress={() => mutation.mutate(reason)}
                  data-testid={`flag-submit-${complaintId}`}
                >
                  {mutation.isPending ? 'Submitting…' : 'Submit flag'}
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </div>
  )
}
