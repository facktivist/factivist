# Claude Design Handoff — S1 Phase 3

> Phase: 3 · Owner agent: `ux-lead` · Last edited: 2026-05-23
> Per the action plan, **Claude Design replaces Figma for S1**. This file
> tells you (the user) how to turn the markdown surface specs in
> `./surfaces/` into shareable hi-fi designs that the rest of the swarm can
> reference and that ui-templater can lock into HeroUI compound components.

---

## 1. Your two Claude Design workspaces

| Purpose | URL |
|---------|-----|
| Product Design (per-surface boards) | https://claude.ai/design/p/000dee9b-9fa1-478d-bdb1-bde383ba7c8d |
| Design System (tokens, primitives, compound components) | https://claude.ai/design/p/0c1a5806-5301-4221-856e-7320a124591b |

The **Product Design** workspace gets one board per surface (S01..S09).
The **Design System** workspace gets one board per HeroUI compound family
(`Onboarding.*`, `Complaint.*`, `Filter.*`, `Comment.*`, `Citizen.*`,
`Admin.*`, `Moderation.*`, `Legal.*`, `Shell.*`, `Common.*`) plus a single
master token board.

---

## 2. The handoff loop

For each of the 9 surfaces:

1. **Open** the Product Design workspace.
2. **Create a new board** titled exactly `S<NN> — <surface name>` (e.g. `S01 — Onboarding + anoncitizen ZKP verification`).
3. **Paste** the contents of the matching `docs/design/s1/surfaces/NN-*.md` file as the board's brief.
4. **Generate** web + mobile hi-fi compositions. Iterate until the layout matches the ASCII wireframes in the spec (sections, primary/secondary actions, state-per-state).
5. **Take the artifact share URL** of the final composition.
6. **Paste that share URL** into a comment on the matching Phase 3 issue on Project #3:

| Surface | GH Issue |
|---------|----------|
| S01 Onboarding | https://github.com/raveracker/factivist/issues/24 |
| S02 Composer | https://github.com/raveracker/factivist/issues/25 |
| S03 Detail | https://github.com/raveracker/factivist/issues/26 |
| S04 Browse | https://github.com/raveracker/factivist/issues/27 |
| S05 Search | https://github.com/raveracker/factivist/issues/28 |
| S06 Profile | https://github.com/raveracker/factivist/issues/29 |
| S07 Moderation | https://github.com/raveracker/factivist/issues/30 |
| S08 Legal | https://github.com/raveracker/factivist/issues/31 |
| S09 App-shell | https://github.com/raveracker/factivist/issues/32 |

7. **Export** PNG/SVG of each final composition to `design/s1/<NN>-<slug>.png` (one image per state if the surface has substantial state variants). These are checked in for PR previews.

---

## 3. Design System workspace — what to paste

The Design System workspace generates the **canonical primitives** that
ui-templater locks into `packages/ui/web/*` and `packages/ui/native/*`.

### Boards to create (in this exact order)

1. **`Tokens — S1 master`**
   Paste the full token contract:
   - Primitive scales (oklch): `gray.50..950`, `brand.50..950`, `semantic.success/warn/error/info`, `surface.{1..5}`, `text.{primary/secondary/tertiary/inverse}`.
   - Spacing: 4 px → 64 px step.
   - Radii: 0, 4, 8, 12, 16, full.
   - Type: `Display`, `H1..H4`, `Body`, `Small`, `Mono` with weights.
   - Elevation: 0..4.

2. **`Shell.*`**
   - `Shell.RootNavigator` (mobile)
   - `Shell.TabBar`
   - `Shell.OfflineBanner`
   - `Shell.Splash`
   - `Common.Footer` (web)
   - `Common.HeaderNav` (web)

3. **`Onboarding.*`**
   `PromiseStep` · `ConsentStep` · `ScanStep` · `VerifyStep` · `SuccessCard` · `Identity.HandlePreview` · `Common.Stepper` · `Common.ConsentCheckbox`

