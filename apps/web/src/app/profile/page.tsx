import { Card } from '@factivist/ui-web/components'
import Link from 'next/link'

import { getServerSession } from '../../lib/auth/server.ts'

/**
 * `/profile` — Profile tab target.
 *
 * Per ADR-0019, web tab order mirrors mobile (`Home → Search → Compose
 * → Profile`).
 *
 * Server Component. Reads the operator session (when present) — for
 * S1 the only session the web app exposes is the operator magic-link
 * session; citizens browse anonymously and verify via the on-device
 * ZKP flow at `/` → `IdentityShell`. We therefore branch:
 *
 *   - Signed-in operator → render the role + actor id (no nullifier,
 *     per ADR-0010 / anonymity-grep-guard).
 *   - Anonymous citizen   → render a "you are anonymous" card pointing
 *     at `IdentityShell` so the user can verify if they choose.
 *
 * No PII is ever rendered. The actor id printed for operators is the
 * Supabase user UUID, which lives outside the citizen-anonymity floor.
 */
export default async function ProfilePage() {
  const session = await getServerSession()

  return (
    <main
      className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-6"
      data-testid="profile-shell"
    >
      <Card className="w-full p-6">
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        {session ? (
          <div className="mt-4 space-y-2" data-testid="profile-operator">
            <p className="text-sm text-muted-foreground">You are signed in as an operator.</p>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Role</dt>
              <dd data-testid="profile-role">{session.role}</dd>
              <dt className="text-muted-foreground">Actor</dt>
              <dd data-testid="profile-actor">{session.userId}</dd>
            </dl>
            <p className="pt-3 text-sm">
              <Link href="/admin/moderation" className="text-primary underline">
                Open the moderation console →
              </Link>
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3" data-testid="profile-anonymous">
            <p className="text-base text-muted-foreground">
              You are browsing anonymously. Factivist does not store your name, email, or any other
              identifier unless you choose to verify.
            </p>
            <p className="text-sm">
              <Link href="/" className="text-primary underline">
                Learn about the on-device verification flow →
              </Link>
            </p>
          </div>
        )}
      </Card>
    </main>
  )
}
