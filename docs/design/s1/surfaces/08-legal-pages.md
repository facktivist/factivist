# Surface 08 — Static legal pages (ToS, privacy, ZKP explainer, grievance)

> Tracking issue: [#31](https://github.com/raveracker/factivist/issues/31)
> Related: [#71 grievance flow](https://github.com/raveracker/factivist/issues/71), [#72 ToS prohibited content](https://github.com/raveracker/factivist/issues/72), [#107 CERT-In runbook](https://github.com/raveracker/factivist/issues/107)
> Phase: 3 · Owner agent: `ux-lead`
> Last edited: 2026-05-23

## Summary

Four static, server-rendered pages that anchor the platform's legal
posture under the IT Act, IT Rules 2021, and DPDP 2023:

1. `/legal/tos` — Terms of Service, including the Rule 3(1)(b) prohibited-content list verbatim.
2. `/legal/privacy` — Privacy policy; the anonymity contract restated for non-engineers.
3. `/legal/zkp-explainer` — Plain-language explanation of what a Zero-Knowledge Proof of Aadhaar QR is and isn't.
4. `/legal/grievance` — Grievance Officer details (name, India address, phone, email) + grievance form + GAC link.

Linked from the footer of every page.

## User story (×4, condensed)

> **As a** visitor (Indian or otherwise)
> **I want to** read what Factivist promises, what is forbidden to post, how the ZKP works, and how to complain about content
> **So that** I can trust the platform or escalate a grievance with confidence.

## ATIDs gated

| ATID | What this surface must guarantee |
|------|-----------------------------------|
| `ATID-LEGAL-001` | All four pages return 200; linked from footer of every page (Playwright crawl); SSR; ToS contains Rule 3(1)(b) list verbatim. |
| `ATID-LEGAL-002` | Grievance form → 201 + grievance_id; ack email ≤ 24 h; `grievances` row; GAC link rendered. |
| `ATID-LEGAL-003` | SLA alerts at t0+15d (general) and t0+36h (actual-knowledge). |
| `ATID-LEGAL-004` | NCII alert at t0+24h; pinned at queue top. |
| `ATID-LEGAL-015` | Grievance page lists exactly one Grievance Officer with name + India postal + phone + India-routable email + GAC link; no SSMI "Three Officer" content. |
| `ATID-LEGAL-005` | (Referenced from ToS) — three separate, none-pre-checked consent boxes on onboarding. |
| `ATID-LEGAL-006` | (Referenced from ToS) — annual ToS re-tick. |

## Layout — WEB

### Common chrome

```
┌──────────────────────────────────────────────────────────────────────┐
│  factivist     [ Browse ] [ About ] [ Legal ▾ ]    {handle | Sign in}│
├──────────────────────────────────────────────────────────────────────┤
│  Legal                                                               │
│  ─────                                                               │
│  [ Terms ]  [ Privacy ]  [ ZKP explainer ]  [ Grievance ]            │
│                                                                      │
│  ...page body (long-form markdown, ToC sticky on the right)...       │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### `/legal/tos`

```
Terms of Service
─────────────────
Last updated: YYYY-MM-DD · Effective: YYYY-MM-DD

1. Acceptance
2. Eligibility (verified Indian citizens)
3. Prohibited content  ←  Rule 3(1)(b) list verbatim
4. User responsibility for accuracy
5. Anonymity guarantees (see Privacy)
6. Removal & grievance redressal
7. Annual re-acknowledgement (`ATID-LEGAL-006`)
8. Limitation of liability
9. Governing law (India)
```

### `/legal/privacy`

```
Privacy
────────
What we collect (state, district, nullifier, complaint text, photos)
What we never collect (Aadhaar, name, DOB, address, PIN, IP, fingerprint)
What we publish (handle, complaint, constituency)
Retention (complaint photos: lifetime of complaint; logs: 180 days India-region)
Your rights under DPDP 2023
How to file a grievance
```

### `/legal/zkp-explainer`

```
What is a Zero-Knowledge Proof?
─────────────────────────────────
A 5-paragraph plain-English explainer:
- The metaphor (proving you have a key without showing it)
- What the circuit checks (Aadhaar QR signature + nullifier derivation)
- What we see (nullifier, state, district)
- What we never see (everything else)
- Why this is auditable (links to anoncitizen repo + audit report)

[ Diagram: device → proof → chain ]
```

### `/legal/grievance`

```
Grievance Officer
─────────────────
Name:       <name>
Address:    <India postal address>
Phone:      <India number>
Email:      <name>@factivist.in    (or India-routable)
Working hours: <Mon–Fri, 10:00–18:00 IST>

How to file a grievance
- Use the form below.
- We acknowledge within 24 hours.
- We dispose of general grievances within 15 days.
- Actual-knowledge notifications (court / agency) within 36 hours.
- NCII within 24 hours.

[ Form: full name (optional), email (required), complaint URL or
        keyword, grievance category, body, "actual knowledge" toggle ]

[ Submit ]

You may also appeal to the Grievance Appellate Committee:
https://gac.gov.in/      ← visible on the same page
```

## Layout — MOBILE

Same structure, single-column. Sticky ToC collapses to a "Contents" disclosure at the top.

```
┌──────────────────────┐
│ ←  Legal             │
├──────────────────────┤
│ [Terms][Privacy]     │
│ [ZKP][Grievance]     │
├──────────────────────┤
│ Terms of Service     │
│ Last updated: …      │
│                      │
│ [Contents ▾]         │
│                      │
│ 1. Acceptance        │
│ ...                  │
└──────────────────────┘
```

## Information architecture

- Single `/legal` index with tabs to the four pages; each page is its own SSR route for SEO + deep-linking.
- Footer link cluster on every other page: `Terms · Privacy · ZKP · Grievance · About`.
- ToS § 3 (prohibited-content list) is rendered from a single source-of-truth markdown file under `apps/web/src/content/legal/prohibited.md` so future drift cannot occur.
- The Grievance page is the ONLY legal page with a form; everything else is read-only.

## Copy

Each page has its own long-form copy; the canonical text lives in `apps/web/src/content/legal/*.md` and is keyed for `ATID-LEGAL-001` Playwright crawl. Microcopy snippets:

| Slot | Copy |
|------|------|
| ToS § 3 lead | `In accordance with Rule 3(1)(b) of the IT Rules 2021, users shall not host, display, upload, modify, publish, transmit, store, update, or share any information that —` |
| Privacy lead | `Factivist is built so that we cannot identify you, even if compelled.` |
| ZKP lead | `A Zero-Knowledge Proof lets you prove a fact without revealing the data behind it.` |
| Grievance ack copy | `Your grievance has been received. Reference ID: {grievance_id}. You will receive an email acknowledgement within 24 hours.` |
| GAC link copy | `If you are not satisfied with our decision, you may appeal to the Grievance Appellate Committee.` |

## Components used

- `Legal.Shell` (tabbed nav + ToC + canonical chrome)
- `Legal.TosBody`
- `Legal.PrivacyBody`
- `Legal.ZkpExplainerBody`
- `Legal.GrievanceBody`
- `Legal.GrievanceForm`
- `Legal.GacLink`
- `Common.Footer` (links to all four pages on every other page)
- `Common.ContentsToc` (sticky on desktop, disclosure on mobile)

## States

| State | Trigger | Behaviour |
|-------|---------|-----------|
| Loading | SSR | Pages are pre-rendered at build time; no spinner. |
| Submitting (grievance) | Form post | Button shows spinner; double-submit blocked. |
| Error — 400 | Validation | Inline field errors. |
| Error — 5xx | Server | Toast retry; never lose user's text — preserve in localStorage. |
| Success (grievance) | 201 | Redirect to `/legal/grievance/confirmation?id=...` with reference ID. |

## Edge cases

- A user without email — required (so we can ack within 24 h); error: "We need an email so we can acknowledge your grievance."
- A user claims "actual knowledge" — toggle flips SLA to 36 h; backend records `actual_knowledge=true` for audit.
- A user submits an NCII complaint via this form — flagged for the 24 h SLA path immediately (`ATID-LEGAL-004`).
- A user is outside India — form still works; jurisdiction note in the ToS clarifies grievance is processed under Indian law.
- A § 69A blocking order arrives via email — operator transcribes into `legal_orders` per `ATID-LEGAL-009` (not via this form).

## Anonymity invariants

- The grievance form is the **only** place we ask for an email, and only because Rule 3(2) requires acknowledgement. Email is stored in `grievances`, never linked to `citizens`.
- The grievance form does NOT ask for the complainant's citizen handle (a complainant may be a non-citizen).

## Legal hooks

This entire surface IS the legal hook. See `wiki:Research-IT-Act-Posture` for the obligations matrix. Key:

- **Rule 3(1)(b)** — prohibited-content list verbatim in ToS.
- **Rule 3(2)** — Grievance Officer named with India address + phone + India-routable email.
- **Rule 3(2)(a)** — 24 h ack + 15 d disposal SLA.
- **Rule 3(2)(b)** — 24 h NCII SLA.
- **§79(3)(b) + Rule 3(1)(d)** — 36 h actual-knowledge takedown ceiling.
- **GAC** — visible link to https://gac.gov.in/.
- **DPDP §6** — consent posture restated in Privacy.
- **CERT-In Direction** — 180 d India-region log retention.

## Open questions

1. Translation — should the ToS exist in Hindi + a few regional languages at launch? Civic norm answer: yes. Resource answer: defer to S2 (translation review is non-trivial). Recommend posting an English-only ToS with a clear note that translations are forthcoming.
2. Grievance form — should we offer an email-only path for users who can't access the web (i.e., a dedicated `grievance@factivist.in` that mirrors the form)? Recommend yes for accessibility; auto-create the row from inbound email.
3. ZKP explainer — should we host the explainer in a video (60s)? Higher conversion, but adds cost + accessibility surface. Recommend text + a static diagram in S1; video in S2.
