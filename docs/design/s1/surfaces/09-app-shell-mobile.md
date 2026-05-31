# Surface 09 — App-shell mobile screens with offline-friendly skeletons

> Tracking issue: [#32](https://github.com/facktivist/factivist/issues/32)
> Related: [#83 mobile baseline](https://github.com/facktivist/factivist/issues/83)
> Phase: 3 · Owner agent: `ux-lead` (HIG/Material parity reviewed by `mobile-designer`)
> Last edited: 2026-05-23

## Summary

The Expo Router shell that hosts surfaces 01–06 + 08 (Surface 07 is web-only).
Defines the tab bar, navigation stack, deep-link patterns, and — critically
— the offline skeleton + cached-data behaviour for low-connectivity Indian
networks (which is the **majority** of our users). Native parity: iOS HIG +
Material 3.

## User story

> **As a** mobile user on a 3G connection in a Tier-2 city
> **I want** the app to load fast, hold state when I'm offline, and feel native
> **So that** I can submit and read complaints even when the network is unreliable.

## ATIDs gated

This surface gates **no** ATID directly — it's the substrate the others ride on. But it is responsible for:

- Surfacing the `S1_PUBLIC_BROWSE` and `S1_COMPLAINT_SUBMIT` feature flags as user-visible states.
- Honouring `ATID-IDENT-004` device-class routing (low-tier → server prover).
- Honouring `ATID-DISC-003` J&K stale banner across all relevant screens.

## Layout — MOBILE

### Tab bar (root navigation)

```
┌────────────────────────────────────────────┐
│                                            │
│           {current screen}                 │
│                                            │
├────────────────────────────────────────────┤
│  🏠 Home  · 🔍 Search · ➕ Post · 👤 Me   │
└────────────────────────────────────────────┘
```

Four tabs:
- **Home** → Browse (Surface 04) as the default root view.
- **Search** → Search results (Surface 05) with omni-bar focused on entry.
- **Post** → If verified: Complaint Composer (Surface 02). If not: route to Onboarding (Surface 01).
- **Me** → If verified: Own profile (Surface 06). If not: a tiny "Sign in to claim a handle" card linking to Onboarding.

### Deep-link patterns

| URL pattern | Routes to |
|-------------|-----------|
| `factivist://complaint/:slug` or `https://factivist.in/complaints/:slug` | Surface 03 |
| `factivist://browse?state=...&pc=...` | Surface 04 |
| `factivist://search?q=...` | Surface 05 |
| `factivist://citizen/:handle` | Surface 06 |
| `factivist://onboarding` | Surface 01 |
| `https://factivist.in/legal/*` | Web in-app browser (Surface 08) |

### Offline skeleton screens

When the device is offline (or the request times out > 8 s), every list view renders:

```
┌──────────────────────┐
│  Home                │
│  [⚠ Offline]         │  ← sticky banner
├──────────────────────┤
│ ░░░░░░░░░░░░░░░░░░░░ │
│ ░░░░░ ░░░░ ░░░ ░░░░░ │  ← cached preview
│                      │
│ ░░░░░░░░░░░░░░░░░░░░ │
│ ░░░░░ ░░░░ ░░░ ░░░░░ │
│                      │
│ ─ Cached results ─   │  ← if any
│                      │
│ 🚧 Potholes 100ft    │
│ Roads · 2h · 🚩4 💬7 │
│                      │
│ [ Retry ]            │
└──────────────────────┘
```

Composer offline:

```
┌──────────────────────┐
│ ←  New complaint     │
│  [⚠ Offline]         │
├──────────────────────┤
│ Your draft is saved  │
│ locally. We'll       │
│ publish it the next  │
│ time you connect.    │
│                      │
│ [Continue editing]   │
└──────────────────────┘
```

### First-launch sequence

```
1. Splash (logo + 1-line promise)
2. Network check
3. If first-launch:  → Onboarding (Surface 01)
   If returning + session cookie valid:  → Home tab
   If returning + session expired:  → Home tab as anonymous + "Sign in to comment/post" affordance.
```

## Information architecture (mobile)

- **Tab-bar-first** navigation (HIG/Material both prefer it over hamburger).
- **No hamburger menu** — secondary nav (Legal, About) lives under the **Me** tab when signed out, and a "More" item when signed in.
- **No push notifications in S1** (privacy + cost). Will revisit S2.
- **No background tasks in S1** beyond the tus resumable upload retry (Supabase Storage).

## Copy

| Slot | Copy |
|------|------|
| Tab — Home | `Home` |
| Tab — Search | `Search` |
| Tab — Post | `Post` |
| Tab — Me | `Me` |
| Offline banner | `Offline — showing cached content.` |
| Offline submit | `Your draft will publish when you reconnect.` |
| Splash subline | `Civic complaints, citizen-verified, never identified.` |
| First-launch CTA | `Get started` (→ Onboarding) |
| Anonymous Me-tab card | `Sign in to claim a handle and post complaints.` |
| Update available (later) | `A new version of Factivist is ready.` |

## Components used

- `Shell.RootNavigator` (Expo Router root)
- `Shell.TabBar` (4 tabs, native styles)
- `Shell.Splash`
- `Shell.OfflineBanner` (sticky on top of any tab)
- `Shell.NetworkSentinel` (TanStack Query + NetInfo bridge)
- `Shell.DeepLinkRouter`
- `Shell.LowTierProverRouter` (`ATID-IDENT-004` runtime device-class check)
- `Skeleton.ComplaintCard`
- `Skeleton.ProfileCard`
- `Skeleton.QueueCard` (unused on mobile but kept aligned for symmetry)
- `Common.OfflineCta`

## States

| State | Trigger | Behaviour |
|-------|---------|-----------|
| Cold start | App launch | Splash 800 ms max → first frame; never block on network beyond 1 s. |
| First-time | No session | Auto-route to Onboarding. |
| Returning, verified | Valid session cookie | Land on Home. |
| Returning, expired | Cookie invalid | Land on Home as anonymous; preserve last filter. |
| Offline (cold) | No cache, no network | Render onboarding consent placeholder + offline banner; allow reading static legal pages bundled in app. |
| Offline (warm) | Cache hit, no network | Render cached lists with banner + Retry. |
| Network restored | NetInfo reconnect | Auto-revalidate via TanStack; clear banner. |
| Feature flag off (S1_PUBLIC_BROWSE=false) | Server | Render "Browsing is currently disabled" with link to legal/grievance. |
| Feature flag off (S1_COMPLAINT_SUBMIT=false) | Server | Post tab shows: "Posting is currently disabled. Please check back soon." |

## Edge cases

- App on flight mode at launch — bundled legal pages (Surface 08) remain reachable; everything else shows offline banner with the "Retry" action.
- App backgrounded mid-onboarding — proof generation pauses; on resume, re-check progress; if proof was generated but not submitted, surface "Resume verification?" prompt.
- Mid-upload network drop — tus resumable upload retries with exponential backoff (3 attempts); on third failure, draft preserved locally.
- Low-tier device detection on app launch — sets a session flag that the onboarding ScanStep reads to route proving (no PII leaks per `ATID-IDENT-004`).
- App version forces upgrade (S2) — out of scope for S1; just register the slot.

## Anonymity invariants

- The shell MUST NOT register any analytics SDK that collects device identifiers in S1. Sentry (`apps/mobile`) is configured with `beforeSend` to scrub PII.
- The deep-link router MUST NOT expose `citizen_id` or any UUID in URLs — only `handle` and `slug`.
- Push tokens — **not requested** in S1 (no notifications). Means no APNS/FCM token persistence.

## Legal hooks

- **CERT-In Direction** — NTP via `time.nic.in` configured at the OS level; we add a synthetic check on app launch (warn only — we can't force OS NTP).
- **DPDP §5** — minimum permissions: camera (onboarding), photo library (composer), network. No location, no contacts, no microphone.

## Open questions

1. Should the splash include a small "Verified citizens online" counter? Civic UX nice-to-have; trivially de-anonymising at low counts (don't bother in S1).
2. Should the Post tab be `+` (FAB-style overlay) instead of a tab? Tab is more discoverable; FAB is more native. Recommend Tab in S1 (we want discoverability).
3. iPad / tablet behaviour — S1 ships phone-only (PRD doesn't mention tablet). Tablet renders the phone layout scaled. Confirm.
