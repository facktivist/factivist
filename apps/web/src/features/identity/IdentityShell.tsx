import { Card } from '@factivist/ui-web/components'

import { VerifyForm } from './VerifyForm.tsx'

/**
 * Identity onboarding shell — Server Component.
 *
 * Renders the static framing + legal copy on the server; defers the proof
 * submission (which needs Web Crypto + snarkjs) to the client island.
 * Per [[ADR-010]] this surface never asks for PII — the user supplies a
 * proof envelope, not raw Aadhaar data.
 */
export function IdentityShell() {
  return (
    <main
      className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-6"
      data-testid="identity-shell"
    >
      <Card className="w-full p-6">
        <h1 className="text-3xl font-bold tracking-tight">Verify your citizenship</h1>
        <p className="mt-3 text-base text-muted-foreground">
          You will run a zero-knowledge proof on this device. Factivist never sees your name,
          Aadhaar number, address, or photo — only an opaque nullifier proving you are a unique
          Indian citizen.
        </p>
      </Card>

      <Card className="w-full p-6">
        <VerifyForm />
      </Card>
    </main>
  )
}
