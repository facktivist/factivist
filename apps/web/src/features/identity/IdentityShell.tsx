import { VerifyForm } from './VerifyForm.tsx'

/**
 * Identity onboarding shell — Server Component.
 *
 * Renders the framing + legal copy on the server; defers the proof
 * submission (which needs Web Crypto + snarkjs) to the client island.
 * Per [[ADR-010]] this surface never asks for PII — the user supplies a
 * proof envelope, not raw Aadhaar data.
 *
 * Layout: bare `<main>` wrapper; the inner `<VerifyForm>` consumes the
 * `Onboarding.VerifyStep` compound from `@factivist/ui-web` so the
 * framing card, error surface, and status copy all match the design
 * system. The intro copy stays here (server-rendered, indexable).
 */
export function IdentityShell() {
  return (
    <main
      className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-6"
      data-testid="identity-shell"
    >
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--color-foreground)]">
          Verify your citizenship
        </h1>
        <p className="text-base text-[var(--color-muted-foreground)]">
          You will run a zero-knowledge proof on this device. Factivist never sees your name,
          Aadhaar number, address, or photo — only an opaque nullifier proving you are a unique
          Indian citizen.
        </p>
      </header>
      <VerifyForm />
    </main>
  )
}
