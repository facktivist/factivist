#!/usr/bin/env bash
# One-shot bootstrap: attach every repo issue to Project #4.
#
# Project #4 replaced the deleted Project #3 (2026-05-26). The new board
# is empty; this script re-populates it with every issue in the repo
# (open + closed), then the companion sync-status.sh can park each one
# in the right Status column.
#
# Prerequisite (one-time, per machine):
#
#   gh auth refresh -h github.com -s project
#
# Run order:
#
#   bash scripts/project/bootstrap.sh        # attach every issue
#   bash scripts/project/sync-status.sh      # set Status (Done / Phase 9)
#
# Idempotent: addProjectV2ItemById returns the same item id when the
# content is already on the project, so re-running is safe.

set -euo pipefail

OWNER="${PROJECT_OWNER:-facktivist}"
PROJECT_NUMBER="${PROJECT_NUMBER:-4}"
REPO_OWNER="${REPO_OWNER:-facktivist}"
REPO_NAME="${REPO_NAME:-factivist}"

# --- Verify scope -----------------------------------------------------------
if ! gh api graphql -f query='{ viewer { projectsV2(first: 1) { totalCount } } }' >/dev/null 2>&1; then
  echo "::error::gh CLI token is missing the 'project' scope." >&2
  echo "::error::Run: gh auth refresh -h github.com -s project" >&2
  exit 2
fi

# --- Resolve project id -----------------------------------------------------
PROJECT_ID="$(gh api graphql -F owner="$OWNER" -F number:="$PROJECT_NUMBER" -f query='
query($owner: String!, $number: Int!) {
  user(login: $owner) { projectV2(number: $number) { id title } }
}' | jq -r '.data.user.projectV2.id')"

if [[ -z "$PROJECT_ID" || "$PROJECT_ID" == "null" ]]; then
  echo "::error::Could not resolve Project #${PROJECT_NUMBER} on ${OWNER}." >&2
  exit 2
fi
echo "Bootstrapping Project ${PROJECT_ID} on ${REPO_OWNER}/${REPO_NAME}"

# --- Paginate every issue in the repo + attach ------------------------------
CURSOR="null"
TOTAL=0
ATTACHED=0

while :; do
  PAGE="$(gh api graphql -F owner="$REPO_OWNER" -F repo="$REPO_NAME" -f after="$CURSOR" -f query='
  query($owner: String!, $repo: String!, $after: String) {
    repository(owner: $owner, name: $repo) {
      issues(first: 100, after: $after, orderBy: { field: CREATED_AT, direction: ASC }) {
        pageInfo { hasNextPage endCursor }
        nodes { id number title state }
      }
    }
  }')"

  echo "$PAGE" | jq -c '.data.repository.issues.nodes[]' | while read -r ISSUE; do
    ISSUE_ID="$(echo "$ISSUE" | jq -r '.id')"
    ISSUE_NUMBER="$(echo "$ISSUE" | jq -r '.number')"
    ISSUE_STATE="$(echo "$ISSUE" | jq -r '.state')"
    ISSUE_TITLE="$(echo "$ISSUE" | jq -r '.title' | cut -c -60)"

    gh api graphql \
      -F projectId="$PROJECT_ID" \
      -F contentId="$ISSUE_ID" \
      -f query='
      mutation($projectId: ID!, $contentId: ID!) {
        addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
          item { id }
        }
      }' >/dev/null

    echo "  #${ISSUE_NUMBER} [${ISSUE_STATE}] ${ISSUE_TITLE}"
    ATTACHED=$((ATTACHED + 1))
    TOTAL=$((TOTAL + 1))
  done

  HAS_NEXT="$(echo "$PAGE" | jq -r '.data.repository.issues.pageInfo.hasNextPage')"
  CURSOR="$(echo "$PAGE" | jq -r '.data.repository.issues.pageInfo.endCursor')"
  [[ "$HAS_NEXT" == "false" ]] && break
done

echo
echo "Bootstrap complete."
echo "  Issues attached: ${ATTACHED}"
echo
echo "Next: bash scripts/project/sync-status.sh"
