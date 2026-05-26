import { Legal } from '@factivist/ui-web/legal'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { findLegalEntry, isLegalPageKind } from '../registry.ts'

/**
 * `/legal/[kind]` — dynamic route mounting the `Legal.Page` compound.
 *
 * The page body itself is inline JSX per `LegalPageKind`. When the
 * counsel review in Phase 9 §3 closes, the static copy moves into MDX
 * files compiled at build time; until then we keep the bodies in this
 * file so a single review pass covers every page.
 */
interface PageProps {
  readonly params: Promise<{ kind: string }>
}

export default async function LegalKindPage({ params }: PageProps) {
  const { kind } = await params
  if (!isLegalPageKind(kind)) notFound()
  const entry = findLegalEntry(kind)
  if (!entry) notFound()

  const body = renderLegalBody(kind)

  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-8" data-testid={`legal-${kind}`}>
      <Legal.Page kind={entry.kind} title={entry.title} lastUpdated={entry.lastUpdated}>
        <p
          role="status"
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)] p-3 text-xs font-mono text-[var(--color-muted-foreground)]"
        >
          Draft — pending counsel sign-off per Phase 9 §3 of the S1 action plan.
        </p>
        {body}
      </Legal.Page>
    </main>
  )
}

const renderLegalBody = (
  kind: ReturnType<typeof findLegalEntry> extends infer T
    ? T extends { kind: infer K }
      ? K
      : never
    : never,
): ReactNode => {
  switch (kind) {
    case 'tos':
      return (
        <div className="flex flex-col gap-3">
          <p>
            Factivist is a citizen-complaint platform. By submitting content you affirm that the
            facts described are true to the best of your knowledge. The platform is the host, not
            the publisher, of user-generated content (intermediary safe harbour per the IT Act 2000
            and Rules 2021).
          </p>
          <p>
            Verified citizens may file complaints, comment, and flag for moderation. The platform
            does not store names, contact details, or any other identifying metadata of verified
            citizens beyond the anonymous handle and proof nullifier (see Privacy Policy).
          </p>
          <p>
            Content that violates the manual moderation rules (spam, abuse, PII leak, off-topic,
            duplicate) is hidden from the public surfaces. Decisions are logged in the append-only
            audit log and are subject to the IT Rules 2021 grievance process.
          </p>
        </div>
      )
    case 'privacy':
      return (
        <div className="flex flex-col gap-3">
          <p>
            Factivist verifies citizenship through an on-device zero-knowledge proof (anon-aadhaar
            v3). The proof attests that the holder is a unique Indian citizen without revealing the
            Aadhaar number, name, photo, address, gender, or date of birth. Only the resulting
            nullifier and the state + AC constituency reach the server.
          </p>
          <p>
            The platform stores: the nullifier (one per citizen, used to prevent replay), the
            anonymous handle (random suffix), the constituency triple (state, district, assembly
            constituency), and an append-only log of platform actions. No real names, email
            addresses, phone numbers, IPs, or device fingerprints are stored for citizen traffic.
          </p>
          <p>
            Photos uploaded with a complaint are stripped of EXIF metadata server-side before
            persisting. The original bytes are discarded once the stripped variant is written to
            durable storage.
          </p>
          <p>
            Operator (moderator + admin) accounts are authenticated via Supabase magic-link.
            Operator audit-log entries record the actor id; no real name is stored unless the
            operator chooses to set one in their Supabase profile.
          </p>
          <p>
            DPDP §6(4) consent withdrawal is honoured per-purpose via the consent affordance on the
            onboarding screen. Grievance contact PII is erased 30 days after the grievance is
            resolved per DPDP §8(7). Audit-log entries are retained 365 days (CERT-In + DPDP §8(3)
            joint floor).
          </p>
        </div>
      )
    case 'zkp-explainer':
      return (
        <div className="flex flex-col gap-3">
          <p>
            Verification proves you are a unique Indian citizen without revealing who you are. You
            scan your Aadhaar QR code on your device; the device generates a cryptographic proof and
            a one-way nullifier. Only the proof and the nullifier reach the server.
          </p>
          <p>
            The server checks the proof against the published anon-aadhaar verification key. If
            valid, the server records the nullifier and issues an anonymous handle. The same Aadhaar
            will always derive the same nullifier — so the same citizen cannot register twice, but
            no party can link the nullifier back to an Aadhaar without re-running the proof
            generation themselves.
          </p>
          <p>
            The proof is verified on Polygon proof-of-stake on-chain (via the anon-aadhaar-managed
            verifier contract) — providing a public, tamper-evident audit trail of the verification
            set without exposing any citizen identifier.
          </p>
        </div>
      )
    case 'grievance':
      return (
        <Legal.GrievanceContact
          officer={{
            name: 'Grievance Officer (Acting)',
            designation: 'Compliance, Factivist',
            email: 'grievance@factivist.in',
            addressLines: [
              'Factivist',
              'Attn: Grievance Officer',
              'C/o Procedure',
              'Bengaluru, Karnataka, India',
            ],
          }}
          slaHours={24}
        />
      )
    case 'cookie':
      return (
        <div className="flex flex-col gap-3">
          <p>
            Factivist does not use third-party analytics or advertising cookies on citizen surfaces.
            Session cookies are signed by the platform and carry only the anonymous handle + the
            proof nullifier (server-side only) — never the underlying Aadhaar.
          </p>
          <p>
            Operator surfaces use the Supabase auth cookie. Cookies are rotated by the edge
            middleware on every operator-route hit.
          </p>
        </div>
      )
  }
}
