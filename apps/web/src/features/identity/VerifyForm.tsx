'use client'

import type { Groth16Proof, VerifyProofRequest, VerifyProofResponse } from '@factivist/shared/types'
import { Button } from '@factivist/ui-web/components'
import { useState } from 'react'

/**
 * Client island that submits a Groth16 proof to `/identity/verify`.
 *
 * Phase 5 wave 1 is a stub: it does NOT yet generate the proof in-browser
 * (snarkjs wiring + circuit hosting lands in a later wave). It accepts a
 * pre-generated proof envelope from `props` or from a `data-proof` payload
 * so QA/Detox can exercise the route end-to-end without a real circuit.
 */
interface VerifyFormProps {
  readonly preGeneratedProof?: VerifyProofRequest
  readonly apiBaseUrl?: string
}

type FormState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success'; handle: string }
  | { kind: 'error'; code: string; message: string }

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
        setState({ kind: 'success', handle: body.handle })
        return
      }
      setState({
        kind: 'error',
        code: body.code,
        message: body.error,
      })
    } catch (err) {
      setState({
        kind: 'error',
        code: 'NETWORK',
        message: err instanceof Error ? err.message : 'Network error',
      })
    }
  }

  return (
    <div className="flex flex-col gap-4" data-testid="verify-form">
      <Button
        onPress={onSubmit}
        isDisabled={state.kind === 'submitting'}
        data-testid="verify-submit"
      >
        {state.kind === 'submitting' ? 'Verifying…' : 'Generate & submit proof'}
      </Button>

      {state.kind === 'success' && (
        <p className="text-sm text-success" data-testid="verify-success">
          Verified — your handle is <code>{state.handle}</code>.
        </p>
      )}

      {state.kind === 'error' && (
        <p className="text-sm text-danger" data-testid="verify-error">
          {state.message} ({state.code})
        </p>
      )}
    </div>
  )
}

// Required tiny export so this file is treated as a non-empty module by ESM
// strict builders if it's tree-shaken to nothing in the future.
export type VerifyFormGroth16Proof = Groth16Proof
