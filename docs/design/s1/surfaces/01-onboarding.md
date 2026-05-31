# Surface 01 — Onboarding + anoncitizen ZKP verification

> Tracking issue: [#24](https://github.com/facktivist/factivist/issues/24)
> Phase: 3 · Owner agent: `ux-lead`
> Last edited: 2026-05-23

## Summary

The first surface a visitor sees. Establishes the constitutional contract:
**every contributor is a ZKP-verified unique Indian citizen**, but Factivist
never sees their Aadhaar number, name, photo, DOB, address, PIN, or
biometrics. The user generates a Groth16 proof over their UIDAI-signed
Aadhaar QR locally (or via the server-side prover on low-tier devices), and
we record only `{ nullifier, state, district, created_at }`. Surface must
make the privacy promise legible **before** the user scans anything.

## User story

> **As a** prospective Indian citizen contributor
> **I want to** prove I am a unique adult Indian without revealing who I am
> **So that** I can submit complaints with civic legitimacy and zero personal risk.

## ATIDs gated

| ATID | What this surface must guarantee |
|------|-----------------------------------|
| `ATID-IDENT-001` | Happy path: valid Aadhaar QR → Groth16 proof → 201 + session cookie. |
| `ATID-IDENT-002` | Replay path: nullifier already on-chain → 409 with clear copy, no new row. |
| `ATID-IDENT-003` | PII floor: no Aadhaar, name, DOB, PIN, IP, device fingerprint ever leaves the device boundary. |
| `ATID-IDENT-004` | Low-tier device routing to server prover, logged with no PII. |
| `ATID-LEGAL-005` | Three separate consent checkboxes, none pre-checked, (a) mandatory. |
| `ATID-LEGAL-006` | If `last_tos_notified_at` > 365 d, force re-tick on next sign-in. |

## Layout — WEB

```
┌──────────────────────────────────────────────────────────────────────┐
│  factivist          [ Browse ] [ About ] [ Legal ▾ ]      [ Sign in ]│
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   STEP 1/4  Why we verify                                            │
│   ────────────────────────                                           │
│   ▓ Civic legitimacy without identity disclosure.                    │
│   ▓ We use a Zero-Knowledge Proof of your Aadhaar QR.                │
│   ▓ We see only:  state · district · a unique nullifier.             │
│   ▓ We never see: name · Aadhaar · DOB · address · photo · PIN.      │
│                                                                      │
│   [ Read the ZKP explainer ↗ ]                                       │
│                                                                      │
│                                  [ Continue → ]                      │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│   STEP 2/4  Consent  (none pre-checked)                              │
│   ────────────────────────                                           │
│   ☐ (a) I agree to the Terms of Service             [required]       │
│   ☐ (b) I consent to publishing my complaints publicly               │
│   ☐ (c) I consent to storing my complaint photos for the lifetime   │
│         of the complaint                                             │
│                                                                      │
│   [ Back ]                              [ I agree, continue → ]      │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│   STEP 3/4  Scan your Aadhaar QR                                     │
│   ────────────────────────                                           │
│   ┌──────────────────┐    The QR is processed entirely in            │
│   │                  │    your browser. The proof is generated       │
│   │  [QR camera/     │    locally; only the proof leaves your        │
│   │   upload area]   │    device.                                    │
│   │                  │                                               │
│   └──────────────────┘    Device check: ✓ desktop · proving locally  │
│                                                                      │
│   [ Upload QR image ]  or  [ Use camera ]                            │
│                                                                      │
│   [ Back ]                              [ Generate proof → ]         │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│   STEP 4/4  Verifying on chain…                                      │
│   ────────────────────────                                           │
│       ⠋  Submitting proof to CitizenVerifier.sol on Polygon          │
│          (tx pending, expected < 15 s)                               │
│                                                                      │
│       This step costs no gas to you.                                 │
│                                                                      │
│       [ Cancel ]                                                     │
└──────────────────────────────────────────────────────────────────────┘
```

## Layout — MOBILE

```
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ ←  Step 1/4      │   │ ←  Step 2/4      │   │ ←  Step 3/4      │
│                  │   │                  │   │                  │
│ Why we verify    │   │ Consent          │   │ Scan Aadhaar QR  │
│                  │   │                  │   │                  │
│ • Civic legit    │   │ ☐ Agree to ToS   │   │ ┌──────────────┐ │
│ • ZKP of QR      │   │   [required]     │   │ │              │ │
│ • We see:        │   │ ☐ Publish        │   │ │  [camera     │ │
│   state/district │   │   complaints     │   │ │   live view] │ │
│ • We never see:  │   │ ☐ Keep photos    │   │ │              │ │
│   PII            │   │   for lifetime   │   │ └──────────────┘ │
│                  │   │                  │   │                  │
│ [Read explainer] │   │ Device class:    │   │ Pinch to focus   │
│                  │   │ • A14, 6GB RAM   │   │                  │
│                  │   │ • proving locally│   │ [Upload from     │
│                  │   │                  │   │  Photos]         │
│ [   Continue   ] │   │ [I agree, cont.] │   │ [Generate proof] │
└──────────────────┘   └──────────────────┘   └──────────────────┘

┌──────────────────┐
│ ←  Step 4/4      │
│                  │
│ Verifying…       │
│                  │
│   ⠋  Submitting  │
│      proof…      │
│                  │
│   ~15 s          │
│                  │
│   No gas charged │
│   to you.        │
│                  │
│ [    Cancel    ] │
└──────────────────┘
```

## Information architecture

Order of disclosure (intentionally privacy-first, **not** funnel-optimised):

1. **Promise** — what we see / never see (Step 1).
2. **Consent** — three checkboxes, no dark patterns (Step 2).
3. **Action** — scan + local proof generation (Step 3).
4. **Confirmation** — on-chain verification status (Step 4).

Hidden by default:
- Advanced device routing controls (auto-decided per ATID-IDENT-004).
- Transaction hash / Polygon explorer link (revealed in Step 4 success state under a "View on-chain" disclosure).
- Anonymous handle preview (revealed only on the final success screen).

## Copy

| Slot | Copy |
|------|------|
| Page title (web) | `Verify you are a unique Indian citizen — without showing us who you are.` |
| Step 1 heading | `Why we verify` |
| Step 1 body | `We use a Zero-Knowledge Proof of your Aadhaar QR. We see only your state, district, and a one-way nullifier. We never see your name, Aadhaar number, date of birth, address, photo, or PIN.` |
| Step 1 secondary CTA | `Read the ZKP explainer` |
| Step 1 primary CTA | `Continue` |
| Step 2 heading | `Consent` |
| Step 2 checkbox (a) | `I agree to the Terms of Service` (with inline link) |
| Step 2 checkbox (b) | `I consent to publishing my complaint and photos publicly` |
| Step 2 checkbox (c) | `I consent to storing my photos for the lifetime of the complaint` |
| Step 2 disabled CTA tooltip | `Please tick the Terms of Service checkbox to continue.` |
| Step 3 heading | `Scan your Aadhaar QR` |
| Step 3 body | `The QR is processed entirely on your device. Only the resulting proof leaves your device.` |
| Step 3 primary CTA | `Generate proof` |
| Step 4 heading | `Verifying on chain…` |
| Step 4 body | `Submitting your proof to CitizenVerifier on Polygon. This step costs no gas to you.` |
| Success heading | `Welcome, {handle}.` |
| Success body | `You are verified. You can now submit complaints, comment, and flag.` |
| Replay error (409) | `This Aadhaar has already been used to verify a Factivist citizen. If you believe this is a mistake, see our grievance page.` |
| Generic failure | `We could not verify your proof. Nothing was saved. Please try again or contact our Grievance Officer.` |

## Components used

> Canonical names — `ui-templater` will lock these in `packages/ui/web` and `packages/ui/native`.

- `Onboarding.Shell` (4-step horizontal stepper container)
- `Onboarding.PromiseStep`
- `Onboarding.ConsentStep`
- `Onboarding.ScanStep` (web: webcam + image upload; mobile: native camera)
- `Onboarding.VerifyStep` (Polygon tx polling)
- `Onboarding.SuccessCard`
- `Identity.HandlePreview` (used on success)
- `Identity.PIIGuard` (invisible runtime check that no PII field is mounted in the form tree)
- `Common.Stepper`
- `Common.ConsentCheckbox` (forced-uncheck default, ARIA-required for (a))

## States

| State | Trigger | Behaviour |
|-------|---------|-----------|
| Loading (Step 4) | Awaiting on-chain receipt | Spinner + ETA copy; allow cancel that aborts the tx-poll but never voids the local proof. |
| Empty | First visit | Show Step 1 hero. |
| Error — 4xx (`invalid_proof`) | Server rejects proof | Inline error card, keep user on Step 3; do not surface raw server message. |
| Error — 409 (`nullifier_already_used`) | Per ATID-IDENT-002 | Modal: replay copy + link to `/legal/grievance`. |
| Error — 5xx | Server/chain unreachable | Toast: "Verification temporarily unavailable. Please retry." + retry button. |
| Success | 201 from `/identity/verify` | Render success card with anonymous handle; redirect to `/` after 3 s. |
| Offline (mobile) | No network during Step 3 or 4 | Block tx submit; cache proof in secure storage; banner: "Connection required to submit the proof. Your proof is saved on this device." Retry on reconnect. |
| Low-tier device (mobile) | RAM < 4 GB or pre-A12 iPhone | Route proving to `/identity/prove`; surface neutral copy: "Generating your proof securely…" — never disclose device class to the user. |

## Edge cases

- User leaves between Step 2 and Step 3 — consent is **not** persisted; re-shown next visit.
- User generates proof but loses network before submission — proof persists in `IndexedDB` (web) / `SecureStore` (mobile) for 24 h, then is purged.
- Camera permission denied — fall back to image upload, copy: "We need to read the QR. You can also upload an image of it."
- Aadhaar QR is from an old format (pre-2017) — UIDAI signature check fails locally; show: "This Aadhaar QR format is not supported. Please open mAadhaar and use a fresh QR."
- User attempts to "Sign in" instead of onboard — `/sign-in` is just a session-cookie restore. If no nullifier on chain matches the device, route back to onboarding.
- Multiple tabs / windows during Step 4 — only one wins; the loser shows: "Verification is happening in another window."

## Anonymity invariants (per ADR-010)

This surface MUST NEVER render, log, store, transmit, or `console.log`:

- Aadhaar number (in any form, masked or not).
- Citizen name, gender, DOB, address, postal PIN.
- Aadhaar photo bytes (the QR image is read **locally** and discarded after proof generation).
- GPS coordinate or device fingerprint.
- IP address (post-Cloudflare-scrub).
- The raw witness inputs to the circuit.

The `Identity.PIIGuard` component throws at mount-time if any of these fields are detected in the form tree.

## Legal hooks

- **IT Act §79(2)** — onboarding does not editorialise content; intermediary stance preserved.
- **Rule 3(1)(b)** — Step 2 (Consent) links to the ToS page that contains the prohibited-content list verbatim (`ATID-LEGAL-001`).
- **Rule 3(1)(f)** — annual ToS re-acknowledgement is enforced on this surface (`ATID-LEGAL-006`).
- **DPDP Act 2023 §6** — three checkboxes are separated and unambiguous (`ATID-LEGAL-005`).
- **CERT-In Direction 28-Apr-2022** — verification logs (no PII, only `trace_id`, `nullifier_hash_prefix`) replicate to the India-region bucket (`ATID-LEGAL-007`).

## Open questions

1. Should we expose the anonymous handle **before** the user completes Step 4, so they feel ownership earlier? Current spec hides it until success. Recommendation: keep hidden — the handle is a function of the nullifier and the nullifier doesn't exist yet.
2. Web camera scanning is convenient but adds a permission prompt. Should desktop default to **upload** with camera as a secondary action? Recommendation: yes for v1, swap later if conversion suffers.
3. On Step 4 cancel: do we keep the proof cached for retry, or wipe it? Privacy-conservative answer: wipe. UX answer: keep for 1 hour. **Needs user call.**
