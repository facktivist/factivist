# Surface 03 — Complaint detail (read, comment, flag)

> Tracking issue: [#26](https://github.com/facktivist/factivist/issues/26)
> Phase: 3 · Owner agent: `ux-lead`
> Last edited: 2026-05-23

## Summary

The canonical permalink for a complaint. Public, server-rendered, indexed
by search engines (unless `status != 'published'`). Renders the disclaimer,
the body, the photo signed-URLs (≤ 1 h TTL), the constituency tags, the
flag count, the comment thread (flat, ≤ 1000 chars per comment), and the
author handle (never the `author_id`). Verified citizens can comment and
flag. Anonymous visitors can read.

## User story

> **As a** member of the public
> **I want to** read a complaint, see its evidence, and discuss it with verified citizens
> **So that** civic grievances become visible, debated, and (eventually) escalated.

## ATIDs gated

| ATID | What this surface must guarantee |
|------|-----------------------------------|
| `ATID-COMPL-007` | Public read returns body, photos (signed ≤ 1 h), constituency tags, flag count, comments, `author_handle`, disclaimer — **no** `author_id` / nullifier / IP. |
| `ATID-COMMENT-001` | Anonymous comment attempts → 401; verified ≤ 1000 chars → 201; flat thread; only `author_handle` rendered. |
| `ATID-COMMENT-002` | Flag → 204, queue row written, public flag count increments, flagger identity hidden. |
| `ATID-LEGAL-010` | Disclaimer string above body, both in UI and in `complaints.disclaimer`. |

## Layout — WEB

```
┌──────────────────────────────────────────────────────────────────────┐
│  factivist     [ Browse ] [ About ] [ Legal ▾ ]    {handle} ▾  / S↗ │
├──────────────────────────────────────────────────────────────────────┤
│  ←  Browse                                                           │
│                                                                      │
│  KA · Bengaluru Urban · Bangalore South PC · BTM Layout AC           │
│  Category:  Roads & Potholes        🚩 4    💬 7    📅 2026-05-22    │
│  Author:    {anon-handle}                                            │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  Disclaimer:  User-submitted; not verified by Factivist.   ⓘ         │
│                                                                      │
│  ## Potholes on 100ft Road near Forum Mall                           │
│                                                                      │
│  [body markdown — paragraphs, lists, links rendered safely]          │
│                                                                      │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐                         │
│  │ photo 1   │  │ photo 2   │  │ photo 3   │                         │
│  └───────────┘  └───────────┘  └───────────┘                         │
│                                                                      │
│  [ 🚩 Flag this complaint ]    [ Share link ]                        │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────── │
│  Comments (7)                                                        │
│                                                                      │
│  {handle-A}  · 2 h ago                                               │
│  > comment body…                                                     │
│                                                                      │
│  {handle-B}  · 5 h ago                                               │
│  > comment body…                                                     │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ Add a comment (≤ 1000 chars; verified citizens only)           │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                       [ Post → ]     │
└──────────────────────────────────────────────────────────────────────┘
```

## Layout — MOBILE

```
┌──────────────────────┐
│ ←  Complaint         │
├──────────────────────┤
│ KA · BLR-U · BLR-S   │
│ · BTM Layout         │
│ Roads & Potholes     │
│ 🚩 4  💬 7  · May 22 │
│ {anon-handle}        │
│                      │
│ Disclaimer ⓘ         │
│ User-submitted; not  │
│ verified by Fact-    │
│ ivist.               │
│                      │
│ # Potholes on 100ft  │
│   Road near Forum    │
│                      │
│ [body…]              │
│                      │
│ ┌──────────────────┐ │
│ │     photo 1      │ │
│ └──────────────────┘ │
│ ┌──────────────────┐ │
│ │     photo 2      │ │
│ └──────────────────┘ │
│                      │
│ [ 🚩 Flag ] [ Share ]│
│                      │
│ ── Comments (7) ──   │
│ {h-A} · 2h           │
│ > …                  │
│ {h-B} · 5h           │
│ > …                  │
│                      │
│ [ + Add a comment ]  │
└──────────────────────┘
```

## Information architecture

1. **Constituency breadcrumb** + category badge (orientation).
2. **Meta row** — flag count, comment count, date, author handle.
3. **Disclaimer** (legally required, never collapsed).
4. **Title** (h2).
5. **Body** (markdown, sanitised).
6. **Photo gallery** (1–3, signed URLs).
7. **Action row** — flag + share. (No "like" / "upvote" — preserves §79(2)(b) neutrality.)
8. **Comments** (flat, oldest-first, paginated 20).
9. **Comment composer** (gated by session; verified citizens only).

Hidden by default:
- The complaint's internal `complaint_id` (only `slug` shown in URL).
- The author's `citizen_id` (never exposed).
- The flagger identities (per `ATID-COMMENT-002`).

## Copy

| Slot | Copy |
|------|------|
| Disclaimer | `User-submitted; not verified by Factivist.` |
| Flag CTA | `Flag this complaint` |
| Flag modal heading | `Why are you flagging this?` |
| Flag reasons (radio) | `Defamation` · `Communal / inciting` · `False / misleading` · `Doxxing / private info` · `Other` |
| Flag note placeholder | `Optional: short note for moderators` |
| Flag confirm | `Thanks. Our moderators will review this within 24 hours.` |
| Comment composer placeholder | `Add a comment` |
| Comment composer footer | `Verified citizens only. ≤ 1000 characters.` |
| Anonymous comment prompt | `Sign in to comment.` (links to onboarding) |
| Comment post success | `Comment posted.` |
| Removed complaint | `This complaint was removed by a moderator. See our grievance page if you believe this was a mistake.` |
| Pending complaint (only visible to author) | `This complaint is pending moderation. It is not yet visible to the public.` |

## Components used

- `Complaint.DetailShell`
- `Complaint.BreadcrumbBar`
- `Complaint.MetaRow` (badges, counts)
- `Complaint.DisclaimerStrip` (shared with composer)
- `Complaint.BodyView` (markdown render, sanitised)
- `Complaint.PhotoGallery` (lightbox on web, swipe on mobile)
- `Complaint.FlagButton`
- `Complaint.FlagDialog`
- `Complaint.ShareButton`
- `Comment.Thread` (flat list)
- `Comment.Item`
- `Comment.Composer`
- `Common.RemovedNotice`
- `Common.PendingNotice` (author-only)

## States

| State | Trigger | Behaviour |
|-------|---------|-----------|
| Loading | SSR streaming | Skeleton hero + skeleton body. |
| Empty (comments) | 0 comments | "Be the first verified citizen to comment." |
| Error — 404 | Bad slug | Render the `not-found` page with link back to browse. |
| Error — 410 (removed) | `status='removed'` | Show `RemovedNotice`; do not 404 (transparency). |
| Error — 403 (pending, not author) | `status='moderation_pending'` and viewer != author | 404-equivalent for non-authors. |
| Author preview | author viewing own pending complaint | `PendingNotice` + draft-styled view. |
| Success — comment posted | 201 | Optimistic append + toast. |
| Success — flag submitted | 204 | Flag count bumps; flag button becomes disabled with copy "Flagged". |
| Offline (mobile) | network out mid-read | Cached body remains visible, photos may fail with placeholder. |

## Edge cases

- Signed URL expires while user is reading (web tab open > 1 h) — gallery silently refreshes URLs via TanStack Query on focus.
- User flags twice — second attempt is no-op (server idempotent on `(complaint_id, flagger_id)` unique constraint).
- Markdown body contains a JavaScript URL — sanitised by render pipeline (rehype/sanitize with strict allowlist).
- Comment thread becomes huge (500+) — paginated 20 per page; "Load more" pattern, no infinite scroll on web (a11y).
- Author tries to delete their own complaint — **not supported in S1**; surface explains: "Use the grievance form to request removal."
- Photo URL leaks to crawler — bucket policy blocks unauthenticated reads; signed URL on page itself is short-lived.

## Anonymity invariants (per ADR-010)

This surface MUST NEVER:

- Render the `author_id`, the raw nullifier, or any UIDAI-derived field.
- Render the flagger identity or IP.
- Render the moderator's identity (S1 is single-operator anyway; future-proof).
- Embed referrer/UTM tracking on outbound share links.

## Legal hooks

- **`ATID-LEGAL-010`** — disclaimer string.
- **Rule 3(1)(d)** — flag → queue triggers the 36 h actual-knowledge window; UI clearly tells flagger their flag was received.
- **Rule 3(2)** — flag form mentions the Grievance Officer route for formal complaints (link to `/legal/grievance`).
- **§79(2)(b)** — order is `created_at DESC` and the comment thread is flat with no upvotes — we do not editorialise.

## Open questions

1. Photo gallery on mobile — pinch-zoom or full-screen lightbox? Recommendation: lightbox (closer to Twitter behaviour).
2. Should we surface "Related complaints in the same AC" at the bottom? Strong civic UX win, but PRD does not mention it. Defer to S2 unless user requests.
3. Comment editing — allowed? Recommendation: **no edit, no delete** in S1; preserves audit trail, simplifies moderation. User can flag-self-comment if they want it gone.
