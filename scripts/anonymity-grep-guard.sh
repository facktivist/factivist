#!/usr/bin/env bash
# anonymity-grep-guard.sh — Phase 5 / wave 2 / c16-ci-grep-guard
#
# ## Purpose
#
# Enforces the citizen-anonymity floor (ADR-0010 + aggregates §4 I-MOD-2)
# on every moderator-facing surface in the codebase. A regression that
# bolts a citizen identifier (nullifier, Aadhaar, raw IP, raw user-agent)
# onto a moderator-visible response shape, page, server-action, or RBAC
# helper must FAIL CI before it can ever reach a reviewer.
#
# The route-level invariant comment at
# `apps/api/src/routes/admin/moderation.ts:22-28` already mandates that
# "CI grep `nullifier`/`aadhaar`/`ip_address` against this file MUST
# return zero matches". This script is the executable form of that
# requirement.
#
# ## Scope (moderator-facing surface)
#
#   - apps/api/src/routes/admin/*.ts                (excl. __tests__/)
#   - apps/api/src/lib/rbac.ts
#   - apps/web/src/app/admin/**/*.tsx               (excl. __tests__/)
#   - apps/web/src/features/admin/**/*.tsx          (excl. __tests__/)
#
# Test files are excluded because they LEGITIMATELY assert the absence
# of these tokens (see e.g. apps/api/src/routes/admin/__tests__/
# moderation.test.ts `PII_KEY_PATTERN`).
#
# ## Banned tokens (word-boundary, case-insensitive)
#
#   nullifier  aadhaar  ip_address  user_agent
#
# ## Comment-aware
#
# Forbidden tokens may appear in `//` line comments and `/* … */` block
# comments — those are documentation of the invariant, not violations.
# Comments are stripped before grepping so only NON-comment code lines
# are evaluated.
#
# ## Exit contract
#
#   0 — zero non-comment matches across the entire scope.
#   1 — at least one non-comment match. Prints `file:line: <line>` for
#       every offending occurrence plus an ADR-0010 remediation hint.
#
# ## Invocation
#
#   bash scripts/anonymity-grep-guard.sh        # local
#   bun run check:anonymity                     # package.json shortcut
#
# The script is also wired into `bun run check` (root) and the lefthook
# `pre-merge-commit` hook so the regression is caught before push.
#
# ## Implementation notes
#
#   - Pure POSIX sh-compatible bash + awk + grep. No node, no bun. CI
#     can run the guard before `bun install` finishes if needed.
#   - The comment-stripping awk pre-pass handles `//` to end-of-line and
#     `/* … */` (single- and multi-line). It does NOT try to be a full
#     tokeniser — a banned word inside a string literal IS a violation
#     (that is the point: if the word is in your runtime code, it is a
#     leak vector).
#   - The script resolves its own repo root by walking up from $0, so
#     it works from any CWD (lefthook runs commands from a quirky CWD).

set -euo pipefail

# Resolve repo root from this script's location so the guard works
# regardless of the caller's CWD (lefthook, CI, manual invocation).
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

# Banned tokens. The diagnostic string includes the `\b…\b` form so the
# documentation matches the intent; the grep invocation uses `-w` to
# apply word-boundary semantics portably across BSD and GNU grep.
BANNED_REGEX='\b(nullifier|aadhaar|ip_address|user_agent)\b'
BANNED_REGEX_GREP='(nullifier|aadhaar|ip_address|user_agent)'

# Build the file list.
#
# We deliberately enumerate explicit paths instead of a single `find`
# glob so a new top-level admin directory cannot silently slip outside
# the guard's scope — adding scope must be a conscious script edit.
FILES=()

# apps/api/src/routes/admin/*.ts (top-level only, no __tests__/).
while IFS= read -r -d '' f; do FILES+=("$f"); done < <(
  find apps/api/src/routes/admin \
    -maxdepth 1 -type f -name '*.ts' \
    -not -path '*/__tests__/*' \
    -print0 2>/dev/null || true
)

# apps/api/src/lib/rbac.ts (single file).
if [ -f apps/api/src/lib/rbac.ts ]; then
  FILES+=("apps/api/src/lib/rbac.ts")
fi

# apps/web/src/app/admin/**/*.tsx (recursive, no __tests__/).
while IFS= read -r -d '' f; do FILES+=("$f"); done < <(
  find apps/web/src/app/admin \
    -type f -name '*.tsx' \
    -not -path '*/__tests__/*' \
    -print0 2>/dev/null || true
)

