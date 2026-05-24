'use client'

import { type ModerationDecision, moderationDecisionSchema } from '@factivist/shared/validators'
import { Button, Card } from '@factivist/ui-web/components'
import { useState, useTransition } from 'react'

import type { DecisionActionResult } from './moderationActions.ts'

/**
 * Server-action signature bound by the parent Server Component.
 *
 * The parent uses `submitModerationDecision.bind(null, caseId)` so this
 * client component only needs the raw payload — it never sees a
 * client-supplied `caseId`. Defence in depth: even if a tampered client
 * tried to send a different id, the bound action ignores it.
 */
export type DecideAction = (rawInput: unknown) => Promise<DecisionActionResult>

export interface ModerationDecisionFormProps {
  readonly caseId: string
  readonly action: DecideAction
}

type Decision = ModerationDecision['decision']

interface FormErrors {
  decision?: string
  rationale?: string
  submit?: string
}

const DECISION_BUTTONS: ReadonlyArray<{
  readonly decision: Decision
  readonly label: string
  readonly description: string
}> = [
  {
    decision: 'approve',
    label: 'Approve',
    description: 'Keep the target visible. The complaint remains public.',
  },
  {
    decision: 'remove',
    label: 'Remove',
    description: 'Retire the target. The complaint is hidden from the public feed.',
  },
  {
    decision: 'escalate',
    label: 'Escalate',
    description: 'Route to the Grievance Officer for further review.',
  },
]

export function ModerationDecisionForm({ caseId, action }: ModerationDecisionFormProps) {
  const [decision, setDecision] = useState<Decision | null>(null)
  const [rationale, setRationale] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [pending, startTransition] = useTransition()

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrors({})

    if (decision === null) {
      setErrors({ decision: 'Pick a decision before submitting.' })
      return
    }

    // Client-side parity validation. The server action re-runs this
    // parse authoritatively; this is purely for fast UX feedback.
    const parsed = moderationDecisionSchema.safeParse({ decision, rationale })
    if (!parsed.success) {
      const next: FormErrors = {}
      for (const issue of parsed.error.issues) {
        const path = issue.path[0]
        if (path === 'rationale') next.rationale = issue.message
        if (path === 'decision') next.decision = issue.message
      }
      setErrors(next)
      return
    }

    startTransition(async () => {
      const result = await action(parsed.data)
      // On success, the server action `redirect()`s — control never
      // returns. We only land here on a typed failure.
      if (!result.ok) {
        if (result.code === 'validation') {
          setErrors({ rationale: result.message })
        } else {
          setErrors({ submit: result.message })
        }
      }
    })
  }

  const rationaleId = `decision-rationale-${caseId}`
  const decisionGroupId = `decision-group-${caseId}`

  return (
    <Card className="p-6" data-testid="decision-form">
      <form onSubmit={handleSubmit} noValidate>
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-medium" id={decisionGroupId}>
            Decision
          </legend>
          <div
            className="grid gap-2 sm:grid-cols-3"
            role="radiogroup"
            aria-labelledby={decisionGroupId}
            aria-invalid={Boolean(errors.decision)}
            aria-describedby={errors.decision ? 'err-decision' : undefined}
          >
            {DECISION_BUTTONS.map((opt) => {
              const selected = decision === opt.decision
              return (
                <label
                  key={opt.decision}
                  className={`flex cursor-pointer flex-col gap-1 rounded-md border p-3 text-sm ${
                    selected ? 'border-primary bg-primary/5' : 'border-divider hover:bg-default-50'
                  }`}
                  data-testid={`decision-option-${opt.decision}`}
                >
                  <input
                    type="radio"
                    name={`decision-${caseId}`}
                    value={opt.decision}
                    checked={selected}
                    onChange={() => setDecision(opt.decision)}
                    className="sr-only"
                    data-testid={`decision-input-${opt.decision}`}
                  />
                  <span className="font-medium">{opt.label}</span>
                  <span className="text-xs text-muted-foreground">{opt.description}</span>
                </label>
              )
            })}
          </div>
          {errors.decision ? (
            <p id="err-decision" role="alert" className="text-sm text-danger">
              {errors.decision}
            </p>
          ) : null}
        </fieldset>

        <fieldset className="mt-6 flex flex-col gap-2">
          <label htmlFor={rationaleId} className="text-sm font-medium">
            Rationale
          </label>
          <textarea
            id={rationaleId}
            rows={4}
            maxLength={500}
            required
            value={rationale}
            onChange={(event) => setRationale(event.target.value)}
            aria-invalid={Boolean(errors.rationale)}
            aria-describedby={errors.rationale ? 'err-rationale' : 'rationale-help'}
            className="rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Explain why. Recorded in the append-only audit log per ADR-0015."
            data-testid="decision-rationale"
          />
          <p id="rationale-help" className="text-xs text-muted-foreground">
            Required. Persisted with the audit row — never paste PII.
          </p>
          {errors.rationale ? (
            <p id="err-rationale" role="alert" className="text-sm text-danger">
              {errors.rationale}
            </p>
          ) : null}
        </fieldset>

        {errors.submit ? (
          <div
            role="alert"
            className="mt-4 rounded-md bg-warning/10 p-3 text-sm text-warning-foreground"
            data-testid="decision-submit-error"
          >
            {errors.submit}
          </div>
        ) : null}

        <div className="mt-6 flex justify-end">
          <Button
            type="submit"
            variant="primary"
            isDisabled={pending}
            data-testid="decision-submit"
          >
            {pending ? 'Submitting…' : 'Record decision'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
