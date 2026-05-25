'use client'

import type { Groth16Proof, VerifyProofRequest, VerifyProofResponse } from '@factivist/shared/types'
import { Button } from '@factivist/ui-web/components'
import { Onboarding } from '@factivist/ui-web/onboarding'
import { useState } from 'react'

/**
 * Client island that submits a Groth16 proof to `/identity/verify`.
 *
 * Phase 5 wave 1 is a stub: it does NOT yet generate the proof in-browser
 * (snarkjs wiring + circuit hosting lands in a later wave). It accepts a
 * pre-generated proof envelope from `props` or from a `data-proof` payload
 * so QA/Detox can exercise the route end-to-end without a real circuit.
 *
 * Frames itself in the `Onboarding.VerifyStep` compound so loading,
 * error, and success states render with design-system tokens + a11y
 * affordances. On success it renders `Onboarding.SuccessConfirmation`
 * with the citizen's anonymous handle + first-8-char nullifier excerpt.
 */
interface VerifyFormProps {
  readonly preGeneratedProof?: VerifyProofRequest
  readonly apiBaseUrl?: string
}

type FormState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success'; handle: string; nullifierExcerpt: string }
  | { kind: 'error'; code: string; message: string }

const toOnboardingStep = (s: FormState): 'intro' | 'proof-verifying' | 'success' | 'error' => {
  switch (s.kind) {
    case 'submitting':
      return 'proof-verifying'
    case 'success':
      return 'success'
    case 'error':
      return 'error'
    default:
      return 'intro'
  }
}

const toOnboardingStatus = (s: FormState): 'idle' | 'loading' | 'success' | 'error' => {
  switch (s.kind) {
    case 'submitting':
      return 'loading'
    case 'success':
      return 'success'
    case 'error':
      return 'error'
    default:
      return 'idle'
  }
}

export function VerifyForm({ preGeneratedProof, apiBaseUrl = '' }: VerifyFormProps) {
  const [state, setState] = useState<FormState>({ kind: 'idle' })

  const onSubmit = async () => {
    if (!preGeneratedProof) {
      setState({
        kind: 'error',
        code: 'NO_PROOF',
        message: 'In-browser proof generation lands in a follow-up wave.',
      })
      return
    }
    setState({ kind: 'submitting' })
    try {
      const res = await fetch(`${apiBaseUrl}/identity/verify`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(preGeneratedProof),
      })
      const body = (await res.json()) as VerifyProofResponse
      if (body.verified) {
        const [nullifier] = preGeneratedProof.publicSignals
        setState({
          kind: 'success',
          handle: body.handle,
          nullifierExcerpt: nullifier.slice(0, 8),
        })
        return
      }
      setState({ kind: 'error', code: body.code, message: body.error })
    } catch (err) {
      setState({
        kind: 'error',
        code: 'NETWORK',
        message: err instanceof Error ? err.message : 'Network error',
      })
    }
  }

  const errorPayload =
    state.kind === 'error'
      ? { code: state.code, message: state.message, retryable: state.code !== 'NO_PROOF' }
      : undefined

  return (
    <div data-testid="verify-form">
      <Onboarding.VerifyStep
        step={toOnboardingStep(state)}
        status={toOnboardingStatus(state)}
        error={errorPayload}
        onStepChange={() => {
          // No step-machine yet — Phase 5 wave 3 will wire a stepper.
        }}
      >
        {state.kind === 'success' ? (
          <Onboarding.SuccessConfirmation
            handle={state.handle}
            nullifierExcerpt={state.nullifierExcerpt}
            onContinue={() => {
              // Caller wires the next route (feed) once the success state
              // is observed by a higher-level handler. Phase 5 wave 3.
            }}
          />
        ) : (
          <Button
            onPress={onSubmit}
            isDisabled={state.kind === 'submitting'}
            data-testid="verify-submit"
          >
            {state.kind === 'submitting' ? 'Verifying…' : 'Generate & submit proof'}
          </Button>
        )}
        {state.kind === 'success' ? (
          <p className="sr-only" data-testid="verify-success">
            Verified — your handle is {state.handle}.
          </p>
        ) : null}
        {state.kind === 'error' ? (
          <p className="sr-only" data-testid="verify-error">
            {state.message} ({state.code})
          </p>
        ) : null}
      </Onboarding.VerifyStep>
    </div>
  )
}

// Required tiny export so this file is treated as a non-empty module by ESM
// strict builders if it's tree-shaken to nothing in the future.
export type VerifyFormGroth16Proof = Groth16Proof
