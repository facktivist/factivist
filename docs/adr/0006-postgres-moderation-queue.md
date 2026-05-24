# ADR-006: Manual moderation queue is a Postgres table, no Redis/Bull

## Status
Accepted

## Context
S1 moderation is manual — human moderators review each complaint before it goes public. Volume target: dozens to low hundreds per day. Bull/BullMQ on Redis was considered but introduces a second persistence layer for a workload that is fundamentally a CRUD list with a `claimed_by` and `decided_at`.

## Decision
**The moderation queue is a Postgres table** (`moderation_items`) with columns for status, claim holder, claim expiry, decision, decision reason (see [[ADR-021]]), and audit trail FK. Moderators poll via a Hono endpoint that uses `SELECT … FOR UPDATE SKIP LOCKED` to atomically claim items. No Redis. No Bull. No queue worker process.

## Consequences

### Positive
- One database → one backup, one restore, one access-control story.
- `SKIP LOCKED` gives us safe concurrent claiming with no race conditions.
- Audit trail (claim history, decision history) is queryable SQL, not a Redis time series.

### Negative
- Doesn't scale to millions of pending items — but that is far beyond S1.
- No native retry/backoff/delayed-job machinery; not needed because there are no background jobs in S1.

### Neutral
- If S2 introduces async fan-out (e.g., webhook delivery to journalists), a real queue may be added then.

## Alternatives considered
- **Redis + BullMQ**: rejected — second persistence layer, second backup target, India-region Redis cost.
- **pg-boss**: considered; rejected because S1 has no scheduled or delayed jobs, just a worklist.
- **Supabase Realtime + table**: deferred; moderator UI can poll for S1.

## References
- Action plan §4.3 ADR-006
- Related: [[ADR-021]] (pii-leak as moderation reason)
