#!/usr/bin/env bash
# Guard: this repo must use the `facktivist` gh account for any GitHub
# operation. gh's active-account state is global, so it's easy to switch
# away for another project and silently push from the wrong identity.
#
# Bypass with: BYPASS_GH_ACCOUNT_CHECK=1 git push …
set -euo pipefail

REQUIRED_ACCOUNT="facktivist"

if [[ "${BYPASS_GH_ACCOUNT_CHECK:-0}" == "1" ]]; then
  echo "check-gh-account: bypassed (BYPASS_GH_ACCOUNT_CHECK=1)" >&2
  exit 0
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "check-gh-account: gh CLI not installed; skipping" >&2
  exit 0
fi

active="$(gh auth status --active 2>&1 | sed -n 's/.*Logged in to github.com account \([^ ]*\).*/\1/p' | head -n1)"

if [[ -z "${active}" ]]; then
  echo "check-gh-account: could not determine active gh account. Run \`gh auth status\`." >&2
  exit 1
fi

if [[ "${active}" != "${REQUIRED_ACCOUNT}" ]]; then
  echo "check-gh-account: active gh account is '${active}', expected '${REQUIRED_ACCOUNT}'." >&2
  echo "  Fix: gh auth switch -u ${REQUIRED_ACCOUNT}" >&2
  echo "  Or bypass: BYPASS_GH_ACCOUNT_CHECK=1 <command>" >&2
  exit 1
fi
