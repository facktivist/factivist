#!/usr/bin/env bash
# Ensure the project's Status field has a "Phase 9 (blocked / ops)" option.
#
# Idempotent — if the option already exists, the script is a no-op.
#
# Prerequisite (one-time): gh auth refresh -h github.com -s project
# Run with the same env conventions as bootstrap.sh / sync-status.sh:
#
#   PROJECT_NUMBER=4 bash scripts/project/ensure-phase9-option.sh

set -euo pipefail

OWNER="${PROJECT_OWNER:-facktivist}"
PROJECT_NUMBER="${PROJECT_NUMBER:-4}"
NEW_OPTION_NAME="${NEW_OPTION_NAME:-Phase 9 (blocked / ops)}"
NEW_OPTION_COLOR="${NEW_OPTION_COLOR:-BLUE}"
NEW_OPTION_DESC="${NEW_OPTION_DESC:-User-side ops / upstream-blocked carry-overs for S1.}"

# --- Resolve project + field + existing options -----------------------------
PAYLOAD="$(gh api graphql -F owner="$OWNER" -f query="
query(\$owner: String!) {
  user(login: \$owner) {
    projectV2(number: ${PROJECT_NUMBER}) {
      id
      field(name: \"Status\") {
        ... on ProjectV2SingleSelectField {
          id
          options { id name }
        }
      }
    }
  }
}")"

FIELD_ID="$(echo "$PAYLOAD" | jq -r '.data.user.projectV2.field.id')"
EXISTING_ID="$(echo "$PAYLOAD" | jq -r --arg n "$NEW_OPTION_NAME" \
  '.data.user.projectV2.field.options[] | select(.name == $n) | .id // empty')"

if [[ -z "$FIELD_ID" || "$FIELD_ID" == "null" ]]; then
  echo "::error::Could not resolve the Status field on Project #${PROJECT_NUMBER}." >&2
  exit 2
fi

if [[ -n "$EXISTING_ID" ]]; then
  echo "Option '${NEW_OPTION_NAME}' already exists (id=${EXISTING_ID}). Nothing to do."
  exit 0
fi

# --- Build the full option list (existing + new) ----------------------------
# `updateProjectV2Field` replaces the entire `singleSelectOptions` array,
# so we need to send the existing options back unchanged + append the new one.
EXISTING_OPTIONS_JSON="$(echo "$PAYLOAD" | jq -c \
  '.data.user.projectV2.field.options | map({name: .name, color: "GRAY", description: ""})')"

NEW_OPTIONS_JSON="$(echo "$EXISTING_OPTIONS_JSON" | jq -c \
  --arg name "$NEW_OPTION_NAME" \
  --arg color "$NEW_OPTION_COLOR" \
  --arg desc "$NEW_OPTION_DESC" \
  '. + [{name: $name, color: $color, description: $desc}]')"

echo "Appending '${NEW_OPTION_NAME}' to the Status field on Project #${PROJECT_NUMBER}…"

gh api graphql \
  -F fieldId="$FIELD_ID" \
  -f options="$NEW_OPTIONS_JSON" \
  -f query='
  mutation($fieldId: ID!, $options: String!) {
    updateProjectV2Field(input: {
      fieldId: $fieldId,
      singleSelectOptions: $options
    }) { projectV2Field { ... on ProjectV2SingleSelectField { options { id name } } } }
  }' \
  > /dev/null 2>&1 || {
  # `updateProjectV2Field` expects `singleSelectOptions: [ProjectV2SingleSelectFieldOptionInput!]`,
  # which gh's -f flattens incorrectly. Retry via a single-line JSON body
  # written through a variables file. See https://github.com/cli/cli/issues/9275.
  TMP="$(mktemp -t p9opt-XXXXXX.json)"
  trap 'rm -f "$TMP"' EXIT
  jq -nc \
    --arg fid "$FIELD_ID" \
    --argjson opts "$NEW_OPTIONS_JSON" \
    '{query: "mutation($fieldId: ID!, $options: [ProjectV2SingleSelectFieldOptionInput!]!) { updateProjectV2Field(input: { fieldId: $fieldId, singleSelectOptions: $options }) { projectV2Field { ... on ProjectV2SingleSelectField { options { id name } } } } }", variables: {fieldId: $fid, options: $opts}}' \
    > "$TMP"
  gh api graphql --input "$TMP" > /dev/null
}

echo "Done. Re-run scripts/project/sync-status.sh to park Phase-9 issues in the new option."
