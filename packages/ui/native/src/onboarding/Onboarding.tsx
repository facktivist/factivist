/**
 * `Onboarding.*` compound — mobile (HeroUI Native + Uniwind).
 *
 * Mirrors `@factivist/ui-web/onboarding` in callbacks + state shape, but
 * uses React Native primitives + heroui-native and applies styling via
 * Uniwind Tailwind v4 classes at runtime in the consuming Expo app.
 *
 * Tokens consumed: identical to web; the CSS custom properties from
 * `tooling/tailwind-config/index.css` are wired into Uniwind so the same
 * `--color-card`, `--color-foreground`, etc. work via `className`.
 *
 * Anonymity invariants (ADR-010 + ADR-003): the native `AadhaarCapture`
 * uses Expo Camera with a QR scanner; the captured payload is consumed
 * in-memory by the proof generator. The compound only emits the callback —
 * actual camera wiring lives in the Expo app (Phase 5 already implements
 * it; the compound is the canonical UI shell).
 *
 * Uniwind augments `react-native` to accept `className` on every
 * primitive at runtime. This wrapper package does NOT list uniwind as a
 * runtime dep (the Expo app does), so we cast the primitives once at
 * import to props shapes that include `className`. Under Uniwind the
 * prop forwards verbatim; without Uniwind the className is simply
 * ignored (no runtime error).
 */

import type * as React from 'react'
import type { FC, ReactNode } from 'react'
import {
  ActivityIndicator,
  type PressableProps,
  Pressable as RNPressable,
  Text as RNText,
  View as RNView,
  type TextProps,
  type ViewProps,
  type ViewStyle,
} from 'react-native'

import type {
  OnboardingAadhaarCaptureProps,
  OnboardingError,
  OnboardingProofProgressProps,
  OnboardingStatus,
  OnboardingSuccessConfirmationProps,
  OnboardingVerifyStepProps,
} from './Onboarding.types.ts'

type WithChildren<P> = P & { readonly children?: ReactNode; readonly className?: string }
const View = RNView as unknown as FC<WithChildren<ViewProps>>
const Text = RNText as unknown as FC<WithChildren<TextProps>>
const Pressable = RNPressable as unknown as FC<WithChildren<PressableProps>>

const isError = (
  status: OnboardingStatus | undefined,
  error: OnboardingError | undefined,
): error is OnboardingError => status === 'error' && !!error

// ─── Onboarding.VerifyStep ────────────────────────────────────────────

const VerifyStep = ({
  step,
  status = 'idle',
  error,
  children,
  style,
  accessibilityLabel = 'Citizen verification',
  testID,
}: OnboardingVerifyStepProps): React.JSX.Element => (
  <View
    accessibilityLabel={accessibilityLabel}
    accessibilityRole="header"
    testID={testID}
    style={style as ViewStyle | undefined}
    className="flex flex-col gap-4 p-4 rounded-xl bg-card border border-border"
  >
    <View accessibilityLabel="step-status" className="flex flex-row gap-2">
      <Text className="text-xs uppercase text-muted-foreground font-mono">{step}</Text>
      <Text className="text-xs uppercase text-muted-foreground font-mono">·</Text>
      <Text className="text-xs uppercase text-muted-foreground font-mono">{status}</Text>
    </View>
    {isError(status, error) ? (
      <View
        accessibilityRole="alert"
        className="flex flex-col gap-1 p-3 rounded-lg border border-destructive"
      >
        <Text className="text-xs font-mono uppercase text-destructive">{error.code}</Text>
        <Text className="text-sm text-destructive">{error.message}</Text>
        {error.retryable ? (
          <Text className="text-xs text-muted-foreground">You can retry this step.</Text>
        ) : null}
      </View>
    ) : null}
    {children}
  </View>
)

// ─── Onboarding.AadhaarCapture ────────────────────────────────────────

