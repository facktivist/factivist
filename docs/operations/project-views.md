# Runbook — GitHub Project #4 views + custom fields

> Owner: ops · Last updated: 2026-05-26
>
> This is the design + setup spec for the Project #4 board
> (https://github.com/users/facktivist/projects/4). Project #3 was
> deleted; Project #4 replaces it after the post-S1 issue close-out
> sweep (107 closed, 8 open Phase-9-tagged, 1 recurring ops). The
> board mirrors every repo issue (re-populated via
> `scripts/project/bootstrap.sh`).

---

## Custom fields

Add three fields on top of the default `Status` field. The
single-select fields use the options listed in **bold**; numeric +
date types are plain.

| Field | Type | Options | Purpose |
|---|---|---|---|
| `Status` (default) | Single-select | Todo, In Progress, **Phase 9 (blocked / ops)**, Done | Drives the kanban columns. The "Phase 9 (blocked / ops)" option is created by `scripts/project/ensure-phase9-option.sh`. |
| `Priority` | Single-select | P0, P1, P2, P3 | Orders the Phase-9 view by urgency. Most items are P2 by default; bump items to P0 only when the Polygon-gas tolerance band crosses Red or a takedown order arrives. |
| `Workstream` | Single-select | Activation, Provisioning, Long-lead, Post-launch ops, Test infra, Recurring ops, **S1 — closed** | Mirrors the Group A/B/C/D/E breakdown in `phase-9-checklist.md` so the Phase-9 view can collapse work clusters. The "S1 — closed" bucket holds the 107 already-shipped pre-Phase-9 issues so the field is never empty. |
| `Target` | Date | n/a | Powers the optional Roadmap view. Only fill in for Phase-9 items with an actual deadline. |

`scripts/project/setup-views.sh` creates the **fields + their options**
via `createProjectV2Field`. The **views themselves** must still be
authored manually in the project UI — the GitHub Projects v2 GraphQL
API does not expose view creation as of the script's authoring date.
The script prints the UI-side instructions at the end.

---

## The five views

Pinned views are what land first when you open the project. The
others stay available under the "+" menu but don't take up real
estate by default.

### View 1 — **Status board** (default, pinned)

| Property | Value |
|---|---|
| Layout | Board |
| Group by | `Status` |
| Filter | (none) |
| Visible fields | Title · Labels (phase-*) · Assignees · `Priority` |
| Sort | manual within each column |

**What it explains.** Everyday view. Shows the full lifecycle of all
116 issues at a glance. After running `scripts/project/sync-status.sh`,
the **Done** column holds 107, **Phase 9 (blocked / ops)** holds 8,
**Todo** holds 1 (#116 weekly scorecard). Drag-to-reorder works on
manual sort.

**Who uses it.** Anyone opening the project as a quick health check.

### View 2 — **Phase 9 — active work** (pinned)

| Property | Value |
|---|---|
| Layout | Table |
| Filter | `is:open label:phase-9` |
| Group by | `Workstream` |
| Sort | `Priority` ascending, then issue number ascending |
| Visible fields | Title · Labels · Status · `Priority` · `Workstream` · `Target` · Linked PR · Assignees · Updated |

**What it explains.** The "what's left to do for S1" view. Eight
rows today, grouped by which Phase-9 workstream each lives in
(Group A activation / Group B provisioning / Group C long-lead /
Group D post-launch / Group E test infra from `phase-9-checklist.md`).
As Phase 9 items close the table shrinks toward empty.

**Who uses it.** The operator running through `phase-9-checklist.md`
on launch week. Also the audit reviewer in Group C2.

### View 3 — **By phase — history** (unpinned)

| Property | Value |
|---|---|
| Layout | Table |
| Filter | (none) |
| Group by | Labels (the `phase-1` … `phase-9` labels) |
| Sort | Issue number ascending within each group |
| Visible fields | Title · Status · Closed at · Linked PR |

**What it explains.** Read-only historical record. One row per
issue, grouped so each phase collapses into a labelled block with a
running count. Useful at handover time (`s1-to-s2-handover.md` §7
references this kind of grouping) and for anyone reconstructing
"what shipped when".

**Who uses it.** Anyone writing the S1 → S2 handover (`planner`
agent). Also useful for due-diligence requests.

### View 4 — **Recurring ops** (unpinned)

| Property | Value |
|---|---|
| Layout | Table |
| Filter | `is:open no:label` (i.e. any open issue with no labels) — OR equivalently `-label:phase-1,phase-2,…,phase-9` |
| Group by | none |
| Sort | Updated descending |
| Visible fields | Title · Created · Updated · `Workstream` |

**What it explains.** Catches recurring ops issues that don't belong
to a phase. Today only #116 (the weekly scorecard, re-filed every
Sunday by the `zkp-cost-scorecard.yml` workflow). Stops these from
getting lost between phase tags.

**Who uses it.** The cost-analyst running the weekly scorecard
update; the ops handle for any other recurring task that lands later.

### View 5 — **Roadmap** (optional, unpinned)

| Property | Value |
|---|---|
| Layout | Roadmap |
| Group by | `Workstream` (or `Status`) |
| Date field | `Target` |
| Filter | `is:open` |
| Sort | by `Target` ascending |

**What it explains.** Timeline of Phase-9 commitments. Useful **only**
once you start populating the `Target` date field — e.g. the audit
engagement window (Group C2), the DR drill execution date
(Group D1), the multisig seed event (Group C1). Empty until then.

**Who uses it.** The maintainer scheduling Phase 9. Skippable until
target dates exist.

---

## Defaults

- **Default view:** Status board (View 1) — the one that opens
  first.
- **Pinned views:** also pin "Phase 9 — active work" (View 2). Two
  pins is the right amount of stickiness.
- **Hidden views:** Views 3, 4, 5 stay available but unpinned.

---

## Setup procedure

The first time you run this on a fresh Project #4:

```bash
# 0. Prerequisite — your gh CLI must have the `project` scope on the
#    facktivist account. See docs/operations/gh-token-direnv-runbook.md
#    if you hit the GH_TOKEN / direnv interaction.

# 1. Attach every repo issue to the board (idempotent)
PROJECT_NUMBER=4 bash scripts/project/bootstrap.sh

# 2. Add the custom fields + the Phase 9 Status option (idempotent)
PROJECT_NUMBER=4 bash scripts/project/setup-views.sh

# 3. Assign the default owner (facktivist) to every issue lacking one
#    (idempotent — issues with existing assignees are skipped)
bash scripts/project/assign-issues.sh

# 4. Populate the Workstream field on every project item (idempotent)
PROJECT_NUMBER=4 bash scripts/project/assign-workstream.sh

# 5. Park each issue in the right Status column (idempotent)
PROJECT_NUMBER=4 bash scripts/project/sync-status.sh

# 6. Create the views in the UI per the §"The five views" specs
#    above. (View creation is NOT in the public GraphQL API.)
#    setup-views.sh prints the click-through guide.
```

After that, every issue lifecycle event flows through:

- **Issue closed** → `sync-status.sh` (or the auto-add Status workflow
  on the board) moves it to Done
- **Issue gains `phase-9` label** → `sync-status.sh` parks it in
  "Phase 9 (blocked / ops)"
- **New recurring ops issue filed (e.g. next week's scorecard)** →
  auto-shows up in View 4 if it has no phase label

Re-run the three scripts any time something drifts. All three are
idempotent.

---

## Related

- `scripts/project/bootstrap.sh` — attach every repo issue to the
  board
- `scripts/project/ensure-phase9-option.sh` — add the "Phase 9
  (blocked / ops)" option to the Status field
- `scripts/project/setup-views.sh` — create the three custom fields +
  the Phase 9 Status option, print the UI guide for views
- `scripts/project/assign-issues.sh` — assign the repo default owner
  (`facktivist`) to every issue lacking an assignee
- `scripts/project/assign-workstream.sh` — populate the Workstream
  field per the Phase-9 mapping + "S1 — closed" historical bucket
- `scripts/project/sync-status.sh` — park each item in the right
  Status column
- `docs/operations/gh-token-direnv-runbook.md` — fix scope issues
  with the `facktivist` gh account before any of the above will work
- `docs/action-plans/season-1/phase-9-checklist.md` — the source of
  truth for what's "Phase 9 work"
