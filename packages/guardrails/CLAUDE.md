# packages/guardrails — Project Guardrails

## Purpose

A small set of project-policy checks that run from git hooks, CI, and agent
pre-task hooks. Every check is a pure function over `GuardrailContext`; bypass
is explicit, audited to ruflo memory, and time-boxed.

## Rules

- A guardrail NEVER does I/O beyond what its `Context` provides. Inputs go in,
  a `Verdict` comes out. This makes them trivially testable and reusable
  across git hooks, CI, and runtime checks.
- A guardrail MUST declare which bypass classes (`hotfix`, `experiment`,
  `local`) it accepts. Some checks (secret-leak) accept none.
- Every successful bypass is recorded under ruflo namespace
  `guardrail-bypass` with timestamp, actor, and reason. Bypass without
  reason fails closed.
- Adding a new guardrail = one file in `src/registry/` + one entry in
  `registry/index.ts`. No central switch statements.

## Skills
@skills/tdd-guide
@skills/coverage
