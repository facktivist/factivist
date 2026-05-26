#!/usr/bin/env bash
# Assign the default repo owner (`facktivist`) to every issue that
# doesn't already have an assignee.
#
# Prerequisite: gh CLI authenticated against the facktivist account
# (the `.envrc` GH_TOKEN export handles this in this repo). The repo
# scope is enough — no project scope needed.
#
# Idempotent — issues that already have one or more assignees are
# left alone. Re-running on a fully-assigned tracker is a no-op.
#
# Overridable via DEFAULT_ASSIGNEE + REPO_OWNER + REPO_NAME env vars.

set -euo pipefail

REPO_OWNER="${REPO_OWNER:-facktivist}"
REPO_NAME="${REPO_NAME:-factivist}"
DEFAULT_ASSIGNEE="${DEFAULT_ASSIGNEE:-facktivist}"

# Use the REST API to walk every issue (open + closed) in pages of
# 100. Each call returns the assignee list inline so we can skip
# already-assigned issues without a second fetch.
PAGE=1
TOTAL=0
ASSIGNED=0
SKIPPED=0

while :; do
  ITEMS="$(gh api -X GET "/repos/${REPO_OWNER}/${REPO_NAME}/issues" \
    -f state=all -F per_page=100 -F page="$PAGE" \
    --jq '[.[] | select(.pull_request == null) | {number: .number, assignees: [.assignees[].login]}]')"

  COUNT="$(echo "$ITEMS" | jq 'length')"
  [[ "$COUNT" -eq 0 ]] && break

  echo "$ITEMS" | jq -c '.[]' | while read -r ISSUE; do
    NUMBER="$(echo "$ISSUE" | jq -r '.number')"
    EXISTING="$(echo "$ISSUE" | jq -r '.assignees | length')"

    if [[ "$EXISTING" -gt 0 ]]; then
      echo "  #${NUMBER} — already has $(echo "$ISSUE" | jq -r '.assignees | join(",")') (skipped)"
      SKIPPED=$((SKIPPED + 1))
    else
      gh issue edit "$NUMBER" --add-assignee "$DEFAULT_ASSIGNEE" \
        -R "${REPO_OWNER}/${REPO_NAME}" >/dev/null
      echo "  #${NUMBER} ← ${DEFAULT_ASSIGNEE}"
      ASSIGNED=$((ASSIGNED + 1))
    fi
    TOTAL=$((TOTAL + 1))
  done

  if [[ "$COUNT" -lt 100 ]]; then break; fi
  PAGE=$((PAGE + 1))
done

echo
echo "Done."
echo "  Issues walked: ${TOTAL}"
echo "  → newly assigned to ${DEFAULT_ASSIGNEE}: ${ASSIGNED}"
echo "  → already assigned (skipped): ${SKIPPED}"
