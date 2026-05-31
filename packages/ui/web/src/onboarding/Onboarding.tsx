/**
 * `Onboarding.*` compound — web (HeroUI v3).
 *
 * Implementation of the Phase 3 type contract in `Onboarding.types.ts`,
 * driven by the Claude Design prototype at
 * `docs/design/s1/handoff/product-design/factivist-s1/project/screens/web-onboarding.jsx`.
 *
 * ## Anonymity invariants (ADR-010 + ADR-003)
 *
 *   - `AadhaarCapture` returns an opaque token; raw bytes never reach React.
 *   - `SuccessConfirmation` shows the first 8 chars of the nullifier only.
 *   - No PII / fingerprints appear in any error message we render — error
 *     text comes from the caller's `OnboardingError.message` which is
 *     pre-localised + pre-scrubbed.
 *
 * ## Tokens consumed (semantic only, never primitive)
 *
 *   `--color-background`, `--color-card`, `--color-foreground`,
 *   `--color-muted`, `--color-muted-foreground`, `--color-primary`,
 *   `--color-primary-foreground`, `--color-border`, `--color-ring`,
 *   `--color-destructive`, `--color-verified`, `--space-{2,3,4,6,8}`,
 *   `--radius-{md,lg,xl}`, `--shadow-md`, `--duration-base`.
 *
 * ## Compound shape
 *
 *   `Onboarding.VerifyStep`           — top-level wrapper, slot for active step
 *   `Onboarding.AadhaarCapture`       — camera viewfinder + cancel
 *   `Onboarding.ProofProgress`        — generating / verifying / anchoring
 *   `Onboarding.SuccessConfirmation`  — handle + nullifier excerpt + CTA
 */

import type * as React from 'react'
import type { ReactNode } from 'react'

import { Button, Card, Spinner } from '../components/index.ts'
import type {
  OnboardingAadhaarCaptureProps,
  OnboardingError,
  OnboardingProofProgressProps,
  OnboardingStatus,
  OnboardingSuccessConfirmationProps,
  OnboardingVerifyStepProps,
} from './Onboarding.types.ts'

const cx = (...parts: ReadonlyArray<string | false | null | undefined>): string =>
  parts.filter((p): p is string => typeof p === 'string' && p.length > 0).join(' ')

// ─── Onboarding.VerifyStep ────────────────────────────────────────────

const isError = (
  status: OnboardingStatus | undefined,
  error: OnboardingError | undefined,
): error is OnboardingError => status === 'error' && !!error

const VerifyStep = ({
  step,
  status = 'idle',
  error,
  children,
  className,
}: OnboardingVerifyStepProps): React.JSX.Element => (
  <section
    aria-label="Citizen verification"
    data-step={step}
    data-status={status}
    className={cx(
      'flex flex-col gap-6 p-6 rounded-xl',
      'bg-[var(--color-card)] text-[var(--color-foreground)]',
      'border border-[var(--color-border)] shadow-md',
      className,
    )}
  >
    {isError(status, error) ? (
      <div
        role="alert"
        className="flex flex-col gap-1 p-4 rounded-lg border border-[var(--color-destructive)] bg-[color-mix(in_oklch,var(--color-destructive)_8%,transparent)] text-[var(--color-destructive)]"
      >
        <span className="text-xs font-mono uppercase tracking-wider">{error.code}</span>
        <span className="text-sm">{error.message}</span>
        {error.retryable ? (
          <span className="text-xs text-[var(--color-muted-foreground)]">
            You can retry this step.
          </span>
        ) : null}
      </div>
    ) : null}
    {children}
  </section>
)

// ─── Onboarding.AadhaarCapture ────────────────────────────────────────

