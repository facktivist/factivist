#!/usr/bin/env bash
# Create the custom fields + the "Phase 9 (blocked / ops)" Status option
# on Project #4, then print the click-through guide for the five views.
#
# View creation itself is intentionally manual — the GitHub Projects v2
# GraphQL API does not expose view creation as of this script's
# authoring date (Nov 2024 — verify if you're reading this much later).
# Field creation IS exposed and is the load-bearing piece; the views
# can be authored once in the UI per the printed guide.
#
# Prerequisite (one-time):
#   gh auth refresh -h github.com -s project
#   (see docs/operations/gh-token-direnv-runbook.md if the refresh
#    refuses to run while direnv exports GH_TOKEN.)
#
# Run order:
#   bash scripts/project/bootstrap.sh           # 1. attach issues
#   bash scripts/project/setup-views.sh         # 2. (this) — fields
#   bash scripts/project/assign-issues.sh       # 3. default assignee
#   bash scripts/project/assign-workstream.sh   # 4. Workstream values
#   bash scripts/project/sync-status.sh         # 5. park items
#
# Idempotent — re-running on a board that already has the fields is a
# no-op (each field's existence is checked before the create call).
#
# Overridable via PROJECT_NUMBER + PROJECT_OWNER env vars.

set -euo pipefail

OWNER="${PROJECT_OWNER:-facktivist}"
PROJECT_NUMBER="${PROJECT_NUMBER:-4}"

# --- Verify scope -----------------------------------------------------------
if ! gh api graphql -f query='{ viewer { projectsV2(first: 1) { totalCount } } }' >/dev/null 2>&1; then
  echo "::error::gh CLI token is missing the 'project' scope." >&2
  echo "::error::See docs/operations/gh-token-direnv-runbook.md." >&2
  exit 2
fi

# --- Resolve project + existing fields --------------------------------------
# The project number is inlined into the query — `-F number=N` would
# send it as a String and GraphQL rejects against `Int!`.
PROJECT_PAYLOAD="$(gh api graphql -F owner="$OWNER" -f query="
query(\$owner: String!) {
  user(login: \$owner) {
    projectV2(number: ${PROJECT_NUMBER}) {
      id
      title
      fields(first: 50) {
        nodes {
          ... on ProjectV2FieldCommon { id name dataType }
          ... on ProjectV2SingleSelectField {
            id name dataType options { id name }
          }
        }
      }
    }
  }
}")"

PROJECT_ID="$(echo "$PROJECT_PAYLOAD" | jq -r '.data.user.projectV2.id')"
if [[ -z "$PROJECT_ID" || "$PROJECT_ID" == "null" ]]; then
  echo "::error::Could not resolve Project #${PROJECT_NUMBER} on ${OWNER}." >&2
  exit 2
fi
echo "Project: ${PROJECT_ID} (${OWNER}/projects/${PROJECT_NUMBER})"

# --- Helpers ----------------------------------------------------------------

# Read an existing field's id by name (empty if not present).
field_id_by_name() {
  local name="$1"
  echo "$PROJECT_PAYLOAD" | jq -r --arg n "$name" \
    '.data.user.projectV2.fields.nodes[] | select(.name == $n) | .id // empty'
}

# Read existing options of a single-select field as a JSON array of
# {name,color,description} objects (the shape updateProjectV2Field
# expects when replacing the option set).
field_existing_options() {
  local name="$1"
  echo "$PROJECT_PAYLOAD" | jq -c --arg n "$name" \
    '[.data.user.projectV2.fields.nodes[] | select(.name == $n) | .options[]? | {name: .name, color: "GRAY", description: ""}]'
}

# Create a SINGLE_SELECT field with the given option list (JSON array of
# {name, color, description}). Echoes its new id.
create_single_select() {
  local name="$1"
  local options_json="$2"

  # `createProjectV2Field` expects `singleSelectOptions:
  # [ProjectV2SingleSelectFieldOptionInput!]`. gh -f flattens lists,
  # so we POST a single-line JSON body via --input instead.
  local tmp
  tmp="$(mktemp -t setupfield-XXXXXX.json)"
  trap 'rm -f "$tmp"' RETURN
  jq -nc \
    --arg pid "$PROJECT_ID" \
    --arg name "$name" \
    --argjson opts "$options_json" \
    '{
       query: "mutation($projectId: ID!, $name: String!, $opts: [ProjectV2SingleSelectFieldOptionInput!]!) { createProjectV2Field(input: { projectId: $projectId, dataType: SINGLE_SELECT, name: $name, singleSelectOptions: $opts }) { projectV2Field { ... on ProjectV2SingleSelectField { id name } } } }",
       variables: {projectId: $pid, name: $name, opts: $opts}
     }' > "$tmp"
  gh api graphql --input "$tmp" \
    | jq -r '.data.createProjectV2Field.projectV2Field.id'
}

# Create a DATE field. Echoes its new id.
create_date_field() {
  local name="$1"
  gh api graphql \
    -F projectId="$PROJECT_ID" \
    -F name="$name" \
    -f query='
    mutation($projectId: ID!, $name: String!) {
      createProjectV2Field(input: { projectId: $projectId, dataType: DATE, name: $name }) {
        projectV2Field { ... on ProjectV2Field { id name } }
      }
    }' \
    | jq -r '.data.createProjectV2Field.projectV2Field.id'
}