const AadhaarCapture = ({
  onCaptured,
  onCancel,
  status = 'idle',
  error,
  style,
  accessibilityLabel = 'Aadhaar capture',
  testID,
}: OnboardingAadhaarCaptureProps): React.JSX.Element => {
  const disabled = status === 'loading' || status === 'disabled'
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={style as ViewStyle | undefined}
      className="flex flex-col gap-4"
    >
      <View
        accessibilityLabel="Aadhaar viewfinder"
        className="aspect-square w-full rounded-lg bg-muted border border-border items-center justify-center"
      >
        {status === 'loading' ? (
          <ActivityIndicator accessibilityLabel="Capturing" />
        ) : (
          <Text className="text-sm text-muted-foreground font-mono">
            Align the QR code inside the frame
          </Text>
        )}
      </View>
      {isError(status, error) ? (
        <Text accessibilityRole="alert" className="text-sm text-destructive">
          {error.message}
        </Text>
      ) : null}
      <View className="flex flex-row gap-3 justify-end">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={onCancel}
          className="px-4 py-2 rounded-md border border-border"
          testID={testID ? `${testID}-cancel` : undefined}
        >
          <Text className="text-sm text-foreground">Cancel</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={status === 'loading' ? 'Capturing…' : 'Capture'}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={() => onCaptured({ opaqueToken: '' })}
          className="px-4 py-2 rounded-md bg-primary"
          testID={testID ? `${testID}-capture` : undefined}
        >
          <Text className="text-sm text-primary-foreground">
            {status === 'loading' ? 'Capturing…' : 'Capture'}
          </Text>
        </Pressable>
      </View>
    </View>
  )
}

// ─── Onboarding.ProofProgress ─────────────────────────────────────────

const STAGE_LABEL: Record<OnboardingProofProgressProps['stage'], string> = {
  generating: 'Generating zero-knowledge proof on this device',
  verifying: 'Verifying proof',
  anchoring: 'Anchoring nullifier on Polygon',
}

const clampProgress = (p: number | undefined): number | undefined => {
  if (p === undefined) return undefined
  if (Number.isNaN(p)) return undefined
  if (p < 0) return 0
  if (p > 1) return 1
  return p
}

const ProofProgress = ({
  progress,
  stage,
  status = 'loading',
  style,
  accessibilityLabel,
  testID,
}: OnboardingProofProgressProps): React.JSX.Element => {
  const clamped = clampProgress(progress)
  const indeterminate = clamped === undefined
  const pct = indeterminate ? 0 : Math.round(clamped * 100)
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? STAGE_LABEL[stage]}
      accessibilityValue={indeterminate ? undefined : { min: 0, max: 100, now: pct }}
      testID={testID}
      style={style as ViewStyle | undefined}
      className="flex flex-col gap-3 items-center"
    >
      {indeterminate ? (
        <ActivityIndicator accessibilityLabel={STAGE_LABEL[stage]} />
      ) : (
        <View className="w-full h-2 rounded-full bg-muted overflow-hidden">
          <View className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </View>
      )}
      <Text className="text-sm text-foreground">{STAGE_LABEL[stage]}</Text>
      {!indeterminate ? (
        <Text className="text-xs font-mono text-muted-foreground">{pct}%</Text>
      ) : null}
      <View accessibilityLabel="status" className="hidden">
        <Text>{status}</Text>
      </View>
    </View>
  )
}

// ─── Onboarding.SuccessConfirmation ───────────────────────────────────

const SuccessConfirmation = ({
  handle,
  nullifierExcerpt,
  onContinue,
  style,
  accessibilityLabel = 'Citizen verified',
  testID,
}: OnboardingSuccessConfirmationProps): React.JSX.Element => {
  const safeExcerpt = nullifierExcerpt.slice(0, 8)
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={style as ViewStyle | undefined}
      className="p-6 flex flex-col gap-4 rounded-xl bg-card border border-border"
    >
      <Text className="text-xs uppercase tracking-wider font-mono text-verified">Verified</Text>
      <View className="flex flex-col gap-1">
        <Text className="text-xs uppercase tracking-wider font-mono text-muted-foreground">
          Your anonymous handle
        </Text>
        <Text className="text-xl font-semibold text-foreground">{handle}</Text>
      </View>
      <View className="flex flex-col gap-1">
        <Text className="text-xs uppercase tracking-wider font-mono text-muted-foreground">
          Nullifier (first 8 chars only)
        </Text>
        <Text className="text-sm font-mono text-foreground">{safeExcerpt}…</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue to feed"
        onPress={onContinue}
        className="px-4 py-3 rounded-md bg-primary"
        testID={testID ? `${testID}-continue` : undefined}
      >
        <Text className="text-sm text-primary-foreground text-center">Continue to feed</Text>
      </Pressable>
    </View>
  )
}

// ─── Compound export ──────────────────────────────────────────────────

export const Onboarding = {
  VerifyStep,
  AadhaarCapture,
  ProofProgress,
  SuccessConfirmation,
} as const

export type OnboardingCompound = typeof Onboarding

export {
  AadhaarCapture as OnboardingAadhaarCapture,
  ProofProgress as OnboardingProofProgress,
  SuccessConfirmation as OnboardingSuccessConfirmation,
  VerifyStep as OnboardingVerifyStep,
}
