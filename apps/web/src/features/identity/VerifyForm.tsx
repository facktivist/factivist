'use client'

import type { Groth16Proof, VerifyProofRequest, VerifyProofResponse } from '@factivist/shared/types'
import { Button } from '@factivist/ui-web/components'
import { Onboarding } from '@factivist/ui-web/onboarding'
import { useState } from 'react'

/**
 * Client island that drives the onboarding step machine
 * (`intro → aadhaar-capture → proof-generating → proof-verifying →
 * success | error`) and submits the resulting Groth16 proof to
 * `/identity/verify`.
 *
 * The in-browser proof generator (snarkjs + rapidsnark wasm) lands in
 * Phase 9 §1. Until then the form accepts a `preGeneratedProof` so QA
 * + Detox can exercise the full flow end-to-end; real users hit a
 * NO_PROOF surface on the generating step until the upstream wires up.
 *
 * Anonymity invariants (ADR-010 + ADR-003) honoured at every slot:
 *   - `AadhaarCapture` returns an opaque token; raw image bytes never
 *     reach React state (the caller's onCaptured fires with a dummy
 *     token in the wave-1 stub, mirroring the real shape).
 *   - `SuccessConfirmation` renders the first 8 chars of the nullifier
 *     only — the slice is enforced both here and inside the compound.
 */
interface VerifyFormProps {
  /** When supplied, the form skips AadhaarCapture and goes straight
   *  through generating → verifying. Used by QA / Detox to validate
   *  the full step machine without a live circuit. */
  readonly preGeneratedProof?: VerifyProofRequest
  readonly apiBaseUrl?: string
  /** Fired when the user clicks "Continue" on the success step. */
  readonly onComplete?: (handle: string) => void
}

type FormState =
  | { kind: 'intro' }
  | { kind: 'aadhaar-capture' }
  | { kind: 'proof-generating' }
  | { kind: 'proof-verifying' }
  | { kind: 'success'; handle: string; nullifierExcerpt: string }
  | { kind: 'error'; code: string; message: string; retryable: boolean }

const FINAL_KINDS = new Set(['success', 'error'])

const toStep = (
  s: FormState,
): 'intro' | 'aadhaar-capture' | 'proof-generating' | 'proof-verifying' | 'success' | 'error' =>
  s.kind

const toStatus = (s: FormState): 'idle' | 'loading' | 'success' | 'error' => {
  if (s.kind === 'aadhaar-capture') return 'loading'
  if (s.kind === 'proof-generating' || s.kind === 'proof-verifying') return 'loading'
  if (FINAL_KINDS.has(s.kind)) return s.kind as 'success' | 'error'
  return 'idle'
}

export function VerifyForm({ preGeneratedProof, apiBaseUrl = '', onComplete }: VerifyFormProps) {
  const [state, setState] = useState<FormState>({ kind: 'intro' })

  const runProofPipeline = async (): Promise<void> => {
    if (!preGeneratedProof) {
      setState({
        kind: 'error',
        code: 'NO_PROOF',
        message: 'In-browser proof generation lands in a follow-up wave.',
        retryable: false,
      })
      return
    }
    setState({ kind: 'proof-generating' })
    // Yield to let React paint the generating frame before we move on.
    // No real snarkjs yet — the generating step is a pass-through.
    await Promise.resolve()
    setState({ kind: 'proof-verifying' })
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
      setState({
        kind: 'error',
        code: body.code,
        message: body.error,
        retryable: true,
      })
    } catch (err) {
      setState({
        kind: 'error',
        code: 'NETWORK',
        message: err instanceof Error ? err.message : 'Network error',
        retryable: true,
      })
    }
  }

  const onStartFromIntro = async (): Promise<void> => {
    // Existing E2E + unit tests click `verify-submit` directly from the
    // intro. Without a preGeneratedProof we cannot show a real
    // viewfinder — fail fast with NO_PROOF (preserves wave-1 contract).
    if (!preGeneratedProof) {
      await runProofPipeline()
      return
    }
    setState({ kind: 'aadhaar-capture' })
  }

  const onCaptured = async (): Promise<void> => {
    // The AadhaarCapture compound returns an opaque token; we ignore
    // the value in the wave-1 stub because the proof was supplied
    // out-of-band via `preGeneratedProof`.
    await runProofPipeline()
  }

  const onCancelCapture = (): void => setState({ kind: 'intro' })

  const errorPayload =
    state.kind === 'error'
      ? { code: state.code, message: state.message, retryable: state.retryable }
      : undefined

  return (
    <div data-testid="verify-form">
      <Onboarding.VerifyStep
        step={toStep(state)}
        status={toStatus(state)}
        error={errorPayload}
        onStepChange={(_next) => {
          // The step machine is driven internally; the prop exists so
          // a future wave can hoist the controlled step into a route
          // segment. Phase 9 §1 will replace this with snarkjs wiring.
        }}
      >
        {state.kind === 'intro' ? (
          <Button
            onPress={() => {
              void onStartFromIntro()
            }}
            data-testid="verify-submit"
          >
            Generate & submit proof
          </Button>
        ) : null}

        {state.kind === 'aadhaar-capture' ? (
          <Onboarding.AadhaarCapture
            onCaptured={() => {
              void onCaptured()
            }}
            onCancel={onCancelCapture}
            status="idle"
          />
        ) : null}

        {state.kind === 'proof-generating' ? (
          <Onboarding.ProofProgress stage="generating" status="loading" />
        ) : null}

        {state.kind === 'proof-verifying' ? (
          <Onboarding.ProofProgress stage="verifying" status="loading" />
        ) : null}

        {state.kind === 'success' ? (
          <Onboarding.SuccessConfirmation
            handle={state.handle}
            nullifierExcerpt={state.nullifierExcerpt}
            onContinue={() => onComplete?.(state.handle)}
          />
        ) : null}

        {state.kind === 'error' ? (
          <Button
            variant="ghost"
            onPress={() => setState({ kind: 'intro' })}
            data-testid="verify-retry"
            isDisabled={!state.retryable}
          >
            Try again
          </Button>
        ) : null}

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
