import type { VerifyProofRequest, VerifyProofResponse } from '@factivist/shared/types'
import { Onboarding } from '@factivist/ui-native/onboarding'
import {
  setProverPlatform,
  verifyProofOnDevice,
  ZkpNotConfiguredError,
} from '@factivist/zkp-client'
import { useState } from 'react'
import { Platform, Pressable, Text, View } from 'react-native'

/**
 * Submits a pre-generated proof envelope to the API. Phase 5 wave 1
 * stub — full Onboarding.AadhaarCapture + Onboarding.ProofProgress
 * wiring lands in a follow-up wave. This commit migrates the framing
 * onto Onboarding.VerifyStep so loading + error + success states
 * render with design-system tokens; on success the
 * Onboarding.SuccessConfirmation slot shows the handle + first-8
 * nullifier excerpt.
 *
 * Selects the prover backend per ADR-0018 by telling
 * `@factivist/zkp-client` which platform we're on at boot.
 */

interface VerifyButtonProps {
  readonly preGeneratedProof?: VerifyProofRequest
  readonly apiBaseUrl?: string
}

type State =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success'; handle: string; nullifierExcerpt: string }
  | { kind: 'error'; code: string; message: string }

const toStep = (s: State): 'intro' | 'proof-verifying' | 'success' | 'error' => {
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

const toStatus = (s: State): 'idle' | 'loading' | 'success' | 'error' => {
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

// Declare platform once per app boot. Idempotent.
setProverPlatform(Platform.OS === 'ios' ? 'ios' : 'android')

export function VerifyButton({ preGeneratedProof, apiBaseUrl = '' }: VerifyButtonProps) {
  const [state, setState] = useState<State>({ kind: 'idle' })

  const onPress = async () => {
    if (!preGeneratedProof) {
      setState({
        kind: 'error',
        code: 'NO_PROOF',
        message: 'On-device proof generation lands in a follow-up wave.',
      })
      return
    }
    setState({ kind: 'submitting' })
    try {
      // Best-effort: verify locally first so we don't burn server CPU on
      // a proof we already know is bad. Failure here is non-fatal — the
      // server re-verifies authoritatively.
      try {
        await verifyProofOnDevice(preGeneratedProof.proof, preGeneratedProof.publicSignals)
      } catch (e) {
        if (!(e instanceof ZkpNotConfiguredError)) throw e
      }

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
    <View testID="verify-button-root">
      <Onboarding.VerifyStep
        step={toStep(state)}
        status={toStatus(state)}
        error={errorPayload}
        onStepChange={() => {
          /* no-op until a stepper machine ships */
        }}
        testID="verify-step"
      >
        {state.kind === 'success' ? (
          <Onboarding.SuccessConfirmation
            handle={state.handle}
            nullifierExcerpt={state.nullifierExcerpt}
            onContinue={() => {
              /* caller wires the next route */
            }}
            testID="verify-success-card"
          />
        ) : (
          <Pressable
            onPress={onPress}
            disabled={state.kind === 'submitting'}
            accessibilityRole="button"
            accessibilityLabel="Generate and submit proof"
            testID="verify-submit"
          >
            <Text>{state.kind === 'submitting' ? 'Verifying…' : 'Generate & submit proof'}</Text>
          </Pressable>
        )}
        {state.kind === 'success' ? (
          <Text testID="verify-success">Verified — handle {state.handle}</Text>
        ) : null}
        {state.kind === 'error' ? (
          <Text testID="verify-error">{`${state.message} (${state.code})`}</Text>
        ) : null}
      </Onboarding.VerifyStep>
    </View>
  )
}
