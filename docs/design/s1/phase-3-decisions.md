# Phase 3 — User Decisions (Locked)

User decisions made on 2026-05-23 during the Phase 3 close-out gate review.
Each becomes a Phase 4 ADR ratification; Phase 5 implements against these.

---

## D1 — Constituency picker UX → combobox + breadcrumb (NOT ARIA tree)

**Decision:** Use a combobox-with-breadcrumb pattern for constituency selection
on both Browse (Surface 04 filter) and Composer (Surface 02 picker).

**Reasoning:**
- a11y-auditor flagged ARIA tree (`role="tree"`) as the most fragile keyboard
  widget in S1 — `aria-required-children` / `aria-required-parent` violations
  are serious-impact under WCAG 2.2.
- HeroUI v3 (web) and HeroUI Native (mobile) do not have a polished tree
  primitive; rolling our own across two platforms doubles a11y test surface.
- Same drill-down UX (state → district → PC → AC) can be expressed as four
  chained comboboxes with a breadcrumb showing the current path.

**Phase 4 ADR slot:** ADR-017 — Constituency-picker UX as combobox + breadcrumb.

**Phase 5 impact:**
- Rename ui-templater stubs:
  - `Filter.ConstituencyTree` → `Filter.ConstituencyCombobox` (Browse)
  - `Complaint.ConstituencyPicker` keeps name; internal switch from tree to
    chained-combobox + breadcrumb.
- New shared compound: `Filter.ConstituencyBreadcrumb` (visual trail).
- Mobile: chained `Picker` (iOS) / `Dropdown` (Android M3) with native
  semantics, NOT a custom tree.

**Related:** [a11y-baseline.md](./a11y-baseline.md) §"Risk 1: Constituency
picker keyboard navigation", ADR-013 (manual geo policy).

---

## D2 — rapidsnark on Android → JS snarkjs fallback (iOS keeps rapidsnark)

**Decision:** Ship **JS snarkjs** as the Android proving runtime for S1; ship
**rapidsnark** as the iOS proving runtime. High-end Android devices still get
client-side proving (just ~5× slower); low-end Android falls back to the
server-side prover per ADR-011.

**Reasoning:**
- rapidsnark native binary bundling on Android risks Play Store's 100 MB
  Instant Bundle threshold and inflates cold-install size.
- JS snarkjs on a Pixel 7a / Redmi 13C completes in <2 min — acceptable for
  onboarding (one-time event).
- Eliminates a class of Android-specific native-build failures from CI.

**Phase 4 ADR slot:** ADR-018 — Asymmetric mobile proving runtimes
(rapidsnark on iOS, snarkjs on Android).

**Phase 5 impact:**
- `apps/mobile/src/features/identity/proving.ts` uses `Platform.select` to
  route: iOS → rapidsnark, Android → snarkjs.
- Device-class detection (per [mobile-zkp-proving-ux.md](./mobile-zkp-proving-ux.md))
  still routes low-tier devices to server-side regardless of platform.
- `dev_metrics.llm_calls` logs `prove_runtime` enum: `rapidsnark | snarkjs | server`.
- Phase 7 workflow `mobile-ci.yml` validates Android APK stays under 100 MB.

---

## D3 — Tab order: same across platforms, no Material FAB on Android

**Decision:** Bottom tabs are **Browse / Search / Compose / Profile** in that
order on both iOS and Android. Compose is an inline tab, **not** an elevated
Material 3 FAB.

**Reasoning:**
- ADR-008 mandates single-codebase parity; introducing `Platform.select` for
  tab structure undermines that.
- The FAB pattern adds an opinionated Android-only branch and complicates
  state synchronization (focused-tab indicator + FAB pressed-state).
- The inline Compose tab works on both platforms and a11y is simpler.

**Phase 4 ADR slot:** ADR-019 — Single tab order across iOS + Android, no FAB.