# Ensure a single-select field exists; if it does, leave it. If not,
# create it with the given option list.
ensure_single_select() {
  local name="$1"
  local options_json="$2"
  local existing
  existing="$(field_id_by_name "$name")"
  if [[ -n "$existing" ]]; then
    echo "  Field '${name}' already exists (${existing})."
    return 0
  fi
  local new_id
  new_id="$(create_single_select "$name" "$options_json")"
  echo "  Created field '${name}' (${new_id})."
}

ensure_date_field() {
  local name="$1"
  local existing
  existing="$(field_id_by_name "$name")"
  if [[ -n "$existing" ]]; then
    echo "  Field '${name}' already exists (${existing})."
    return 0
  fi
  local new_id
  new_id="$(create_date_field "$name")"
  echo "  Created date field '${name}' (${new_id})."
}

# --- Ensure Phase 9 option exists on Status ---------------------------------
PHASE9_NAME="Phase 9 (blocked / ops)"
STATUS_EXISTING_PHASE9="$(echo "$PROJECT_PAYLOAD" | jq -r --arg n "$PHASE9_NAME" \
  '.data.user.projectV2.fields.nodes[] | select(.name == "Status") | .options[]? | select(.name == $n) | .id // empty' \
  | head -n1)"
if [[ -n "$STATUS_EXISTING_PHASE9" ]]; then
  echo "  Status option '${PHASE9_NAME}' already exists."
else
  echo "  Status option '${PHASE9_NAME}' missing — delegating to ensure-phase9-option.sh"
  PROJECT_OWNER="$OWNER" PROJECT_NUMBER="$PROJECT_NUMBER" \
    bash "$(dirname "$0")/ensure-phase9-option.sh"
fi

# --- Ensure custom fields ---------------------------------------------------

echo
echo "Ensuring custom fields…"

# Priority — single-select P0..P3
PRIORITY_OPTS="$(jq -nc '[
  {name: "P0", color: "RED",    description: "Drop everything"},
  {name: "P1", color: "ORANGE", description: "Next on the queue"},
  {name: "P2", color: "YELLOW", description: "Default"},
  {name: "P3", color: "GREEN",  description: "Nice to have"}
]')"
ensure_single_select "Priority" "$PRIORITY_OPTS"

# Workstream — single-select mirroring phase-9-checklist Groups A/B/C/D/E
# plus a "S1 — closed" bucket for the 107 already-shipped historical issues
# and a "Recurring ops" bucket for the weekly scorecard et al.
WORKSTREAM_OPTS="$(jq -nc '[
  {name: "Activation",       color: "BLUE",   description: "Phase 9 Group A — activate already-shipped code"},
  {name: "Provisioning",     color: "PURPLE", description: "Phase 9 Group B — user-side provisioning"},
  {name: "Long-lead",        color: "ORANGE", description: "Phase 9 Group C — audit + legal + AnonCitizen watch"},
  {name: "Post-launch ops",  color: "PINK",   description: "Phase 9 Group D — DR drill + cost reconciliation"},
  {name: "Test infra",       color: "GRAY",   description: "Phase 9 Group E — RLS coverage + threat-model link sweep"},
  {name: "Recurring ops",    color: "GREEN",  description: "Weekly / monthly recurring tasks (e.g. scorecard)"},
  {name: "S1 — closed",      color: "GRAY",   description: "Pre-Phase-9 shipped work (Phases 1-8 historical)"}
]')"
ensure_single_select "Workstream" "$WORKSTREAM_OPTS"

# Target — date field for the optional Roadmap view
ensure_date_field "Target"

# --- Print the manual-view click-through guide ------------------------------

cat <<'EOG'

────────────────────────────────────────────────────────────────────────────
Custom fields done. Now create the five views in the project UI:

  https://github.com/users/facktivist/projects/4

For each view: click "New view" → pick the layout → set the
filter/group/sort below. Pin the ones marked ★.

  ★ 1. Status board       Layout: Board   Group: Status
                          Filter: (none)
                          Visible: Title, Labels, Assignees, Priority

  ★ 2. Phase 9 — active   Layout: Table   Group: Workstream
                          Filter: is:open label:phase-9
                          Sort:   Priority ↑, then number ↑
                          Visible: Title, Labels, Status, Priority,
                                   Workstream, Target, Linked PR,
                                   Assignees, Updated

    3. By phase — history  Layout: Table   Group: Labels
                           Filter: (none)
                           Sort:   number ↑ within each group
                           Visible: Title, Status, Closed at, Linked PR

    4. Recurring ops       Layout: Table
                           Filter: is:open no:label
                           Sort:   Updated ↓
                           Visible: Title, Created, Updated, Workstream

    5. Roadmap (optional)  Layout: Roadmap  Group: Workstream
                           Date field: Target
                           Filter: is:open
                           Sort:   Target ↑

Full spec + rationale: docs/operations/project-views.md
────────────────────────────────────────────────────────────────────────────
EOG