# apps/web/src/features/admin/**/*.tsx (recursive, no __tests__/).
while IFS= read -r -d '' f; do FILES+=("$f"); done < <(
  find apps/web/src/features/admin \
    -type f -name '*.tsx' \
    -not -path '*/__tests__/*' \
    -print0 2>/dev/null || true
)

if [ "${#FILES[@]}" -eq 0 ]; then
  # No moderator surface files yet — vacuously safe. Print a marker so a
  # silent scope misconfiguration is loud.
  echo "anonymity-grep-guard: no in-scope files found (scope=apps/api/src/routes/admin, apps/api/src/lib/rbac.ts, apps/web/src/app/admin, apps/web/src/features/admin)" >&2
  exit 0
fi

# Strip comments from a TS/TSX file and emit `file:line:<decommented>` for
# every non-empty de-commented line. The caller pipes the stream through
# `grep -iwE` to apply the banned-token check — this keeps the awk pass
# portable (BSD awk has no `\b` support) and the regex authoritative in
# one place.
#
# The awk program tracks an `in_block` state for `/* … */` block comments
# (which may span multiple lines), then strips any trailing `//` line
# comment. A line that becomes empty after stripping is suppressed.
strip_comments_stream() {
  local file="$1"
  awk -v file="$file" '
    BEGIN { in_block = 0 }
    {
      line = $0
      out = ""
      i = 1
      n = length(line)
      while (i <= n) {
        if (in_block) {
          # Look for end of block comment.
          p = index(substr(line, i), "*/")
          if (p == 0) {
            i = n + 1
          } else {
            i = i + p + 1   # advance past "*/"
            in_block = 0
          }
        } else {
          two = substr(line, i, 2)
          if (two == "//") {
            # Line comment — drop the rest.
            i = n + 1
          } else if (two == "/*") {
            in_block = 1
            i = i + 2
          } else {
            out = out substr(line, i, 1)
            i = i + 1
          }
        }
      }
      # Suppress lines that are now whitespace-only.
      if (out ~ /[^[:space:]]/) {
        printf("%s:%d:%s\n", file, NR, out)
      }
    }
  ' "$file"
}

# Run the matcher over every in-scope file, collect hits.
#
# Pipeline: strip_comments_stream (per file) → grep -iwE (banned tokens
# applied with case-insensitive word-boundary semantics). `grep -w` is
# the portable equivalent of `\b…\b` and works identically on BSD and
# GNU grep, which matters because devs on macOS and CI on Linux must
# agree byte-for-byte on what counts as a violation.
HITS=""
for f in "${FILES[@]}"; do
  hit="$(strip_comments_stream "$f" | grep -iwE "${BANNED_REGEX_GREP}" || true)"
  if [ -n "$hit" ]; then
    HITS="${HITS}${hit}
"
  fi
done

if [ -z "$HITS" ]; then
  printf 'anonymity-grep-guard: OK — %d files scanned, zero non-comment matches for /%s/i.\n' \
    "${#FILES[@]}" "${BANNED_REGEX}"
  exit 0
fi

# At least one violation. Print citations + remediation banner.
{
  printf '\n'
  printf '╳ anonymity-grep-guard: ANONYMITY FLOOR VIOLATION (ADR-0010)\n'
  printf '\n'
  printf 'A moderator-facing surface contains one of the banned tokens\n'
  printf '(nullifier | aadhaar | ip_address | user_agent) in code — not\n'
  printf 'in a comment. Per ADR-0010 and aggregates §4 I-MOD-2 the\n'
  printf 'moderation operator MUST NEVER see a citizen identifier.\n'
  printf '\n'
  printf 'Offending locations:\n'
  printf '%s\n' "$HITS"
  printf 'Remediation:\n'
  printf '  • If you need to reference these concepts in documentation,\n'
  printf '    move the token into a // or /* */ comment.\n'
  printf '  • If you are deliberately adding a new admin surface that\n'
  printf '    requires a hashed/scoped identifier, name it explicitly\n'
  printf '    (e.g. `caseRef`, `reporterDigest`) so the regression\n'
  printf '    pattern does not match.\n'
  printf '  • If you are widening the moderator data contract, that is\n'
  printf '    an ADR change — open one before merging.\n'
} >&2
exit 1