**Phase 5 impact:**
- `apps/mobile/app/(tabs)/_layout.tsx` defines exactly the 4 tabs above.
- `Shell.TabBar` ui-templater stub: confirm `mode: "inline-compose"` is the
  only mode (drop any FAB-mode placeholder).
- Material You opt-out (mobile-designer's earlier recommendation) ALSO
  applies — brand identity stays constant; defer to Phase 4 ADR-020 if user
  later wants to enable.

---

## D4 — Complaint.FlagAction reasons: `pii-leak` is a distinct reason

**Decision:** Flag-action enum is
`spam | abuse | pii-leak | off-topic | duplicate | other`.
`pii-leak` is its own value (NOT merged into `abuse`).

**Reasoning:**
- ADR-010 anonymity violations get a fast-track takedown per IT Rules 2021
  (24h for NCII content; we mirror the SLA voluntarily for any PII leak).
- Treating `pii-leak` as a distinct reason makes the moderation queue able to
  prioritize automatically and produces a cleaner audit trail.

**Phase 4 ADR slot:** ADR-021 — PII-leak as a first-class moderation reason.

**Phase 5 impact:**
- `packages/shared/src/validators/complaint.ts` exports the enum verbatim.
- `Mod.QueueList` ui-templater stub adds a `priority: "pii-leak" | "default"`
  sort key.
- `apps/api/src/routes/moderation` routes `pii-leak` flags to a 24h SLA queue;
  others stay on the standard 36h queue.
- Audit-trail row schema includes `reason` typed against this enum.

---

## Documented defaults (NOT user-asked; revise during Phase 4 if needed)

These came up during Phase 3 but were not lifted to the user-decision tier.
Phase 4 architect may override.

- **Material You dynamic color**: opt-out for S1 (brand identity).
- **`Mod.*` vs `Moderation.*` folder naming**: ui-templater used
  `packages/ui/{web,native}/src/moderation/` folder + `Mod.*` slot names.
  Keep both (folder spelled out, slot names short).
- **`brand*` vs `primary*` semantic tokens**: both shipped; HeroUI v3 reads
  `primary*`, Factivist compounds read `brand*`. Deprecate `primary*` in a
  Phase 6 follow-up.
- **Info hue (220 / cyan-blue)**: ui-templater picked to distance from brand
  (250). Confirm in the Claude Design **Design System** workspace; revise
  `packages/ui/theme/src/tokens/colors.ts` if it diverges.
- **Type ramp**: keep existing `12/14/16/18/20/24/30/36/48` (superset of
  brief's `12/14/16/20/24/32/40`). Add semantic aliases later if needed.
- **Browse "Sort by Most flagged"** (ux-lead Q1): default verified-only;
  revisit with content-strategy in S2.
- **Composer Step 4 cancel** (ux-lead Q2): default = wipe proof immediately
  (privacy-conservative). No 1h cache.
- **`tsvector` language config** (ux-lead Q3): default `english`; punt
  multilingual search to S2 with a `language` column added then.
- **Mobile photo upload alt-text + reorder** (a11y-auditor Risk 2): handled
  in Phase 5 implementation with non-drag long-press alternative + correct
  VoiceOver order; not a separate ADR.
- **ZKP proof progress bar contrast** (a11y-auditor Risk 3): now resolvable
  since ui-templater locked the oklch palette; a11y re-runs during Phase 5.

---

## Phase 4 ADR docket (derived from this file)

| Slot | Title | Source decision |
|------|-------|-----------------|
| ADR-017 | Constituency-picker UX as combobox + breadcrumb | D1 |
| ADR-018 | Asymmetric mobile proving runtimes (rapidsnark iOS, snarkjs Android) | D2 |
| ADR-019 | Single tab order across iOS + Android, no FAB | D3 |
| ADR-020 | Material You opt-out (deferred decision; placeholder) | Documented default |
| ADR-021 | PII-leak as first-class moderation reason | D4 |

Plus the 3 from Phase 1 (ADR-014/015/016 — legal questions) and 3 from Phase 2 (ADR-011/012/013 already in PRD).
