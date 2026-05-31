#!/usr/bin/env bash
# Attach a pull request to Project #4 as a board item.
#
# GitHub Projects v2 treats issues and pull requests as the same kind
# of "content" — both are attached via the same
# `addProjectV2ItemById` mutation. The bootstrap script only walks
# issues; this helper is for adding PRs after the fact.
#
# Usage:
#   PR_NUMBER=119 bash scripts/project/add-pr.sh
#   PR_NUMBER=119 PROJECT_NUMBER=4 bash scripts/project/add-pr.sh
#   bash scripts/project/add-pr.sh 119           # positional arg also accepted
#
# Idempotent — addProjectV2ItemById returns the existing item id if the
# PR is already on the board.

set -euo pipefail

OWNER="${PROJECT_OWNER:-facktivist}"
PROJECT_NUMBER="${PROJECT_NUMBER:-4}"
REPO_OWNER="${REPO_OWNER:-facktivist}"
REPO_NAME="${REPO_NAME:-factivist}"
PR_NUMBER="${PR_NUMBER:-${1:-}}"

if [[ -z "$PR_NUMBER" ]]; then
  echo "::error::PR_NUMBER not set. Pass via env or positional arg." >&2
  echo "  PR_NUMBER=119 bash $0" >&2
  exit 2
fi

if ! gh api graphql -f query='{ viewer { projectsV2(first: 1) { totalCount } } }' >/dev/null 2>&1; then
  echo "::error::gh CLI token is missing the 'project' scope." >&2
  echo "::error::See docs/operations/gh-token-direnv-runbook.md." >&2
  exit 2
fi

# Resolve the project + PR node IDs. Inline both numbers — gh -F sends
# them as String which GraphQL rejects against Int!.
PROJECT_ID="$(gh api graphql -F owner="$OWNER" -f query="
query(\$owner: String!) {
  user(login: \$owner) { projectV2(number: ${PROJECT_NUMBER}) { id title } }
}" | jq -r '.data.user.projectV2.id')"

if [[ -z "$PROJECT_ID" || "$PROJECT_ID" == "null" ]]; then
  echo "::error::Could not resolve Project #${PROJECT_NUMBER} on ${OWNER}." >&2
  exit 2
fi

PR_PAYLOAD="$(gh api graphql -F owner="$REPO_OWNER" -F repo="$REPO_NAME" -f query="
query(\$owner: String!, \$repo: String!) {
  repository(owner: \$owner, name: \$repo) {
    pullRequest(number: ${PR_NUMBER}) { id title state }
  }
}")"

PR_ID="$(echo "$PR_PAYLOAD" | jq -r '.data.repository.pullRequest.id')"
PR_TITLE="$(echo "$PR_PAYLOAD" | jq -r '.data.repository.pullRequest.title')"
PR_STATE="$(echo "$PR_PAYLOAD" | jq -r '.data.repository.pullRequest.state')"

if [[ -z "$PR_ID" || "$PR_ID" == "null" ]]; then
  echo "::error::Could not resolve PR #${PR_NUMBER} on ${REPO_OWNER}/${REPO_NAME}." >&2
  exit 2
fi

echo "Attaching PR #${PR_NUMBER} [${PR_STATE}] to Project #${PROJECT_NUMBER}…"
echo "  ${PR_TITLE}"

ITEM_ID="$(gh api graphql \
  -F projectId="$PROJECT_ID" \
  -F contentId="$PR_ID" \
  -f query='
  mutation($projectId: ID!, $contentId: ID!) {
    addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
      item { id }
    }
  }' | jq -r '.data.addProjectV2ItemById.item.id')"

echo "  Project item id: ${ITEM_ID}"
echo "Done."
