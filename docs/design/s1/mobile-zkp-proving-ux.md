# S1 Mobile ZKP Hybrid Proving — UX Specification

> **Role:** mobile-designer (Phase 3 design swarm)
> **Architectural anchor:** ADR-011 — Hybrid proving (server-side default,
>   client-side opt-in on capable devices). zkp-researcher findings published
>   in the GitHub Wiki at `Research-Anoncitizen-ZKP` and
>   `Research-Polygon-Gas`.
> **Cross-link:** Onboarding flow Surface 1 in [`mobile-platform-deltas.md`](./mobile-platform-deltas.md#surface-1--onboarding--anoncitizen-zkp-verification).

---

## What the user actually does

From the user's perspective there is **one experience**: "Verify you're a
unique Indian citizen." They scan a QR (or get app-handed-off from
anoncitizen), wait through a progress screen, and arrive at the
"Welcome" state with their anonymous handle. They never see the words "ZKP"
or "snarkjs" or "rapidsnark" unless they tap into the explainer.

What changes underneath is **where the proof is generated** — server-side or
on-device. This document defines the UX for both paths and the routing logic
between them.

---

## Why hybrid (recap of ADR-011)

| Path | Pros | Cons |
|------|------|------|
| Server-side (default) | Works on every Android/iOS device. Predictable proving time (~3–6s on Fly.io shared-cpu-1x). Lower client battery drain. | User trusts our server to handle the witness honestly. Centralization point. |
| Client-side (opt-in, capable devices) | Stronger anonymity guarantee (witness never leaves device). No server trust required for proving. | 8–60s on mid-tier Android; battery + heat impact. Phone may show "App is using lots of energy" warning on iOS. |

S1 ships hybrid: **server-side by default, on-device only when the user opts
in AND the device passes the capability gate**.

---

## Device capability gate

A device is eligible for client-side proving if **all** of:

| Check | Threshold | Source |
|-------|-----------|--------|
| RAM | ≥ 4 GB | `expo-device` `totalMemory` |
| iOS model | iPhone 12 / iPhone 12 mini or newer (A14 Bionic+) | `Device.modelId` whitelist |
| Android model | Pixel 6 / Snapdragon 7-gen-1 or better (heuristic: chip benchmark score in our allowlist) | Allowlist seeded from zkp-researcher's Indian-market benchmark (Project issue #23) |
| OS version | iOS ≥ 16, Android ≥ 13 | `Device.osVersion` |
| Battery state | Not in Low Power Mode (iOS) / not in Battery Saver (Android) | `expo-battery` |
| Thermal state | Not "serious" or "critical" (iOS) / not "throttling" (Android) | `expo-device` thermal API |
| Network state | Wi-Fi (NOT metered cellular) | `@react-native-community/netinfo` |

The gate runs at the **moment the user opts in**, not on app launch. If any
check fails after opt-in, fall back silently to server-side for that
verification attempt (and show explanatory chip — see "Fallback paths" below).

---

## UX states

### State 1 — Pre-verify

Surface 1.2 (privacy promise) ends with a primary CTA "Continue with
verification." A subtle secondary affordance below the CTA:

```
  [ ⚙ Advanced: generate proof on this device ]
```

Tap → bottom sheet:

```
┌─────────────────────────────────────────────┐
│ Generate proof on this device?              │
│                                             │
│ Stronger privacy: your verification data    │
│ never leaves your phone. Takes 30–60 s on   │
│ Wi-Fi. Uses some battery.                   │
│                                             │
│ Default is faster and works on any phone.   │
│                                             │
│  ▢ Use device for proving (opt-in)          │
│                                             │
│            [ Save ]    [ Cancel ]            │
└─────────────────────────────────────────────┘
```

User saves preference → stored in MMKV `zkp.prefersOnDeviceProving`.

### State 2 — Verify start (Surface 1.3)

QR scan / anoncitizen handoff completes. App receives the citizen credential
material.

```ts
const routing = decideProvingRoute({
  userPreference: storage.getBoolean('zkp.prefersOnDeviceProving'),
  deviceCheck: runCapabilityGate()
})
```

Routing decision matrix:

