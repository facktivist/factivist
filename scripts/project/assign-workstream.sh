#!/usr/bin/env bash
# Populate the Workstream single-select field on every Project #4 item.
#
# Mapping rules:
#   - issue closed                              → "S1 — closed"
#   - open, label:phase-9, in #{81,86,102,106}  → "Long-lead"        (Group C)
#   - open, label:phase-9, in #{95,98,103}      → "Provisioning"     (Group B)
#   - open, label:phase-9, in #{105}            → "Post-launch ops"  (Group D)
#   - open, no phase-9, #116 (weekly scorecard) → "Recurring ops"
#   - anything else                             → leave as-is
#
# Prerequisite: `project` scope on the gh token. See
# docs/operations/gh-token-direnv-runbook.md.
#
# Idempotent — re-running with no changes is a no-op (only writes
# when the current value differs from the target).
#
# Run order:
#   bash scripts/project/bootstrap.sh        # attach issues
#   bash scripts/project/setup-views.sh      # ensure fields exist
#   bash scripts/project/assign-workstream.sh   # this
#   bash scripts/project/sync-status.sh      # set Status column

set -euo pipefail

OWNER="${PROJECT_OWNER:-facktivist}"
PROJECT_NUMBER="${PROJECT_NUMBER:-4}"

# --- Verify scope -----------------------------------------------------------
if ! gh api graphql -f query='{ viewer { projectsV2(first: 1) { totalCount } } }' >/dev/null 2>&1; then
  echo "::error::gh CLI token is missing the 'project' scope." >&2
  echo "::error::See docs/operations/gh-token-direnv-runbook.md." >&2
  exit 2
fi

# --- Resolve project + Workstream field + its options ----------------------
PAYLOAD="$(gh api graphql -F owner="$OWNER" -f query="
query(\$owner: String!) {
  user(login: \$owner) {
    projectV2(number: ${PROJECT_NUMBER}) {
      id
      field(name: \"Workstream\") {
        ... on ProjectV2SingleSelectField {
          id
          options { id name }
        }
      }
    }
  }
}")"

PROJECT_ID="$(echo "$PAYLOAD" | jq -r '.data.user.projectV2.id')"
FIELD_ID="$(echo "$PAYLOAD"  | jq -r '.data.user.projectV2.field.id')"

if [[ -z "$PROJECT_ID" || -z "$FIELD_ID" || "$FIELD_ID" == "null" ]]; then
  echo "::error::Could not resolve Project #${PROJECT_NUMBER} or its Workstream field." >&2
  echo "::error::Did you run scripts/project/setup-views.sh first?" >&2
  exit 2
fi

# Build name → option_id map.
declare -A OPTION_ID
while read -r LINE; do
  NAME="$(echo "$LINE" | jq -r '.name')"
  ID="$(echo "$LINE"   | jq -r '.id')"
  OPTION_ID["$NAME"]="$ID"
done < <(echo "$PAYLOAD" | jq -c '.data.user.projectV2.field.options[]')

require_option() {
  local name="$1"
  if [[ -z "${OPTION_ID[$name]:-}" ]]; then
    echo "::error::Workstream is missing the '${name}' option. Re-run scripts/project/setup-views.sh." >&2
    exit 2
  fi
}
require_option "S1 — closed"
require_option "Long-lead"
require_option "Provisioning"
require_option "Post-launch ops"
require_option "Recurring ops"

# Issue-number → Workstream-option-name (phase 9 + recurring rules)
declare -A NUMBER_TO_WS=(
  [81]="Long-lead"        # Hardhat contract glue — AnonCitizen upstream blocker
  [86]="Long-lead"        # contracts.yml workflow — same blocker
  [95]="Provisioning"     # Supabase custom domain — Group B4
  [98]="Provisioning"     # Cloudflare proxy + Under Attack — Group B5
  [102]="Long-lead"       # Polygon 3/5 Safe — §6 / Group C1
  [103]="Provisioning"    # Sentry DSN — Group B7
  [105]="Post-launch ops" # DR drill — Group D1
  [106]="Long-lead"       # Audit engagement — §6 / Group C2
  [116]="Recurring ops"   # Weekly scorecard
)

# --- Walk every project item + reconcile ------------------------------------
CURSOR="null"
PROCESSED=0
CHANGED=0
ALREADY=0

set_field() {
  local item_id="$1"
  local option_id="$2"
  gh api graphql \
    -F projectId="$PROJECT_ID" \
    -F itemId="$item_id" \
    -F fieldId="$FIELD_ID" \
    -f optionId="$option_id" \
    -f query='
    mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $projectId,
        itemId: $itemId,
        fieldId: $fieldId,
        value: { singleSelectOptionId: $optionId }
      }) { projectV2Item { id } }
    }' > /dev/null
}

while :; do
  PAGE="$(gh api graphql -F projectId="$PROJECT_ID" -F after="$CURSOR" -f query='
  query($projectId: ID!, $after: String) {
    node(id: $projectId) {
      ... on ProjectV2 {
        items(first: 100, after: $after) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id
            content {
              ... on Issue {
                number
                state
                labels(first: 20) { nodes { name } }
              }
            }
            fieldValueByName(name: "Workstream") {
              ... on ProjectV2ItemFieldSingleSelectValue { optionId name }
            }
          }
        }
      }
    }
  }')"

  echo "$PAGE" | jq -c '.data.node.items.nodes[]' | while read -r ITEM; do
    ITEM_ID="$(echo "$ITEM" | jq -r '.id')"
    NUMBER="$(echo "$ITEM" | jq -r '.content.number // empty')"
    [[ -z "$NUMBER" ]] && continue
    STATE="$(echo "$ITEM" | jq -r '.content.state')"
    CURRENT_WS="$(echo "$ITEM" | jq -r '.fieldValueByName.name // empty')"

    # Resolve target Workstream name for this issue.
    TARGET=""
    if [[ "$STATE" == "CLOSED" ]]; then
      TARGET="S1 — closed"
    elif [[ -n "${NUMBER_TO_WS[$NUMBER]:-}" ]]; then
      TARGET="${NUMBER_TO_WS[$NUMBER]}"
    fi

    if [[ -z "$TARGET" ]]; then
      echo "  #${NUMBER} — no mapping (left as ${CURRENT_WS:-<empty>})"
    elif [[ "$CURRENT_WS" == "$TARGET" ]]; then
      echo "  #${NUMBER} — already ${TARGET}"
      ALREADY=$((ALREADY + 1))
    else
      set_field "$ITEM_ID" "${OPTION_ID[$TARGET]}"
      echo "  #${NUMBER} ← ${TARGET}"
      CHANGED=$((CHANGED + 1))
    fi
    PROCESSED=$((PROCESSED + 1))
  done

  HAS_NEXT="$(echo "$PAGE" | jq -r '.data.node.items.pageInfo.hasNextPage')"
  CURSOR="$(echo "$PAGE" | jq -r '.data.node.items.pageInfo.endCursor')"
  [[ "$HAS_NEXT" == "false" ]] && break
done

echo
echo "Done."
echo "  Items walked:  ${PROCESSED}"
echo "  → changed:     ${CHANGED}"
echo "  → already set: ${ALREADY}"
