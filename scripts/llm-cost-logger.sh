#!/usr/bin/env bash
# factivist-llm-log — Bash wrapper around scripts/llm-cost-logger.ts.
#
# Sourced by Claude Code / Codex / Cursor post-task hooks. Reads token-usage
# env vars (the same names those tools expose) and pipes a JSON body to the
# Bun shim. Any flag passed through this wrapper is forwarded verbatim, so
# you can override a single field without re-templating the JSON.
#
# Usage from a hook:
#   factivist-llm-log --agent planner --task-id "$RUFLO_TASK_ID"
#
# Required env (any subset — missing values are dropped):
#   LLM_AGENT             logical agent name (overrides --agent)
#   LLM_MODEL             model id (e.g. claude-opus-4-7)
#   LLM_PROMPT_TOKENS     integer
#   LLM_COMPLETION_TOKENS integer
#   LLM_CACHE_READ_TOKENS integer (optional, default 0)
#   LLM_COST_USD          float (optional, computed by the shim if omitted)
#   LLM_BATCHED           "1" / "true" if call used Anthropic Batch API (50% off)
#                         — exported as BATCHED for the Bun shim
#   LLM_TASK_ID           free-text task id (optional)
#
# Phase 2 action plan §2.3.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SHIM="$SCRIPT_DIR/llm-cost-logger.ts"

if [[ ! -f "$SHIM" ]]; then
  echo "factivist-llm-log: shim not found at $SHIM" >&2
  exit 1
fi

# Build a JSON body from the env vars that are set. Numbers stay unquoted.
json_body() {
  local body="{"
  local sep=""
  add_string() {
    if [[ -n "${!1-}" ]]; then
      body="$body$sep\"$2\":$(jq -Rn --arg v "${!1}" '$v')"
      sep=","
    fi
  }
  add_number() {
    if [[ -n "${!1-}" ]]; then
      body="$body$sep\"$2\":${!1}"
      sep=","
    fi
  }
  add_string LLM_AGENT agent
  add_string LLM_MODEL model
  add_number LLM_PROMPT_TOKENS prompt_tokens
  add_number LLM_COMPLETION_TOKENS completion_tokens
  add_number LLM_CACHE_READ_TOKENS cache_read_tokens
  add_number LLM_COST_USD cost_usd
  add_string LLM_TASK_ID task_id
  body="$body}"
  echo "$body"
}

BODY="$(json_body)"

# bun is required; warn early with a clear message.
if ! command -v bun >/dev/null 2>&1; then
  echo "factivist-llm-log: 'bun' is required but not found in PATH" >&2
  exit 1
fi

# Forward LLM_BATCHED → BATCHED so the Bun shim picks it up.
if [[ -n "${LLM_BATCHED-}" ]]; then
  export BATCHED="$LLM_BATCHED"
fi

printf '%s' "$BODY" | bun run "$SHIM" "$@"
