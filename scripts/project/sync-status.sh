#!/usr/bin/env bash
# Project #4 board sync after the post-S1 issue close-out sweep.
#
# What this does:
#   1. Reads every item on GitHub Project #4 (owner: facktivist).
#   2. For each linked issue, sets the Status field based on the
#      issue's state + labels:
#        - closed issue  → "Done"
#        - phase-9 label → "Phase 9 (blocked / ops)"
#   3. Logs every transition to stdout.
#
# Why this isn't a workflow: writing project items needs the `project`
# OAuth scope, which the `facktivist` gh CLI account does not carry by
# default. Run the prerequisite once, then this script as needed:
#
#   gh auth refresh -h github.com -s project
#   bash scripts/project/sync-status.sh
#
# The script is idempotent — re-running after every close is safe.
#
# Project context: Project #4 replaced the original Project #3 (deleted
# 2026-05-26). Override with PROJECT_NUMBER + PROJECT_OWNER env vars
# if the board moves again.
#
# Origin: post-S1 sweep (commit 03a2cdc5c + batch-close of issues
# 1..52, 56-94, 96-101, 104, 107, 109-115).

set -euo pipefail

OWNER="${PROJECT_OWNER:-facktivist}"
PROJECT_NUMBER="${PROJECT_NUMBER:-4}"

# --- Verify scope -----------------------------------------------------------
if ! gh api graphql -f query='{ viewer { login } }' >/dev/null 2>&1; then
  echo "::error::gh CLI is not authenticated. Run \`gh auth login\` first." >&2
  exit 2
fi

if ! gh api graphql -f query='{ viewer { projectsV2(first: 1) { totalCount } } }' >/dev/null 2>&1; then
  echo "::error::gh CLI token is missing the 'project' scope." >&2
  echo "::error::Run: gh auth refresh -h github.com -s project" >&2
  exit 2
fi

# --- Resolve the project + its Status field ---------------------------------
# The project number is inlined into the query string because
# `gh api graphql -F number=N` returns N as a String, which GraphQL
# then rejects against the `Int!` parameter type.
PROJECT_PAYLOAD="$(gh api graphql -F owner="$OWNER" -f query="
query(\$owner: String!) {
  user(login: \$owner) {
    projectV2(number: ${PROJECT_NUMBER}) {
      id
      title
      field(name: \"Status\") {
        ... on ProjectV2SingleSelectField {
          id
          options { id name }
        }
      }
    }
  }
}")"

PROJECT_ID="$(echo "$PROJECT_PAYLOAD" | jq -r '.data.user.projectV2.id')"
STATUS_FIELD_ID="$(echo "$PROJECT_PAYLOAD" | jq -r '.data.user.projectV2.field.id')"
DONE_OPTION_ID="$(echo "$PROJECT_PAYLOAD" | jq -r '.data.user.projectV2.field.options[] | select(.name=="Done") | .id')"
PHASE9_OPTION_ID="$(echo "$PROJECT_PAYLOAD" | jq -r '.data.user.projectV2.field.options[] | select(.name=="Phase 9 (blocked / ops)") | .id // empty')"

if [[ -z "$PROJECT_ID" || -z "$STATUS_FIELD_ID" || -z "$DONE_OPTION_ID" ]]; then
  echo "::error::Could not resolve Project #${PROJECT_NUMBER} or its Status field." >&2
  exit 2
fi

if [[ -z "$PHASE9_OPTION_ID" ]]; then
  echo "::warning::Project does not have a 'Phase 9 (blocked / ops)' Status option."
  echo "::warning::Create it on the board first, then re-run. Closed issues will still sync to Done."
fi

echo "Project: ${PROJECT_ID}"
echo "Status field: ${STATUS_FIELD_ID}"
echo "Done option:  ${DONE_OPTION_ID}"
echo "Phase 9 option: ${PHASE9_OPTION_ID:-<not present>}"

# --- Walk items and reconcile -----------------------------------------------
CURSOR="null"
PROCESSED=0
MOVED_DONE=0
MOVED_P9=0

while :; do
  # See bootstrap.sh — `-F after=null` becomes actual GraphQL null on
  # the first page; subsequent pages send a real cursor string.
  PAGE="$(gh api graphql \
    -F projectId="$PROJECT_ID" \
    -F after="$CURSOR" \
    -f query='
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
            }
          }
        }
      }
    }')"

  echo "$PAGE" | jq -c '.data.node.items.nodes[]' | while read -r ITEM; do
    ITEM_ID="$(echo "$ITEM" | jq -r '.id')"
    ISSUE_NUMBER="$(echo "$ITEM" | jq -r '.content.number // empty')"
    [[ -z "$ISSUE_NUMBER" ]] && continue
    STATE="$(echo "$ITEM" | jq -r '.content.state')"
    HAS_P9_LABEL="$(echo "$ITEM" | jq -r '.content.labels.nodes[].name' | grep -cx 'phase-9' || true)"

    TARGET_OPTION_ID=""
    TARGET_LABEL=""
    if [[ "$STATE" == "CLOSED" ]]; then
      TARGET_OPTION_ID="$DONE_OPTION_ID"
      TARGET_LABEL="Done"
    elif [[ "$HAS_P9_LABEL" -gt 0 && -n "$PHASE9_OPTION_ID" ]]; then
      TARGET_OPTION_ID="$PHASE9_OPTION_ID"
      TARGET_LABEL="Phase 9 (blocked / ops)"
    fi

    if [[ -n "$TARGET_OPTION_ID" ]]; then
      # `optionId` is a numeric-looking ID (e.g. "98236657") but GraphQL
      # requires it as String!. Use `-f` (raw-field) so gh CLI does NOT
      # auto-coerce it to Int. The other ID fields contain non-numeric
      # prefixes (PVT_…, PVTSSF_…) so `-F` keeps them as strings.
      gh api graphql \
        -F projectId="$PROJECT_ID" \
        -F itemId="$ITEM_ID" \
        -F fieldId="$STATUS_FIELD_ID" \
        -f optionId="$TARGET_OPTION_ID" \
        -f query='
        mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
          updateProjectV2ItemFieldValue(input: {
            projectId: $projectId,
            itemId: $itemId,
            fieldId: $fieldId,
            value: { singleSelectOptionId: $optionId }
          }) { projectV2Item { id } }
        }' >/dev/null
      echo "  #${ISSUE_NUMBER} → ${TARGET_LABEL}"
      if [[ "$TARGET_LABEL" == "Done" ]]; then
        MOVED_DONE=$((MOVED_DONE + 1))
      else
        MOVED_P9=$((MOVED_P9 + 1))
      fi
    fi
    PROCESSED=$((PROCESSED + 1))
  done

  HAS_NEXT="$(echo "$PAGE" | jq -r '.data.node.items.pageInfo.hasNextPage')"
  CURSOR="$(echo "$PAGE" | jq -r '.data.node.items.pageInfo.endCursor')"
  [[ "$HAS_NEXT" == "false" ]] && break
done

echo
echo "Sync complete."
echo "  Items walked:         ${PROCESSED}"
echo "  → moved to Done:      ${MOVED_DONE}"
echo "  → moved to Phase 9:   ${MOVED_P9}"
