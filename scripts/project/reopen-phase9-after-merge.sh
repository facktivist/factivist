#!/usr/bin/env bash
# Re-open the 9 carry-over issues that PR #119 will auto-close on
# merge.
#
# Context: PR #119 (the S1 closeout PR) carries `Closes #N` for every
# S1 issue so the "Linked pull requests" column on Project #4 shows
# the PR against every row. That keyword auto-closes the issue on
# merge — fine for 107 already-closed issues, but the 8 Phase-9
# carry-overs and the recurring weekly scorecard (#116) must stay
# open. Run this immediately after the PR merges to put them back.
#
# Usage:
#   bash scripts/project/reopen-phase9-after-merge.sh
#
# Idempotent — re-opening an already-open issue is a no-op (gh prints
# a warning + skips). Closes-keyword auto-close only fires once per
# merge so you only ever need to run this once.
#
# Repo scope is enough — no project scope required.

set -euo pipefail

REPO_OWNER="${REPO_OWNER:-facktivist}"
REPO_NAME="${REPO_NAME:-factivist}"

# 8 Phase-9 carry-overs + 1 recurring ops = 9 total.
CARRY_OVERS=(81 86 95 98 102 103 105 106 116)

REOPENED=0
ALREADY_OPEN=0
for n in "${CARRY_OVERS[@]}"; do
  STATE="$(gh issue view "$n" -R "${REPO_OWNER}/${REPO_NAME}" --json state --jq .state)"
  if [[ "$STATE" == "OPEN" ]]; then
    echo "  #${n} — already open (skipped)"
    ALREADY_OPEN=$((ALREADY_OPEN + 1))
    continue
  fi

  gh issue reopen "$n" -R "${REPO_OWNER}/${REPO_NAME}" \
    --comment "Re-opened by post-merge cleanup of PR #119. This issue was auto-closed by the closes-keyword in the PR body, but it carries forward as a Phase-9 / recurring-ops item — see \`docs/action-plans/season-1/phase-9-checklist.md\`." >/dev/null
  echo "  #${n} ← re-opened"
  REOPENED=$((REOPENED + 1))
done

echo
echo "Done."
echo "  Re-opened: ${REOPENED}"
echo "  Already open (skipped): ${ALREADY_OPEN}"
