# Surface 02 — Complaint composer

> Tracking issue: [#25](https://github.com/facktivist/factivist/issues/25)
> Implementation issues: [#60 web](https://github.com/facktivist/factivist/issues/60), [#61 mobile](https://github.com/facktivist/factivist/issues/61), [#62 EXIF strip](https://github.com/facktivist/factivist/issues/62)
> Phase: 3 · Owner agent: `ux-lead`
> Last edited: 2026-05-23

## Summary

The primary write surface. A verified citizen composes a text complaint
(≤ 5000 chars), optionally attaches 1–3 photos, picks one of 35 categories,
and **manually** picks state → district → PC → AC from cascading dropdowns
(ADR-013 — **no** geolocation API). Server strips EXIF before storage.
The composer is the most legally-sensitive surface: the disclaimer
`User-submitted; not verified by Factivist.` is rendered above the body
field and is **also** stored on the row (`ATID-LEGAL-010`).

## User story

> **As a** verified citizen
> **I want to** publish a grievance with optional photo evidence tagged to my constituency
> **So that** other citizens, journalists, and (eventually) representatives can see and respond to it.

## ATIDs gated

| ATID | What this surface must guarantee |
|------|-----------------------------------|
| `ATID-COMPL-001` | Happy path: ≤ 5000 chars + ≤ 3 photos + slug + (state, district, pc, ac) → 201. |
| `ATID-COMPL-002` | EXIF/GPS strip server-side via Sharp; only orientation tag preserved. |
| `ATID-COMPL-003` | Exactly 35 categories; slug PK; corruption row supports `severity_flag`. |
| `ATID-COMPL-004` | Cascading dropdowns; **no** Geolocation API call anywhere in the bundle. |
| `ATID-COMPL-005` | Zod boundary rejects body > 5000 or photos > 3 → 400. |
| `ATID-COMPL-006` | Author identity stored as `citizen_id`; public surface shows `author_handle` only. |
| `ATID-LEGAL-010` | The literal disclaimer string is shown above the body and persisted. |
| `ATID-LEGAL-012` | Sensitive-zone seed → auto-route to moderation queue before publication. |

## Layout — WEB

```
┌──────────────────────────────────────────────────────────────────────┐
│  factivist     [ Browse ] [ About ] [ Legal ▾ ]    {handle} ▾        │
├──────────────────────────────────────────────────────────────────────┤
│  New complaint                                                       │
│  ─────────────                                                       │
│                                                                      │
│  Disclaimer:  User-submitted; not verified by Factivist.   ⓘ         │
│                                                                      │
│  Title  (≤ 120 chars)                                                │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                                                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  Category                                                            │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  [Select a category ▾]                                         │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  Constituency  (manual — no GPS used)                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │
│  │ State ▾      │ │ District ▾   │ │ PC (Lok S) ▾ │ │ AC (Vidhan) ▾│ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ │
│                                                                      │
│  Body  (≤ 5000 chars · markdown supported)        chars: 0/5000      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                                                                │  │
│  │                                                                │  │
│  │                                                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  Photos  (optional, up to 3 · EXIF stripped server-side)             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                              │
│  │ [+ add]  │ │          │ │          │                              │
│  └──────────┘ └──────────┘ └──────────┘                              │
│                                                                      │
│  ⚠ J&K boundaries pending DataMeet update (if applicable)            │
│                                                                      │
│  [ Save draft ]                                  [ Publish → ]       │
└──────────────────────────────────────────────────────────────────────┘
```

## Layout — MOBILE

```
┌──────────────────────┐
│ ←   New complaint    │
├──────────────────────┤
│ Disclaimer ⓘ         │
│ User-submitted;      │
│ not verified by      │
│ Factivist.           │
│                      │
│ Title                │
│ ┌──────────────────┐ │
│ │                  │ │
│ └──────────────────┘ │
│                      │
│ Category    [▾]      │
│                      │
│ Constituency         │
│  State        [▾]    │
│  District     [▾]    │
│  PC (Lok S)   [▾]    │
│  AC (Vidhan)  [▾]    │
│                      │
│ Body  0/5000         │
│ ┌──────────────────┐ │
│ │                  │ │
│ │                  │ │
│ │                  │ │
│ └──────────────────┘ │
│                      │
│ Photos               │
│ [+] [ ] [ ]          │
│                      │
│ [ Save draft ]       │
│ [   Publish      ]   │
└──────────────────────┘
```

## Information architecture

Order (top → bottom):
1. **Disclaimer** (legally required above body, `ATID-LEGAL-010`)
2. **Title** (short, indexed in `tsvector`)
3. **Category** (single-select from 35 seeded slugs)
4. **Constituency** (cascading 4-level — drives `pc_code` + `ac_code`)
5. **Body** (markdown, ≤ 5000)
6. **Photos** (0–3, EXIF strip happens on server only — client must NOT pre-strip)
7. **Submit row**

Hidden by default:
- Draft auto-save status (small footer text on web; toast on mobile).
- Markdown preview toggle (collapsed; expand on click).

## Copy

| Slot | Copy |
|------|------|
| Page title | `New complaint` |
| Disclaimer string (verbatim) | `User-submitted; not verified by Factivist.` |
| Disclaimer tooltip | `Factivist publishes complaints from verified citizens. Truth-checking is the reader's responsibility.` |
| Title placeholder | `What is the complaint about? (one line)` |
| Category placeholder | `Select a category` |
| Constituency note | `We never use GPS. Pick your constituency manually.` |
| Body placeholder | `Describe the issue in your own words. Include dates, places, and what action you expect.` |
| Photos hint | `Up to 3 photos. EXIF metadata (including GPS) is removed before publishing.` |
| Save draft | `Save draft` |
| Publish CTA | `Publish` |
| Publish confirm modal | `Once published, your complaint will be visible to anyone with a link. You can request removal via our Grievance Officer.` |
| Validation — empty title | `Add a one-line title.` |
| Validation — body too long | `5000 character limit reached.` |
| Validation — photos > 3 | `You can attach up to 3 photos.` |
| Auto-route to moderation banner | `This complaint will be reviewed before it appears publicly.` |

## Components used

- `Complaint.Composer` (root form container)
- `Complaint.DisclaimerStrip` (legal-tier styling)
- `Complaint.TitleField`
- `Complaint.CategoryPicker` (single-select, 35 slugs)
- `Filter.ConstituencyTree` (reused with `mode="single-pick"`)
- `Complaint.BodyEditor` (markdown, char-counter)
- `Complaint.PhotoTray` (drag-drop on web, native picker on mobile, 0–3 slots)
- `Complaint.PublishConfirmDialog`
- `Common.SubmitBar`
- `Common.StaleGeometryBadge` (J&K, per `ATID-DISC-003`)

## States

| State | Trigger | Behaviour |
|-------|---------|-----------|
| Loading | Fetching categories + constituencies seed | Skeleton form with locked submit. |
| Empty | First visit | All fields blank, "Save draft" disabled until any field touched. |
| Draft restored | Returning with localStorage draft | Banner: "We restored your draft from {time ago}." + Discard. |
| Error — 400 (Zod) | Boundary validation fail | Inline field errors; submit re-enables on fix. |
| Error — 401 | Session expired | Modal: "Sign in again to publish." + sign-in button (re-uses ZKP session restore). |
| Error — 413 (photo too large) | Upload > 10 MB | Per-photo error; remove or recompress. |
| Error — 500 | Server | Toast retry; draft preserved. |
| Success | 201 | Redirect to `/complaints/:id` with success toast. |
| Auto-moderation (LEGAL-012) | Sensitive zone match | Submit succeeds with `status='moderation_pending'`; user sees pending screen, not the complaint detail. |
| Offline (mobile) | No network | Submit disabled; draft saved locally; banner: "You're offline. Your draft is saved." |

## Edge cases

- User pastes 8000 chars — `Complaint.BodyEditor` truncates at 5000 and shows "Trimmed to 5000 chars." (no silent drop).
- User attaches a HEIC photo — Sharp transcodes to JPEG server-side; client just uploads bytes.
- User attaches a photo containing EXIF GPS + device serial — server rejects nothing, but strips all tags except orientation (`ATID-COMPL-002`). Client never inspects EXIF (assumption: not trusted to strip).
- User picks an invalid combination of `(state, district, pc, ac)` by manipulating the URL state — Zod + DB FK denies; show: "That constituency combination is not valid."
- User has multiple drafts (mobile + web) — last-written wins; we do not merge.
- User publishes while pic upload is mid-flight — submit waits for all uploads to complete or fail; CTA shows spinner.

## Anonymity invariants (per ADR-010)

This surface MUST NEVER:

- Read GPS via `navigator.geolocation` or `expo-location` — even for "convenience" pre-fill (`ATID-COMPL-004`).
- Send the raw nullifier or any Aadhaar-derived field in the request.
- Persist the user's IP, device fingerprint, or session cookie value in the complaint row.
- Pre-strip EXIF on the client; the server is the trust boundary (`ATID-COMPL-002`).
- Expose the citizen's `author_id` on any public read API; only `author_handle` (`ATID-COMPL-006`).

## Legal hooks

- **`ATID-LEGAL-010`** — disclaimer string verbatim above the body and stored in `complaints.disclaimer`.
- **Rule 3(1)(b)** — composer is post-consent; user has already acknowledged prohibited content.
- **Rule 3(1)(d)** — published complaints flow into the moderation queue when flagged.
- **ADR-004** — Supabase Storage `complaint-photos` bucket is private; signed URLs only.
- **`ATID-LEGAL-012`** — sensitive-zone seed (`packages/db/data/eci/sensitive.csv`) intercepts publication.
- **DPDP §5** — minimum-necessary capture; we collect text + photos + constituency tags only.

## Open questions

1. Should drafts persist server-side (encrypted-at-rest under citizen_id) so a user can resume on mobile after starting on web? Privacy answer: no (more attack surface). UX answer: yes. **Needs user call.**
2. The 5000-char ceiling — confirmed by PRD? PRD wording says "text complaint" with no number; I lifted 5000 from `ATID-COMPL-001`. If the user wants 2000 or 10000, single source of truth needs update.
3. Should we allow a non-public "preview" of how the complaint will render before publish? Recommendation: yes, inline collapsible "Preview" — cheap, reduces moderation churn.