| User pref | Device passes gate | Decision |
|-----------|--------------------|----------|
| Off (default) | — | Server-side |
| On | Yes | Client-side |
| On | No | Server-side + show one-time chip "Your device isn't fast enough yet — we'll prove on our server this time." |

### State 3a — Server-side proving (default path)

Modal sheet appears (Surface 1.4):

```
┌─────────────────────────────────────────────┐
│                                             │
│            ◐  Verifying you                 │
│                                             │
│   Generating your proof on our server.      │
│   Usually takes about 5 seconds.            │
│                                             │
│       ▱▱▱▱▱▱▱▱▱▱▱▱▱  ←  indeterminate       │
│                                             │
│              [ Cancel ]                     │
│                                             │
└─────────────────────────────────────────────┘
```

- Spinner = indeterminate; we do NOT show fake percentages.
- Cancel = abort the API call, return to Surface 1.3.
- Timeout: 30s → escalate to error state.
- Network hiccup: TanStack Query retries 2× before erroring.
- Success: animate ✓ check, haptic success, navigate to Surface 1.5.

### State 3b — Client-side proving (opt-in path)

Modal sheet, same chrome but with **determinate** progress + cancel + thermal
awareness:

```
┌─────────────────────────────────────────────┐
│                                             │
│            ⚙  Proving on this device        │
│                                             │
│   Your phone is generating the proof now.   │
│   This takes 30–60 seconds.                 │
│                                             │
│  ▰▰▰▰▰▰▰▰▱▱▱▱▱▱▱▱▱▱▱▱   42%                 │
│                                             │
│   Step 2 of 5 — witness generation          │
│                                             │
│              [ Cancel ]                     │
│                                             │
│   📱 Keep the screen on for fastest result. │
│                                             │
└─────────────────────────────────────────────┘
```

- Progress is **stage-based**, not time-based:
  1. Loading circuit — 5%
  2. Witness generation — 35%
  3. Proof generation (snarkjs / rapidsnark) — 50%
  4. Proof verification (local sanity) — 5%
  5. Submission to server — 5%
- Stage label updates: "Loading circuit" → "Generating witness" → "Computing
  proof" → "Verifying" → "Submitting."
