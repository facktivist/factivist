# Release runbook (S1)

**Scope:** how Factivist S1 versions, tags, changelogs, and production deploys
chain together. Paired with `deploy-runbook.md` (which covers the deploy
mechanics themselves).

## Toolchain choice: release-please (manifest mode)

Authored in `.github/workflows/release.yml`. See that file's header for the
full rationale; in short: Conventional-Commits-driven, monorepo-aware, zero
new install, first-party Google action.

Two configs sit alongside:

| File | Purpose |
|------|---------|
| `.github/release-please-config.json` | Per-package metadata + changelog sections |
| `.github/release-please-manifest.json` | Current version of every package |

Every package starts at **`0.1.0`** in S1. **`1.0.0` is reserved for the
post-launch milestone** — once a release-please bump would cross 1.0.0, the
maintainer pauses, lands the launch checklist, and only then merges the
release PR. This keeps the semver social contract intact: 0.x means "we
reserve the right to break it; you've been warned."

## How a release happens (normal path)

1. Land PRs on `main`. Each PR carries one or more **Conventional Commits**
   in its squash-merge title (e.g. `feat(api): add complaint search`).
   Convention enforced locally by lefthook + commitlint; CI is permissive
   for now (Phase 9 will tighten).
2. `release.yml` fires on every push to `main`. The `release-please` job
   opens a rolling **release PR** — title looks like
   `chore(api): release api 0.2.0`. The PR body is the proposed CHANGELOG.
   Subsequent PRs on `main` keep updating the same release PR.
3. Maintainer reviews the release PR. Edit the CHANGELOG body if the
   auto-generated grouping is wrong; **do not** edit version numbers.
4. Merge the release PR. release-please then:
   * commits the bumped `package.json` + `CHANGELOG.md` for each affected
     package;
   * creates tags of the form `<component>-v<x.y.z>`
     (e.g. `api-v0.2.0`, `web-v0.1.1`);
   * publishes a **GitHub Release** per component, using the CHANGELOG
     entry as the body.
5. The same workflow's `prod-validator` job runs next. It re-runs
   `bun run check` against the release commit and attaches a JSON
   audit blob (`prod-validator-<sha>.json`) to every release it just
   created. **If the gate fails, no artifact is attached.**
6. `deploy-prod.yml` fires on `release: published` (one fire per release
   event). It looks for the `prod-validator` artifact; missing artifact =
   refuse to deploy. Then `production` environment approval is required
   before the Vercel / Fly / EAS jobs proceed.

## Semver policy for S1

| Bump | When | Conventional-Commit footer |
|------|------|---------|
| **patch** (`0.1.0 → 0.1.1`) | Bug fix, no API change | `fix:` |
| **minor** (`0.1.0 → 0.2.0`) | New feature, additive only | `feat:` |
| **major** (`0.x → 1.0.0`) | Reserved for post-launch | requires manual override + launch checklist |

In 0.x, additive `feat:` bumps the **minor** — that's the
release-please default for `release-type: node` and matches our intent.
We will switch to "minor for breaking, patch for everything else" only
after 1.0.0.

Breaking changes inside 0.x:

- Add `BREAKING CHANGE:` to the commit body or `!` after the type
  (`feat!: rename complaint.status enum`).
- Release-please will still bump only the minor while we're pre-1.0 (per
  semver). The CHANGELOG entry will carry a **`### ⚠ BREAKING CHANGES`**
  section that maintainers MUST review before merging the release PR.

## Manual hotfix (release PR bypass)

When `main` cannot accept the rolling release PR (e.g. a security fix that
must ship before unrelated `feat:` commits land), use the manual path:

1. Cherry-pick the fix onto a `hotfix/<ticket>` branch off the last
   release tag.
2. Update the relevant `package.json` version (patch bump) and prepend a
   `CHANGELOG.md` entry manually.
3. Push the branch, open a PR titled `fix(<component>): <summary>`,
   merge into `main` once green.
4. Tag manually: `git tag <component>-v<x.y.z> && git push --tags`.
5. Create the GitHub Release manually pointing at that tag — set the
   release body to the new CHANGELOG entry.
6. The `release.yml` workflow's `prod-validator` job will NOT run for
   manual tags (no release-please path to follow). Instead, run the
   script locally and upload the artifact by hand:
   ```bash
   bun run scripts/ci/prod-validator-artifact.ts --commit "$(git rev-parse HEAD)" --release-tag <tag>
   gh release upload <tag> prod-validator-<sha>.json
   ```
7. `deploy-prod.yml` will then fire on the release publish event.

This path is documented but **not encouraged**; prefer the rolling release
PR whenever you can.

## Release artifact contract

Every published release carries one mandatory asset:

```
prod-validator-<sha>.json
```

Schema: `factivist.prod-validator/v1`. See
`scripts/ci/prod-validator-artifact.ts` for the type and
`scripts/ci/__tests__/prod-validator-artifact.test.ts` for the contract
tests.

Fields:

| Field | Meaning |
|-------|---------|
| `commit` | git SHA the gate ran against |
| `release_tag` | the tag this artifact attests to (`null` for manual paths) |
| `issued_at` | ISO timestamp |
| `checks.lint` / `.build` / `.anonymity_guard` | `pass` \| `fail` \| `skip` |
| `checks.aidefence` | `clean` \| `findings` \| `skip` |
| `checks.coverage` | per-package metrics + failures + floor |
| `verdict` | `PASS` \| `FAIL` |

`deploy-prod.yml` refuses to deploy if the artifact is missing. A future
phase will tighten it to also reject `verdict: "FAIL"` artifacts; today
the `prod-validator` workflow simply does not attach an artifact when the
gate fails, so the missing-artifact rule covers it transitively.

## Rollback

Tag-driven, no in-place edits. To roll back:

1. Identify the previous green release tag for the affected component:
   `gh release list --limit 20`.
2. Re-fire `deploy-prod.yml` against that release: **Actions →
   `deploy-prod` → Run workflow → tag = `<previous-tag>`**.
   *(release events do not replay, so we re-trigger manually.)*
3. The `audit-gate` job downloads the artifact from the older release
   (still attached), then the deploy jobs run normally.

For database rollback see `deploy-runbook.md → Supabase (db)`.

## Conventional Commits enforcement

Local hook: `lefthook.yml → commit-msg` runs `commitlint` against the
message. Bypass with `BYPASS_GUARDRAILS=local BYPASS_REASON="…"` and
expect an audit row.

CI is permissive in S1 (Wave 7B): we accept that some legacy commits
predate the convention, and release-please is tolerant — non-CC commits
simply do not contribute to the changelog. Phase 9 plan: add a
`commitlint` step to `ci.yml` once 100% of recent main commits comply.

## Cross-references

- `.github/workflows/release.yml` — workflow source
- `.github/workflows/deploy-prod.yml` — consumer of the artifact
- `docs/operations/deploy-runbook.md` — deploy mechanics + secrets matrix
- `scripts/ci/prod-validator-artifact.ts` — artifact generator
- `docs/action-plans/season-1/s1-action-plan.md §7.3` — workflow inventory
- `docs/action-plans/season-1/s1-action-plan.md §7.5` — exit gate
