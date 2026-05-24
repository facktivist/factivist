import type { VerifyProofRequest, VerifyProofResponse } from '@factivist/shared/types'
import {
  setProverPlatform,
  verifyProofOnDevice,
  ZkpNotConfiguredError,
} from '@factivist/zkp-client'
import { useState } from 'react'
import { Platform, Pressable, Text, View } from 'react-native'

/**
 * Submits a pre-generated proof envelope to the API. Phase 5 wave 1 stub —
 * full Onboarding.AadhaarCapture + Onboarding.ProofProgress wiring lands in
 * a follow-up wave.
 *
 * Selects the prover backend per ADR-0018 by telling `@factivist/zkp-client`
 * which platform we're on at boot. The client otherwise has no way to know,
 * since it doesn't ship a react-native dep.
 */

interface VerifyButtonProps {
  readonly preGeneratedProof?: VerifyProofRequest
  readonly apiBaseUrl?: string
}

type State =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success'; handle: string }
  | { kind: 'error'; code: string; message: string }

// Declare platform once per app boot. Calling it again is a no-op (idempotent).
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
      // Best-effort: verify locally first so we don't burn server CPU on a
      // proof we already know is bad. Failure here is non-fatal — the server
      // re-verifies authoritatively.
      try {
        await verifyProofOnDevice(preGeneratedProof.proof, preGeneratedProof.publicSignals)
      } catch (e) {
        if (!(e instanceof ZkpNotConfiguredError)) throw e
        // No vKey on device yet — defer to server.
      }

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
      setState({ kind: 'error', code: body.code, message: body.error })
    } catch (err) {
      setState({
        kind: 'error',
        code: 'NETWORK',
        message: err instanceof Error ? err.message : 'Network error',
      })
    }
  }

  return (
    <View testID="verify-button-root">
      <Pressable
        onPress={onPress}
        disabled={state.kind === 'submitting'}
        accessibilityRole="button"
        accessibilityLabel="Generate and submit proof"
        testID="verify-submit"
      >
        <Text>{state.kind === 'submitting' ? 'Verifying…' : 'Generate & submit proof'}</Text>
      </Pressable>

      {state.kind === 'success' && (
        <Text testID="verify-success">Verified — handle {state.handle}</Text>
      )}
      {state.kind === 'error' && (
        <Text testID="verify-error">{`${state.message} (${state.code})`}</Text>
      )}
    </View>
  )
}
