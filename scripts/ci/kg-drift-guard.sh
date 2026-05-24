#!/usr/bin/env bash
# kg-drift-guard — fails the build if architecture/ADR docs changed without a
# corresponding update to the pr-reviewer knowledge graph.
#
# Driven by `.github/workflows/kg-drift-guard.yml`. Intentionally pure bash +
# git — no Bun runtime needed.
#
# Override: add the `kg-drift-ok` label to the PR for changes that genuinely
# don't affect the KG (typo fixes, formatting, internal sections). The label
# check is loose-substring so it tolerates JSON quoting from the workflow.
#
# Exit codes:
#   0  no drift, or override label set
#   1  drift detected

set -euo pipefail

BASE_REF="${BASE_REF:-main}"
LABELS_JSON="${LABELS:-[]}"
KG_FILE="docs/knowledge-graph/pr-reviewer-kg.md"

# Make sure the base ref is fetched. Workflow does this too but be safe.
git fetch --no-tags --depth=200 origin \
  "${BASE_REF}:refs/remotes/origin/${BASE_REF}" >/dev/null 2>&1 || true

CHANGED=$(git diff --name-only "origin/${BASE_REF}...HEAD")

src_changed=$(printf '%s\n' "$CHANGED" | grep -E '^docs/(architecture|adr)/' || true)
kg_changed=$(printf '%s\n' "$CHANGED" | grep -F "$KG_FILE" || true)

# Override label — loose match against the JSON-encoded label list.
if printf '%s' "$LABELS_JSON" | grep -q '"kg-drift-ok"'; then
  echo "::notice title=kg-drift-guard::override label 'kg-drift-ok' present — skipping"
  exit 0
fi

if [ -z "$src_changed" ]; then
  echo "::notice title=kg-drift-guard::no architecture/ADR changes — nothing to guard"
  exit 0
fi

if [ -n "$kg_changed" ]; then
  echo "::notice title=kg-drift-guard::architecture/ADR changed AND KG updated — OK"
  exit 0
fi

# Drift detected — fail with actionable message.
{
  echo "::error title=kg-drift-guard::Architecture/ADR docs changed without updating ${KG_FILE}"
  echo ""
  echo "Files that changed and require KG sync:"
  printf '  - %s\n' $src_changed
  echo ""
  echo "Fix one of two ways:"
  echo "  1. Update ${KG_FILE} to reflect these changes, OR"
  echo "  2. Add the 'kg-drift-ok' label to this PR if the changes don't"
  echo "     affect the knowledge graph (typos, formatting, etc)."
  echo ""
  echo "Background: docs/operations/pr-review-agent.md §11"
} >&2

exit 1