const AadhaarCapture = ({
  onCaptured,
  onCancel,
  status = 'idle',
  error,
  className,
}: OnboardingAadhaarCaptureProps): React.JSX.Element => {
  const disabled = status === 'loading' || status === 'disabled'
  return (
    <div data-status={status} className={cx('flex flex-col gap-4', className)}>
      <section
        aria-label="Aadhaar viewfinder"
        className={cx(
          'relative aspect-[3/4] sm:aspect-video w-full rounded-lg',
          'bg-[var(--color-muted)] border border-[var(--color-border)]',
          'flex items-center justify-center',
        )}
      >
        <div
          aria-hidden="true"
          className="absolute inset-6 rounded-md border-2 border-dashed border-[var(--color-primary)] pointer-events-none"
        />
        {status === 'loading' ? (
          <Spinner aria-label="Capturing" />
        ) : (
          <span className="text-sm text-[var(--color-muted-foreground)] font-mono">
            Align the QR code inside the frame
          </span>
        )}
      </section>
      {isError(status, error) ? (
        <p role="alert" className="text-sm text-[var(--color-destructive)]">
          {error.message}
        </p>
      ) : null}
      <div className="flex gap-3 justify-end">
        <Button variant="ghost" onClick={onCancel} isDisabled={disabled}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={() => onCaptured({ opaqueToken: '' })}
          isDisabled={disabled}
        >
          {status === 'loading' ? 'Capturing…' : 'Capture'}
        </Button>
      </div>
    </div>
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
  className,
}: OnboardingProofProgressProps): React.JSX.Element => {
  const clamped = clampProgress(progress)
  const indeterminate = clamped === undefined
  const pct = indeterminate ? 0 : Math.round(clamped * 100)
  return (
    <div
      role="status"
      aria-live="polite"
      data-stage={stage}
      data-status={status}
      className={cx('flex flex-col gap-3 items-center text-center', className)}
    >
      {indeterminate ? (
        <Spinner aria-hidden="true" />
      ) : (
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          className="w-full h-2 rounded-full bg-[var(--color-muted)] overflow-hidden"
        >
          <div
            className="h-full bg-[var(--color-primary)] transition-[width] duration-[var(--duration-base)] ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      <p className="text-sm text-[var(--color-foreground)]">{STAGE_LABEL[stage]}</p>
      {!indeterminate ? (
        <span className="text-xs font-mono text-[var(--color-muted-foreground)]">{pct}%</span>
      ) : null}
    </div>
  )
}

// ─── Onboarding.SuccessConfirmation ───────────────────────────────────

const SuccessConfirmation = ({
  handle,
  nullifierExcerpt,
  onContinue,
  className,
}: OnboardingSuccessConfirmationProps): React.JSX.Element => {
  // Defence in depth: enforce the 8-char ceiling at the boundary.
  const safeExcerpt = nullifierExcerpt.slice(0, 8)
  return (
    <Card className={cx('p-6 flex flex-col gap-4', className)}>
      <div className="flex items-center gap-2 text-[var(--color-verified)]">
        <span aria-hidden="true" className="font-mono text-xs uppercase tracking-wider">
          Verified
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-[var(--color-muted-foreground)] font-mono uppercase tracking-wider">
          Your anonymous handle
        </span>
        <span className="text-xl font-semibold">{handle}</span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-[var(--color-muted-foreground)] font-mono uppercase tracking-wider">
          Nullifier (first 8 chars only)
        </span>
        <code className="text-sm font-mono text-[var(--color-foreground)]">{safeExcerpt}…</code>
      </div>
      <Button variant="primary" onClick={onContinue}>
        Continue to feed
      </Button>
    </Card>
  )
}

// ─── Compound export ──────────────────────────────────────────────────

/**
 * Compound namespace. Consumers reference via dot-notation:
 *
 *   <Onboarding.VerifyStep step={…} onStepChange={…}>
 *     <Onboarding.AadhaarCapture … />
 *   </Onboarding.VerifyStep>
 */
export const Onboarding = {
  VerifyStep,
  AadhaarCapture,
  ProofProgress,
  SuccessConfirmation,
} as const

export type OnboardingCompound = typeof Onboarding

// Re-export individual components for tree-shake-friendly imports.
export {
  AadhaarCapture as OnboardingAadhaarCapture,
  ProofProgress as OnboardingProofProgress,
  SuccessConfirmation as OnboardingSuccessConfirmation,
  VerifyStep as OnboardingVerifyStep,
}

// Helper used by both the compound + tests to ensure the children slot
// is allowed any node shape without leaking a `ReactNode` import to
// consumers.
export type OnboardingChildren = ReactNode
