# `llm-cost-logger` — dev-time LLM cost capture

Logs every Claude / Codex / Cursor call made during S1 development into
`dev_metrics.llm_calls` so Phase 2's cost-analyst has a real baseline before
S2 turns on paid moderation.

Action plan reference: [`docs/action-plans/season-1/s1-action-plan.md`](../docs/action-plans/season-1/s1-action-plan.md) §2.3.

## What it stores

| Column              | Type            | Notes                                              |
|---------------------|-----------------|----------------------------------------------------|
| `id`                | uuid            | server-generated                                   |
| `agent`             | text NOT NULL   | named swarm role (`planner`, `metrics-coder`, …)   |
| `model`             | text NOT NULL   | `claude-opus-4-7`, `gpt-4o`, …                     |
| `prompt_tokens`     | int NOT NULL    |                                                    |
| `completion_tokens` | int NOT NULL    |                                                    |
| `cache_read_tokens` | int NOT NULL    | defaults to `0`                                    |
| `cost_usd`          | numeric(10,6)   | computed from the pricing table if not provided    |
| `task_id`           | text NULL       | Ruflo task id                                      |
| `ts`                | timestamptz     | defaults to `now()`                                |

## Usage

### Direct invocation

```bash
bun run scripts/llm-cost-logger.ts \
  --agent planner \
  --model claude-opus-4-7 \
  --prompt-tokens 1234 \
  --completion-tokens 567
```

`cost_usd` is computed from the bundled pricing table when omitted. To
override (e.g. to back-fill an invoiced amount):

```bash
bun run scripts/llm-cost-logger.ts \
  --agent planner --model claude-opus-4-7 \
  --prompt-tokens 1234 --completion-tokens 567 \
  --cost-usd 0.0421
```

### Pipe a JSON body

```bash
echo '{
  "agent": "metrics-coder",
  "model": "claude-sonnet-4-6",
  "prompt_tokens": 500,
  "completion_tokens": 100,
  "task_id": "ruflo-task-42"
}' | bun run scripts/llm-cost-logger.ts
```

Flags passed alongside a JSON stdin body override the stdin fields.

### Bash wrapper (for hooks)

```bash
LLM_AGENT=planner \
LLM_MODEL=claude-opus-4-7 \
LLM_PROMPT_TOKENS=1234 \
LLM_COMPLETION_TOKENS=567 \
LLM_CACHE_READ_TOKENS=100 \
LLM_TASK_ID=$RUFLO_TASK_ID \
  ./scripts/llm-cost-logger.sh
```

### Exit codes

| Code | Meaning           |
|------|-------------------|
| 0    | Inserted          |
| 1    | Validation error  |
| 2    | DB insert failed  |

## Wiring into Claude Code

Add a `post-task` hook in `.claude/hooks/post-task.sh`:

```bash
#!/usr/bin/env bash
# Claude Code exposes the following env after a tool/task completion:
#   CLAUDE_AGENT          → the named agent (set via Agent({ name }))
#   CLAUDE_MODEL          → model id used for the turn
#   CLAUDE_PROMPT_TOKENS  → token usage from the last turn
#   CLAUDE_COMPLETION_TOKENS
#   CLAUDE_CACHE_READ_TOKENS
#   CLAUDE_TASK_ID        → Ruflo task id (if present)

LLM_AGENT="${CLAUDE_AGENT:-unknown}" \
LLM_MODEL="${CLAUDE_MODEL:-unknown}" \
LLM_PROMPT_TOKENS="${CLAUDE_PROMPT_TOKENS:-0}" \
LLM_COMPLETION_TOKENS="${CLAUDE_COMPLETION_TOKENS:-0}" \
LLM_CACHE_READ_TOKENS="${CLAUDE_CACHE_READ_TOKENS:-0}" \
LLM_TASK_ID="${CLAUDE_TASK_ID:-}" \
  /Users/allan/Projects/factivist/scripts/llm-cost-logger.sh \
  || echo "llm-cost-logger: non-fatal failure ($?)" >&2
```

Register the hook via `update-config` (see `~/.claude/settings.json`):

```json
{
  "hooks": {
    "Stop": [
      { "matcher": "*", "hooks": [{ "type": "command", "command": "./.claude/hooks/post-task.sh" }] }
    ]
  }
}
```

## Wiring into Codex / Cursor

Both tools support a "post-completion" shell hook. Drop the equivalent shim
that exports the env vars from their respective integration variables and
calls `scripts/llm-cost-logger.sh`. Vendor env names will differ — the
wrapper only cares about `LLM_*`.

## Back-filling

If you have a vendor invoice CSV (Anthropic / OpenAI usage export), iterate
it and feed each row through:

```bash
while IFS=, read -r agent model in out cache cost; do
  bun run scripts/llm-cost-logger.ts \
    --agent "$agent" --model "$model" \
    --prompt-tokens "$in" --completion-tokens "$out" \
    --cache-read-tokens "$cache" --cost-usd "$cost"
done < usage.csv
```

## Querying

```sql
-- Top agents by spend over the last 7 days
SELECT agent, sum(cost_usd) AS usd, sum(prompt_tokens + completion_tokens) AS tok
FROM dev_metrics.llm_calls
WHERE ts > now() - interval '7 days'
GROUP BY agent
ORDER BY usd DESC;

-- Cost per task
SELECT task_id, sum(cost_usd) AS usd
FROM dev_metrics.llm_calls
WHERE task_id IS NOT NULL
GROUP BY task_id
ORDER BY usd DESC
LIMIT 50;
```

## Updating the pricing table

The pricing map lives in `scripts/llm-cost-logger.ts` (`MODEL_PRICING`).
Costs are persisted **at write time**, so updating the table only affects
calls inserted after the change — historical rows stay correct.