4. **`Complaint.*`**
   `Composer` · `DisclaimerStrip` · `TitleField` · `BodyEditor` · `PhotoTray` · `PublishConfirmDialog` · `Card` (compact + full) · `DetailShell` · `BreadcrumbBar` · `MetaRow` · `BodyView` · `PhotoGallery` · `FlagButton` · `FlagDialog` · `ShareButton`

5. **`Filter.*`**
   `ConstituencyTree` (modes: single-pick, multi-filter) · `CategoryPicker` (single / multi) · `SortControl` · `FilterSheet` (mobile bottom sheet)

6. **`Comment.*`**
   `Thread` · `Item` · `Composer`

7. **`Citizen.*`**
   `ProfileCard` · `HandleBadge`

8. **`Search.*`**
   `OmniBar` · `ResultList` · `ResultCard` · `ActiveFilterChips` · `TipsDisclosure`

9. **`Admin.* + Moderation.*`**
   `Admin.Shell` · `Admin.RBACGuard` · `Admin.AuditLogTable` · `Moderation.QueueList` · `Moderation.QueueCard` · `Moderation.SlaBadge` · `Moderation.FlagSummary` · `Moderation.FlagNoteList` · `Moderation.AuthorSummary` · `Moderation.PhotoTray` · `Moderation.DecisionActions` · `Moderation.RationaleField` · `Moderation.ConfirmDialog`

10. **`Legal.*`**
    `Shell` · `TosBody` · `PrivacyBody` · `ZkpExplainerBody` · `GrievanceBody` · `GrievanceForm` · `GacLink` · `Common.ContentsToc`

11. **`Common.*`**
    `Pagination` · `EmptyState` · `RemovedNotice` · `PendingNotice` · `StaleGeometryBadge` · `StaleGeometryBanner` · `OfflineCta` · `SubmitBar`

After each board is finalised, paste the share URL into the **Phase 3 design epic** (Issue #109) as a single rolled-up comment. ui-templater will use this list as the canonical lock.

---

## 4. Acceptance criteria for hi-fi designs

Each surface board must demonstrate:

- ✅ All ASCII layout regions present at hi-fi.
- ✅ Loading / empty / error / success states.
- ✅ Mobile offline state (for surfaces S01–S06).
- ✅ Anonymity invariants visibly honoured (no PII fields in any state).
- ✅ Disclaimer string `User-submitted; not verified by Factivist.` shown verbatim on S02 + S03.
- ✅ WCAG 2.2 AA colour contrast (Claude Design has a built-in check — run it).
- ✅ Touch targets ≥ 44 px (iOS) / ≥ 48 dp (Android) on mobile.

---

## 5. Token sheet → `packages/ui/theme`

When the **Tokens — S1 master** board is locked, run:

```bash
# In packages/ui/theme/ (ui-templater will own this; you just trigger it)
bun run tokens:import --from "<claude design share url>"
```

This populates the `primitive.css`, `semantic.css`, and `tailwind.preset.ts`
files. `ui-templater` then publishes a PR that `architect` and `reviewer`
sign off.

---

## 6. Static export checklist

For each surface, drop the following into `design/s1/`:

```
design/s1/
  01-onboarding-web.png
  01-onboarding-mobile.png
  01-onboarding-states.png         (loading, error 409, success — one composite)
  02-composer-web.png
  02-composer-mobile.png
  ...
  09-app-shell-mobile.png
  09-app-shell-offline.png
```

The PR template requires these for any UI-touching merge — `ui-templater`
will enforce.

---

## 7. Where to stop

Hi-fi designs are the **end** of Phase 3, not the start of Phase 4.
Do NOT proceed to code components yourself — that's ui-templater's job.
Stop after:

- All 9 surface share URLs pasted on their GH issues.
- The Design System workspace boards (1–11) share URLs pasted on issue #109.
- `packages/ui/theme/` tokens imported and merged by ui-templater.
- `design/s1/` static exports committed.

Then **post on Issue #109**: "Phase 3 design handoff complete. Ready for ui-templater."

That closes Phase 3.