- Cancel = stop the worker, return to Surface 1.3, restore the chosen route
  in MMKV (don't force back to server-side automatically).
- Background handling: if app backgrounds during proving, **pause** if
  possible (rapidsnark allows; snarkjs JS path may not — flag for Phase 5
  spike). Show resume button on foreground.
- Thermal escalation: poll `Device.thermalState` every 2s during proving. If
  it crosses to "serious" → show inline warning, "Your phone is getting warm.
  Continue anyway, or switch to server proving?"

### State 4 — Success (Surface 1.5)

Single screen:

```
   ✓  You're verified

   Welcome, citizen @marigold-fox-471

   Your anonymous handle is yours.
   We don't know who you are.

      [ Start exploring ]
```

- Handle is derived from nullifier — deterministic, friendly, two-word + 3-digit.
- Animation: gentle scale-up of check + haptic success.
- No celebratory confetti (avoid mocking a serious civic action).

### State 5 — Error

Three error classes:

| Class | Trigger | Recovery |
|-------|---------|----------|
| **Network** | Server unreachable, timeout | "We couldn't reach our server. Check your connection." Retry button (TanStack mutation retry). |
| **Cryptographic** | Invalid witness, proof verification fail | "Something went wrong with your verification. Please try again." Retry restarts from Surface 1.3 (re-scan QR). |
| **Nullifier already used** | This citizen already verified on another device | "Looks like you already verified on another device. Sign out there to use this device." Explainer link → onboarding restart. |

All error screens use the same template (HeroUI Native `Empty.State` compound)
with the appropriate icon (network, lock, identity) + headline + supporting
copy + primary CTA + tertiary "Get help" → grievance email (deep link).

---

## Fallback paths

### Opted-in but device fails gate

- Show one-time chip in proving modal: "Your device isn't fast enough yet —
  we'll prove on our server this time."
- Do NOT auto-flip the user preference. They may upgrade their device later
  and want to retry.
- Add an info link → onboarding setting page showing why their device didn't
  qualify (transparent: "We require iPhone 12+ or Pixel 6+ for on-device
  proving.")

### Opted-in, gate passes, then thermal/battery degrades mid-proof

- Show warning sheet at 70% thermal (warm but not hot):
  ```
  Your phone is heating up. The proof is almost done.
  Continue, or switch to server (faster)?
  [ Continue on device ]   [ Switch to server ]
  ```
- If user chooses switch: abort local proof worker, kick off server-side call,
  show "Finishing on server…" message.

### Opted-in but on cellular

- Gate fails on metered network — fall back to server with chip "You're on
  mobile data. We'll use the server this time. Try again on Wi-Fi for
  on-device proving."

---

## Accessibility

| Concern | Behavior |
|---------|----------|
| Screen reader | Proving modal announces each stage transition via `AccessibilityInfo.announceForAccessibility("Step 2 of 5, generating witness")`. Avoid announcing every percentage. |
| Reduced motion | Shimmer replaced with static "Working…" text + indeterminate progress bar that increments stage-by-stage only. |
| Large text | Progress chrome must reflow at 200% font scale; no clipping. Tested as part of a11y-auditor's Phase 3 audit. |
| Color | Progress bar + state icons MUST hit WCAG AA on both light and dark themes. Stage label color tokens locked in `packages/ui/theme`. |
| Cancel button | Always present; never gray out. Even mid-rapidsnark proof, cancelling is the user's right. |

---

## Telemetry (privacy-preserving)

We log **without** linking to user identity:

| Event | Properties |
|-------|-----------|
| `zkp.proving.started` | route ('server' / 'client'), device tier, network type |
| `zkp.proving.completed` | duration_ms, route, success (bool) |
| `zkp.proving.failed` | error_class ('network' / 'crypto' / 'nullifier_used'), route, duration_ms |
| `zkp.proving.cancelled` | route, stage_reached, duration_ms |

These feed the `dev_metrics.llm_calls`-equivalent Phase 2 dashboard for chain
+ proving cost calibration. NEVER log nullifier, witness, or any input to the
circuit.

---

## Engineering hand-off (for Phase 5 mobile-dev)

- Server-side endpoint: `POST /identity/verify-server` (Phase 5.A — id-coder).
  Accepts citizen credential, returns proof + verification status. Should
  reject if nullifier already used (returns 409).
- Client-side worker: lives in `apps/mobile/src/lib/zkp/`. Uses `snarkjs` (JS)
  for iOS via Hermes; for Android, prefer `react-native-rapidsnark` (native
  module wrapper). Worker runs on a separate JS thread via
  `react-native-worklets-core` to avoid UI jank.
- Circuit + key material: bundled in app assets (~6MB; acceptable for S1).
  Updated only via app store releases, never OTA.
- Device gate code: `apps/mobile/src/lib/zkp/capability-gate.ts` — pure JS,
  testable without device.

---

## Open questions for Phase 4 architect / sec-architect

1. **rapidsnark bundle size on Android** — does the precompiled binary push
   the APK over the 100MB IAB limit? zkp-researcher to confirm in Phase 4.
2. **iOS background mode** — should we declare a background mode so proving
   continues if app backgrounds? Likely **no** for S1 (App Review scrutiny);
   user keeps screen on.
3. **Telemetry sink** — Sentry (Phase 8) vs. our own table? Sentry's breadcrumb
   model fits proving-step events well; defer decision to observability-designer.

---

## Cross-references

- ADR-011 (hybrid proving): `docs/adr/0011-*.md` (Phase 4 — adr-writer owns)
- Surface 1 onboarding deltas: [`mobile-platform-deltas.md`](./mobile-platform-deltas.md#surface-1--onboarding--anoncitizen-zkp-verification)
- Expo routing: [`expo-router-routes.md`](./expo-router-routes.md#surface--route-mapping) (routes `/(onboarding)/proving`, `/(onboarding)/success`, `/(onboarding)/biometric`)
- Indian-market benchmark issue: Project #3 issue #23 (Story: Indian-market mobile device benchmark for ZKP proving) — drives the device allowlist.
