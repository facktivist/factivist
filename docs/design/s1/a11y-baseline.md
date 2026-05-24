# S1 — Accessibility Baseline (WCAG 2.2 Level AA)

> Phase: 3 · Owner agent: `a11y-auditor` · Last edited: 2026-05-23
> Tracking issue: [#34](https://github.com/raveracker/factivist/issues/34)
> Action plan: [`docs/action-plans/season-1/s1-action-plan.md`](../../action-plans/season-1/s1-action-plan.md) §3.4 / §3.5
> Mobile deltas: [`./a11y-mobile-deltas.md`](./a11y-mobile-deltas.md)

## Charter

Every surface Factivist ships in S1 **must** meet WCAG 2.2 Level AA with
**zero `serious` or `critical` axe-core violations** on the high-fidelity
preview render. This document is the authoritative gate spec; the
matching enforcement runner is [`/scripts/a11y/run-axe-baseline.ts`](../../../scripts/a11y/run-axe-baseline.ts).

A failure of this gate **blocks the Phase 3 exit** and **blocks the Phase 7
staging deploy**. See "How this is enforced in CI" at the bottom of this
document for the merge-time vs deploy-time split.

## Conformance target

| Property | Value |
|---|---|
| Standard | WCAG 2.2 |
| Level | AA |
| Pages in scope | All 9 S1 surfaces (web + mobile), all legal pages, the moderation queue admin shell |
| Pages excluded | None. Even admin-only screens (Moderation queue) must pass. |
| Acceptable violation severity | `minor`, `moderate` — must each have a remediation issue with a deadline before S1 GA. `serious` and `critical` are **non-shippable**. |
| Snapshot file location | `scripts/a11y/baseline/<surface>.json` — only `incomplete` and `moderate` findings may be snapshotted. |
| Automated coverage | axe-core ≥ 4.10 via `@axe-core/playwright` on web; `@react-native-aria/*` lint + manual VoiceOver / TalkBack on mobile |
| Manual coverage | Keyboard pass, VoiceOver pass, TalkBack pass, 200% zoom pass, prefers-reduced-motion pass, forced-colors / Windows High Contrast pass |

## WCAG 2.2 — new success criteria explicitly addressed

WCAG 2.2 adds nine criteria over 2.1. Each is enumerated below with the S1
surface(s) it most directly governs.

| SC | Title | Level | Where it bites in S1 |
|---|---|---|---|
| 2.4.11 | Focus Not Obscured (Minimum) | AA | Composer floating action bar must not hide the focused field; mobile sticky "Submit" must not cover the focused photo thumbnail. |
| 2.4.12 | Focus Not Obscured (Enhanced) | AAA | Stretch — encouraged on mobile bottom-sheets. Not gating. |
| 2.4.13 | Focus Appearance | AAA | Stretch — we target the AA practical baseline (≥ 2 px outline, ≥ 3:1 contrast against adjacent). Not gating, but enforced via design tokens. |
| 2.5.7 | Dragging Movements | AA | Photo-reorder in Composer MUST offer a non-drag alternative (up/down buttons or context menu). Filter tree may not be drag-only. |
| 2.5.8 | Target Size (Minimum) | AA | All tappable / clickable controls ≥ 24×24 CSS px (web) and ≥ 44×44 pt (iOS HIG / mobile). Inline links within text are exempt per the SC's "inline" exception. |
| 3.2.6 | Consistent Help | A | Footer "Get help" link must be in the same relative location on every surface. Onboarding's inline "Why we verify" content does not satisfy this — the global help link is what gates. |
| 3.3.7 | Redundant Entry | A | The ZKP onboarding flow MUST NOT ask the user to re-enter state/district after the proof has already encoded them. Composer pre-fills constituency from citizen credential. |
| 3.3.8 | Accessible Authentication (Minimum) | AA | The ZKP path itself is the auth — no cognitive function test, no captcha. Server-prover fallback may not introduce a captcha. |
| 3.3.9 | Accessible Authentication (Enhanced) | AAA | Stretch. ZKP-only naturally satisfies this. |

## Global rules (apply to every surface)

1. **Single H1** per page; logical heading hierarchy with no skipped levels.
2. **Landmarks**: every page has `<header>` (`role="banner"`), `<nav>` (`role="navigation"`, with `aria-label`), `<main>` (`role="main"`, single instance), `<footer>` (`role="contentinfo"`). Aside content uses `<aside>` (`role="complementary"`).
3. **Language**: `<html lang="en">` until Phase 6 i18n; mobile uses `accessibilityLanguage` where supported.
4. **Skip link**: first focusable element on web is "Skip to main content" pointing at `#main`.
5. **Focus management**: route transitions move focus to the new `<main>`'s H1; modal open moves focus to the first focusable element inside the modal; modal close restores focus to the trigger.
6. **Focus visible**: `:focus-visible` outline ≥ 2 px, contrast ≥ 3:1 with adjacent colour. Never `outline: none` without a visible replacement.
7. **Colour contrast**: ≥ 4.5:1 normal text, ≥ 3:1 large text (≥ 18 pt / 24 px or ≥ 14 pt bold / 18.66 px bold), ≥ 3:1 non-text UI components and graphical objects.
8. **Motion**: every animation honours `@media (prefers-reduced-motion: reduce)` — duration ≤ 0 ms, no parallax, no auto-playing video.
9. **Dynamic type**: web supports 200% zoom with no loss of content / function; mobile honours the OS font-scale up to at least the largest non-Accessibility setting (`Accessibility5` on iOS / 200% on Android).
10. **Forms**: every input has a programmatic label (`<label for>` or `aria-labelledby`); errors are announced via `aria-invalid="true"` plus `aria-describedby` pointing at the error message; required is conveyed via `required` + visible "Required" text (never colour alone).
11. **Live regions**: async results (proof generated, complaint submitted, moderation decision) are announced through a single page-level `role="status"` (polite) live region. Critical errors use `role="alert"` (assertive) sparingly.
12. **Images**: every `<img>` has `alt`; decorative images use `alt=""`; informative SVGs use `<title>` + `role="img"`. Citizen-uploaded photos in the Composer carry an editable alt text field (this is also why the EXIF strip happens server-side — the user can describe the image without us reading where it was taken).
13. **Link / button discipline**: `<a>` navigates URLs, `<button>` performs actions. Never the inverse. Icon-only buttons carry `aria-label`.
14. **Target size**: ≥ 24×24 CSS px hit area on web (WCAG 2.2 SC 2.5.8); ≥ 44×44 pt on iOS, ≥ 48×48 dp on Android (platform HIG, exceeds SC 2.5.8).
15. **Drag alternatives**: any drag interaction (photo reorder, filter chip rearrange) ships a non-drag fallback (SC 2.5.7).

## The 9 S1 surfaces — per-surface checklist

Each surface lists:
- **Landmarks & focus order** — what `<main>` looks like and how Tab traverses.
- **Keyboard interaction map** — every action a mouse user can take, with the equivalent key.
- **VoiceOver / TalkBack labels** — only the strings that need explicit `aria-label` or `accessibilityLabel`; everything else inherits from the visible text.
- **Live regions** — what gets announced and on what politeness level.
- **Contrast minima** — surfaces with custom illustrations or branded colour need an explicit minimum.
- **Motion-reduce honor** — what animation collapses to.
- **Dynamic type honor** — what reflows.
- **Form-error association** — `aria-invalid` + `aria-describedby` pairs.
- **Must-pass axe-core rules** — the rule IDs CI will enforce.
- **Disabled axe-core rules** — exceptions, each justified.

---

### Surface 01 — Onboarding + anoncitizen ZKP verification

**Route:** `/onboarding` (web), `(onboarding)` stack (mobile)
**Specs:** [`./surfaces/01-onboarding.md`](./surfaces/01-onboarding.md)

- **Landmarks & focus order**: `banner > nav` → `main > h1 ("Verify you're a unique Indian citizen")` → Step indicator (`role="group"`, `aria-label="Onboarding progress, step 1 of 4"`) → Step body (`<section aria-labelledby>`) → Primary action button → "Read the ZKP explainer" link → `contentinfo`.
- **Keyboard map**:
  - `Tab` / `Shift+Tab`: linear forward / back through interactive elements.
  - `Enter` / `Space` on "Continue": advance step.
  - `Esc` on the proof-generation modal: cancel (with confirm if proof is in flight).
  - QR scanner step exposes a "Use file upload instead" button — keyboard-only equivalent.
- **VoiceOver / TalkBack labels**:
  - Step indicator: `accessibilityLabel="Step 1 of 4: Why we verify"`.
  - QR scanner view: `accessibilityLabel="Camera viewfinder, scan your Aadhaar QR code"`, role `image`, with a parallel "Upload QR image" alternative.
  - Consent checkboxes: each carries the full statement text as its label (never just "I agree"). Mandatory consent uses `aria-required="true"` + visible "Required".
- **Live regions**: `role="status"` announces "Generating proof, this may take 10–30 seconds on this device" and "Proof verified, you can now contribute". The 409 replay-nullifier path uses `role="alert"` with "This Aadhaar has already been verified on Factivist".
- **Contrast minima**: 4.5:1 on the body text, 3:1 on the step indicator dots and the "Why we verify" diagram strokes.
- **Motion-reduce honor**: Step transitions collapse from 200 ms slide to 0 ms cross-fade. The proof-progress spinner becomes a static "Generating proof…" string with a polite live region.
- **Dynamic type honor**: Step indicator wraps to two rows below 320 px wide; consent checkbox labels never truncate.
- **Form-error association**: Each unchecked mandatory consent gets `aria-invalid="true"` plus `aria-describedby="consent-mandatory-err"`; the same node is referenced by the announce-on-submit alert.
- **Must-pass axe-core**: `color-contrast`, `label`, `button-name`, `link-name`, `aria-required-attr`, `aria-valid-attr-value`, `focus-order-semantics`, `region`, `heading-order`, `landmark-one-main`, `page-has-heading-one`.
- **Disabled axe-core**: none.

---

### Surface 02 — Complaint composer (text + 1–3 photos + category + constituency)

**Route:** `/complaints/new` (web), `(complaint)/new` (mobile)

- **Landmarks & focus order**: `main > h1 ("New complaint")` → Constituency picker (combobox) → Category picker (combobox) → Title (`<input type="text">`) → Body (`<textarea>`) → Photo upload region (`role="group"`, `aria-label="Photo evidence, up to 3 images"`) → "Add photo" button + uploaded thumbnails (`role="listitem"` inside `role="list"`) → Submit button.
- **Keyboard map**:
  - Constituency combobox follows ARIA 1.2 combobox pattern: `Down` opens, `Up`/`Down` traverse, `Home`/`End` jump, `Esc` closes, `Enter` selects.
  - Category combobox: same.
  - Photo region: `Tab` lands on "Add photo"; each thumbnail is focusable and exposes "Move up" / "Move down" / "Remove" buttons — keyboard-equivalent to drag-reorder (SC 2.5.7).
  - `Ctrl+Enter` / `Cmd+Enter` submits; documented in the inline help.
- **VoiceOver / TalkBack labels**:
  - Photo thumbnails: `accessibilityLabel="Photo 1 of 3: <user-provided alt or filename>"`.
  - "Remove photo" buttons: `accessibilityLabel="Remove photo 1"` and `accessibilityHint="Removes this photo from your complaint"`.
  - The alt-text editor under each thumbnail is `accessibilityLabel="Description for photo 1, for screen reader users"`.
- **Live regions**: `role="status"` announces "Photo uploaded, 1 of 3", "Photo removed", and "Submitting complaint". `role="alert"` announces validation failures and upload failures.
- **Contrast minima**: 4.5:1 on placeholder text — we **do not** rely on placeholder as a label substitute.
- **Motion-reduce honor**: Photo-thumbnail animations are 0 ms; "Submit" success checkmark stays static.
- **Dynamic type honor**: At 200% zoom / largest font-scale, the photo grid collapses to a single column; the constituency picker stays a combobox (does not degrade to native `<select>` because the dataset is too large — instead the listbox grows to fill 70% viewport height).
- **Form-error association**: Each field carries `aria-invalid` plus `aria-describedby="<field>-err"`. The summary at the top of the form (visible after first submit attempt) is `role="alert"` and lists each error as a link that focuses the failing field.
- **Must-pass axe-core**: `label`, `color-contrast`, `aria-required-attr`, `aria-valid-attr-value`, `aria-allowed-attr`, `button-name`, `link-name`, `image-alt`, `input-button-name`, `region`, `heading-order`, `landmark-one-main`, `page-has-heading-one`, `nested-interactive`, `listitem`, `list`.
- **Disabled axe-core**: none.

---

### Surface 03 — Complaint detail (read, comment, flag)

**Route:** `/complaints/[id]` (web), `(complaint)/[id]` (mobile)

- **Landmarks & focus order**: `main > h1 (complaint title)` → metadata block (`<dl>`) → photo gallery (`role="region"`, `aria-label="Photo evidence"`) → complaint body → "Flag this complaint" button → comments section (`<section aria-labelledby="comments-h">`) → comment composer (auth-gated).
- **Keyboard map**:
  - Photo gallery: `Left`/`Right` arrows move between thumbnails; `Enter` opens the lightbox; `Esc` closes; focus restored to the originating thumbnail.
  - Flag button opens a modal — focus-trap, `Esc` closes, returns focus to "Flag".
  - Comment composer follows the same Ctrl/Cmd+Enter submit convention as the main Composer.
- **VoiceOver / TalkBack labels**:
  - Lightbox uses `accessibilityRole="image"` with `accessibilityLabel="<user-provided alt> — photo 2 of 3"`.
  - Flag-reason radio group: `accessibilityRole="radiogroup"`, `accessibilityLabel="Reason for flagging"`.
- **Live regions**: comment submission, flag submission, and moderator decision updates all post into the page-level polite live region.
- **Contrast minima**: 4.5:1 on metadata `<dt>` and `<dd>` text; 3:1 on the flag-icon graphic.
- **Motion-reduce honor**: Lightbox open/close transitions collapse to 0 ms.
- **Dynamic type honor**: Photo gallery becomes a single column at 200% zoom; comments thread indentation collapses to a left border + author prefix.
- **Form-error association**: Comment composer follows the same `aria-invalid` + `aria-describedby` pattern as the main Composer.
- **Must-pass axe-core**: `color-contrast`, `image-alt`, `button-name`, `link-name`, `landmark-one-main`, `page-has-heading-one`, `heading-order`, `region`, `aria-dialog-name` (for the flag modal), `dialog-name`.
- **Disabled axe-core**: none.

---

### Surface 04 — Browse / filter by state → district → constituency

**Route:** `/browse` (web), `(browse)` stack (mobile)

- **Landmarks & focus order**: `main > h1 ("Browse complaints")` → filter sidebar (`role="region"`, `aria-label="Filters"` — `<aside>` on web, collapsible bottom-sheet on mobile) → results list (`role="region"`, `aria-label="Search results"`) → pagination (`role="navigation"`, `aria-label="Pagination"`).
- **Keyboard map**:
  - Filter tree (state → district → constituency) is a single `role="tree"` with `Up`/`Down` to traverse, `Right` to expand, `Left` to collapse, `Enter` / `Space` to toggle selection.
  - Result cards are links — `Tab` traverses; `Enter` opens.
  - Pagination: `Home`/`End` jump to first/last; otherwise standard `Tab` traversal.
- **VoiceOver / TalkBack labels**:
  - Each tree node: `accessibilityLabel="<name>, <count> complaints"`, `accessibilityState={{ expanded, selected }}`.
  - Result card: programmatic label is `"<title>, <constituency>, <relative time>, <comment count> comments"`.
- **Live regions**: Result-count and "filters applied" use `role="status"` — e.g. "47 complaints, filtered by Karnataka and Bengaluru South". Pagination position is also announced.
- **Contrast minima**: 4.5:1 on body text, 3:1 on the constituency-tree connector lines.
- **Motion-reduce honor**: Tree expand/collapse collapses to 0 ms; filter-applied chips animate in at 0 ms.
- **Dynamic type honor**: Sidebar collapses to a "Filters" button + bottom-sheet at viewport ≤ 768 px or font-scale ≥ 1.5; tree depth remains keyboard-navigable.
- **Form-error association**: Filter combobox (constituency search inside the tree) follows ARIA combobox; invalid filter combinations surface a `role="alert"` ("No district matches Karnataka × West Bengal — clearing the secondary filter").
- **Must-pass axe-core**: `color-contrast`, `aria-tree`, `aria-valid-attr-value`, `aria-allowed-role`, `landmark-one-main`, `page-has-heading-one`, `heading-order`, `link-name`, `button-name`, `region`.
- **Disabled axe-core**: none.

---

### Surface 05 — Postgres full-text search results

**Route:** `/search?q=…` (web), `(search)` stack (mobile)

- **Landmarks & focus order**: `main > h1 ("Search")` → search form (`role="search"`) → results region → pagination.
- **Keyboard map**:
  - Search input: `Enter` submits; `Esc` clears.
  - Result cards same as Browse.
  - Empty / zero-results state offers a "Try Browse instead" link, keyboard-reachable.
- **VoiceOver / TalkBack labels**:
  - Search input: `accessibilityLabel="Search complaints"`, `accessibilityHint="Searches title, body and category"`.
  - "47 results for ‘pothole'" is in a `role="status"` live region — announced after each query.
- **Live regions**: result-count, "loading", and "no results" all post into the polite live region.
- **Contrast minima**: 4.5:1 on body, 4.5:1 on the highlighted search-match span (we **do not** rely on a yellow background alone — the match also uses semibold weight).
- **Motion-reduce honor**: Skeleton loaders honour reduced motion by switching from shimmer to a static "Loading…" string with a polite announcement.
- **Dynamic type honor**: Result snippets line-wrap; truncation uses `text-overflow: ellipsis` with `aria-label` carrying the full title.
- **Form-error association**: Empty query on submit announces "Please enter a search term" via `role="alert"` and sets `aria-invalid` on the input.
- **Must-pass axe-core**: `color-contrast`, `label`, `input-button-name`, `landmark-one-main`, `page-has-heading-one`, `heading-order`, `link-name`, `region`.
- **Disabled axe-core**: none.

---

### Surface 06 — Citizen profile (anonymous handle, count, no PII)

**Route:** `/c/[handle]` (web), `(profile)/[handle]` (mobile)

- **Landmarks & focus order**: `main > h1 (handle)` → profile metadata (`<dl>`: joined date, state, district, complaint count) → tab list (`role="tablist"`: Complaints | Comments) → tab panel.
- **Keyboard map**:
  - Tabs follow ARIA 1.2 tab pattern: `Left`/`Right` move between tabs; `Home`/`End` jump; selection follows focus by default.
  - Each complaint card in the tab panel is a link.
- **VoiceOver / TalkBack labels**:
  - Handle heading: visible text only — we do **not** label it as "username" anywhere, because the handle is intentionally non-identifying.
  - Tabs: `accessibilityRole="tab"`, `accessibilityState={{ selected: true }}` on the active one.
- **Live regions**: Tab change announces "Showing complaints by <handle>" via polite status.
- **Contrast minima**: 4.5:1 on `<dt>` / `<dd>`; 3:1 on the tab underline indicator.
- **Motion-reduce honor**: Tab-underline slide collapses to instant.
- **Dynamic type honor**: Tabs collapse to a `<select>` at viewport ≤ 480 px or font-scale ≥ 1.5 — the select is fully labelled.
- **Form-error association**: N/A on this surface (read-only).
- **Must-pass axe-core**: `color-contrast`, `aria-allowed-role`, `aria-required-children`, `aria-required-parent`, `landmark-one-main`, `page-has-heading-one`, `heading-order`, `link-name`, `region`.
- **Disabled axe-core**: none.

---

### Surface 07 — Moderation queue (admin-only)

**Route:** `/admin/moderation` (web). No mobile surface.

- **Landmarks & focus order**: `main > h1 ("Moderation queue")` → status filter (`role="tablist"`: Pending | Approved | Removed | All) → queue table (`<table>` with proper `<th scope="col">`) → per-row action menu.
- **Keyboard map**:
  - Table follows native semantics — no roving tabindex needed for headers; row action menus open with `Enter` / `Space`, close with `Esc`.
  - `J` / `K` move row focus (documented shortcut).
  - Decision modal is focus-trapped; `Esc` cancels (with confirm if a comment was typed).
- **VoiceOver / TalkBack labels**:
  - Each row's action menu trigger: `aria-haspopup="menu"`, `aria-label="Actions for complaint <id>"`.
  - Decision form's radio group: `aria-labelledby="decision-h"`.
- **Live regions**: After a moderation decision, `role="status"` announces "Complaint <id> approved" or "Complaint <id> removed".
- **Contrast minima**: 4.5:1 on body, 3:1 on status badges. Status colour is **paired** with a text label and an icon — never colour alone.
- **Motion-reduce honor**: Row-removal animation collapses to a 0 ms strike-through + announcement.
- **Dynamic type honor**: At 200%, the table degrades to a card layout with the column header repeated inside each card.
- **Form-error association**: Decision-comment textarea uses `aria-invalid` + `aria-describedby` when a required reason is missing.
- **Must-pass axe-core**: `color-contrast`, `label`, `aria-allowed-role`, `aria-required-attr`, `aria-required-children`, `aria-required-parent`, `aria-valid-attr-value`, `button-name`, `link-name`, `dialog-name`, `landmark-one-main`, `page-has-heading-one`, `heading-order`, `region`, `td-headers-attr`, `th-has-data-cells`, `table-fake-caption`, `empty-table-header`.
- **Disabled axe-core**: none.

---

### Surface 08 — Static legal pages (ToS, privacy, ZKP explainer)

**Route:** `/legal/terms`, `/legal/privacy`, `/legal/zkp-explainer`, `/legal/grievance` (web). Mobile mirrors via the same MDX pipeline rendered in a WebView.

- **Landmarks & focus order**: `main > h1 (page title)` → table of contents (`<nav aria-label="On this page">`) → article body (`<article>`) → "Last updated" footer.
- **Keyboard map**:
  - In-page anchors set focus to the target heading (we add `tabindex="-1"` on those headings).
  - "Back to top" appears after scroll; it's a `<button>` that focuses the H1 and scrolls smoothly (or instantly under reduced-motion).
- **VoiceOver / TalkBack labels**: All standard — pages are primarily prose, so we rely on heading hierarchy.
- **Live regions**: N/A.
- **Contrast minima**: 4.5:1 on body, 3:1 on the "Last updated" timestamp.
- **Motion-reduce honor**: "Back to top" scrolls instantly.
- **Dynamic type honor**: Article max-width adjusts so line length stays at 45–75 characters at all zoom levels.
- **Form-error association**: The grievance contact form follows the Composer's `aria-invalid` + `aria-describedby` pattern.
- **Must-pass axe-core**: `color-contrast`, `link-name`, `landmark-one-main`, `page-has-heading-one`, `heading-order`, `region`, `document-title`, `html-has-lang`, `html-lang-valid`.
- **Disabled axe-core on `/legal/grievance` preview iframe**: `frame-title` — the static-site iframe used as a hand-off preview to the IT Rules grievance officer is a third-party render we do not control. Snapshot the moderate finding and revisit when we self-host the preview in S2.

---

### Surface 09 — App-shell mobile screens with offline-friendly skeletons

**Route:** mobile shell + every offline-aware route. Web equivalent is the PWA install / offline fallback.

- **Landmarks & focus order**: Each shell screen still respects landmark semantics. Offline skeleton replaces content **inside** `<main>`, never the landmarks themselves.
- **Keyboard map** (web PWA): identical to the online version; cached actions stay reachable, network-only actions disable with `aria-disabled="true"` and a tooltip explaining "Reconnect to submit".
- **VoiceOver / TalkBack labels**:
  - Offline banner: `accessibilityRole="alert"`, `accessibilityLabel="You're offline. Browsing cached complaints."`.
  - Skeleton placeholders use `accessibilityElementsHidden={true}` (iOS) / `importantForAccessibility="no-hide-descendants"` (Android) so screen readers don't read empty boxes — once loaded, the real content takes focus.
- **Live regions**: Network state transitions announce "You're offline" and "Back online — refreshing" through a polite live region.
- **Contrast minima**: 4.5:1 on the offline banner; skeleton placeholders ≥ 3:1 contrast against the page background so they are visible but not announced.
- **Motion-reduce honor**: Skeleton shimmer is disabled; static blocks remain. Re-fade-in on content load drops to 0 ms.
- **Dynamic type honor**: Skeleton heights track the real text's line-height at the user's font-scale — never pixel-fixed.
- **Form-error association**: N/A here — but every form that ships in offline mode (e.g. queued comments) still respects the Composer's error contract.
- **Must-pass axe-core**: `color-contrast`, `aria-allowed-attr`, `aria-valid-attr-value`, `region`, `landmark-one-main`.
- **Disabled axe-core**: `aria-hidden-focus` is configured to **allow** the explicitly hidden skeleton placeholders. We document the suppression in `scripts/a11y/baseline/09-app-shell.json`.

---

## Snapshot baselines (accepted findings)

A snapshot is allowed only when:
1. The violation severity is `minor` or `moderate`.
2. The violation is on a third-party render we do not control (e.g. embedded preview iframe).
3. A linked GitHub issue tracks remediation with a deadline before S1 GA.

Snapshots are stored at `scripts/a11y/baseline/<surface>.json` and updated via `bun run scripts/a11y/run-axe-baseline.ts --update-baseline`. The runner diffs the new run against the snapshot — any **new** violation fails the gate even if the snapshot has older ones.

## Test matrix per surface (manual passes)

| Pass | Tool | What we look for |
|---|---|---|
| Keyboard-only | Tab, Shift+Tab, Enter, Space, arrows, Esc | No traps, focus always visible, no mouse-only actions |
| VoiceOver (iOS) | Rotor → Headings, Landmarks, Form Controls | Reading order matches visual order; every interactive element announces purpose + state |
| TalkBack (Android) | Reading controls → swipe right / left | Same as VoiceOver |
| NVDA (Windows) | Browse mode + focus mode | Forms work in focus mode; landmarks list is complete |
| 200% zoom (web) | Browser zoom 200% at 1280×800 base | No horizontal scrolling except for elements that legitimately overflow (tables, maps); no content cut off |
| Reduced motion | `prefers-reduced-motion: reduce` | No animations of duration > 0 except essential progress indicators |
| Forced colors | Windows High Contrast / `forced-colors: active` | All UI is visible and operable using only system-defined colours |

## How this is enforced in CI

| Gate | Job | Workflow | Blocking | Source |
|---|---|---|---|---|
| **PR merge — Phase 3 → Phase 5** | `a11y-baseline` | `.github/workflows/a11y.yml` (created in Phase 7) | Yes — `serious` + `critical` block; new `moderate` violations not in snapshot also block | `scripts/a11y/run-axe-baseline.ts` |
| **Staging deploy** | same job, against staging URL | `.github/workflows/a11y.yml` | Yes — same severity gates | same |
| **Production deploy** | same job, against production URL, sampled | `.github/workflows/a11y.yml` | Yes | same |

The Phase 7 workflow will:

1. Spin up the dev server (`bun run dev` for web, the `web` preview alone — mobile a11y is verified manually + via Detox + native test harness; mobile is **not** part of the axe CI gate).
2. Wait for `http://localhost:3000` to respond.
3. Run `bun run scripts/a11y/run-axe-baseline.ts --config scripts/a11y/a11y-baseline.json --out scripts/a11y/out/`.
4. Upload `scripts/a11y/out/*.json` as a workflow artifact.
5. Fail the job if any surface reports a `serious` or `critical` violation, or any new (un-snapshotted) `moderate` violation.

The matching workflow file is **not** authored in Phase 3 — it lands in Phase 7 alongside the rest of the CI pipeline. Until then, run the script locally:

```bash
bun run scripts/a11y/run-axe-baseline.ts
# update an accepted snapshot
bun run scripts/a11y/run-axe-baseline.ts --update-baseline
```

## Open questions

- The constituency picker tree (Surface 04) is the single most complex keyboard widget in S1. Do we ship the ARIA 1.2 tree, or do we ship a flatter combobox + breadcrumb that's easier to get right? **Recommendation:** combobox + breadcrumb. (Decision needed with `ux-lead` before Phase 5.)
- Mobile photo upload (Surface 02) — VoiceOver reading order around the alt-text editor field is fragile on iOS 18. We may need to set `accessibilityElementsHidden` on the thumbnail wrapper to force focus onto the editor field. (See [`./a11y-mobile-deltas.md`](./a11y-mobile-deltas.md).)
- ZKP proof progress bar (Surface 01) — we use a custom `oklch` gradient. The 4.5:1 minimum against the surrounding background must be locked into the design tokens **before** Phase 5 — otherwise the gate fails every Phase 5 PR. (Decision needed with `ui-templater` before Phase 5.)

## References

- WCAG 2.2 — <https://www.w3.org/TR/WCAG22/>
- WAI-ARIA Authoring Practices 1.2 — <https://www.w3.org/WAI/ARIA/apg/>
- axe-core rules — <https://github.com/dequelabs/axe-core/blob/master/doc/rule-descriptions.md>
- React Native a11y — <https://reactnative.dev/docs/accessibility>
- iOS HIG (Accessibility) — <https://developer.apple.com/design/human-interface-guidelines/accessibility>
- Android Accessibility — <https://developer.android.com/guide/topics/ui/accessibility>
