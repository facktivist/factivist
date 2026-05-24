# Surface 06 — Citizen profile

> Tracking issue: [#29](https://github.com/raveracker/factivist/issues/29)
> Phase: 3 · Owner agent: `ux-lead`
> Last edited: 2026-05-23

## Summary

Public profile for any verified citizen. Renders only what the
deterministic Poseidon-derived handle, the citizen's state + district,
their complaint count, and join date. **No** name, photo, contact, PIN,
nor any PII. The page is the visible artefact of the anonymity contract:
if a moderator could see more here, the system would be broken.

## User story

> **As a** visitor
> **I want to** see how active a particular handle is (without learning who they are)
> **So that** I can assess credibility patterns (frequent contributor in a constituency? brand-new account?) without violating their anonymity.

## ATIDs gated

| ATID | What this surface must guarantee |
|------|-----------------------------------|
| `ATID-IDENT-005` | Renders only handle, state/district, complaint count, join date. |
| `ATID-IDENT-006` | Handle is deterministic Poseidon(nullifier); web + mobile collide; never receives any UIDAI-derived data other than nullifier; 50-bit. |
| `ATID-IDENT-007` | GET /citizens/:handle response contains only `{ handle, state, district, complaint_count, joined_at }`. |

## Layout — WEB

```
┌──────────────────────────────────────────────────────────────────────┐
│  factivist     [ Browse ] [ About ] [ Legal ▾ ]    {handle} ▾        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│      Citizen handle                                                  │
│      ──────────────                                                  │
│                                                                      │
│      bldr7q9p2x      (10 chars; one-way derived from a unique        │
│                       nullifier; collision-resistant)                │
│                                                                      │
│      Karnataka · Bengaluru Urban                                     │
│      Joined 2026-05-12 · 7 complaints                                │
│                                                                      │
│      ─────────────────────────────────────────────────────────────── │
│                                                                      │
│      Complaints by this citizen                                      │
│                                                                      │
│      ┌────────────────────────────────────────────────────────────┐  │
│      │ 🚧 Potholes on 100ft Road near Forum Mall                  │  │
│      │    Roads · BLR-U · 2 h ago · 🚩 4 · 💬 7                   │  │
│      └────────────────────────────────────────────────────────────┘  │
│      ┌────────────────────────────────────────────────────────────┐  │
│      │ 💧 No water for three days, Block 4                        │  │
│      │    Water · BLR-U · 5 h ago · 🚩 1 · 💬 2                   │  │
│      └────────────────────────────────────────────────────────────┘  │
│      …                                                               │
│                                                                      │
│      [ ← Prev ]              page 1 of 1              [ Next → ]    │
└──────────────────────────────────────────────────────────────────────┘
```

## Layout — MOBILE

```
┌──────────────────────┐
│  ←  Citizen          │
├──────────────────────┤
│                      │
│  bldr7q9p2x          │
│  Karnataka ·         │
│  Bengaluru Urban     │
│  Joined 2026-05-12   │
│  7 complaints        │
│                      │
├──────────────────────┤
│ Complaints           │
│                      │
│ 🚧 Potholes 100ft    │
│ Roads · 2h · 🚩4 💬7 │
├──────────────────────┤
│ 💧 No water, Block 4 │
│ Water · 5h · 🚩1 💬2 │
├──────────────────────┤
│ …                    │
└──────────────────────┘
```

## Information architecture

1. **Identity card** — handle, state/district, join date, complaint count.
2. **Complaint list** — paginated, `created_at DESC`, reused `Complaint.Card`.

Hidden permanently (not collapsed — **never rendered**):
- Aadhaar number / name / photo / DOB / PIN / contact info.
- IP / device fingerprint / browser UA.
- `citizen_id` UUID (handle only).
- Comments authored (S1 — keep profile narrow; revisit S2).
- Flag activity (privacy-sensitive — flagger identity stays hidden everywhere).

## Copy

| Slot | Copy |
|------|------|
| Profile heading | `Citizen handle` |
| Handle subline | `{N} chars; one-way derived from a unique nullifier; collision-resistant.` |
| Region | `{state} · {district}` |
| Join + count | `Joined {date} · {N} complaints` |
| Empty complaints | `No complaints yet.` |
| Owner viewing own profile (footer) | `This is what others see. We see the same — plus your session cookie. We never see your Aadhaar.` |

## Components used

- `Citizen.ProfileCard`
- `Citizen.HandleBadge` (also used inline next to comments and complaints)
- `Complaint.Card` (compact variant)
- `Common.Pagination`
- `Common.EmptyState`

## States

| State | Trigger | Behaviour |
|-------|---------|-----------|
| Loading | SSR | Skeleton card + skeleton list. |
| Empty | Citizen with 0 complaints | `EmptyState` "No complaints yet." |
| Error — 404 | Handle not found | Renders `not-found`. |
| Owner view | Viewing own profile | Same content + reassurance footer. |
| Offline (mobile) | Cached data | "Offline — last seen {time}." banner. |

## Edge cases

- Handle collision (theoretical, ~50-bit space, ≈ 1 in 10^15 at S1 scale) — we add a 4-digit checksum suffix to handles per `Identity.HandlePreview`; collision still triggers 404 since the URL is the full handle string.
- Bot scraping profile pages — rate-limited at edge; `robots.txt` allows but slows; no enumeration possible (no listing endpoint).
- A moderator tries to look up a citizen by PII — there is no such endpoint. By design.

## Anonymity invariants (per ADR-010)

This surface is the **public assertion** of the anonymity contract. Any
column that ever creeps into the response payload that is not in
`{ handle, state, district, complaint_count, joined_at }` is a **CRITICAL**
regression. The adversarial test in ATID-P5C6 (issue #70) MUST fail on any
new field.

## Legal hooks

- **DPDP §5** (data minimisation) — this surface is the floor: anything more is over-collection by definition.
- **`ATID-IDENT-007`** — JSON schema test verifies the response shape.

## Open questions

1. Should we surface "first ever complaint" date as a separate "Verified since" badge? Marginal value, low risk. Recommend yes — reinforces longevity.
2. Should we let the owner add a one-line bio? **No** — every free-text field is a re-identification vector. Hard rule.
3. Display the citizen's PC and AC, or only district? PRD says "state, district". I lifted that into `ATID-IDENT-005`. Recommend keeping only state + district to avoid inferring AC-level activity patterns.
