# Runbook — `gh` scope refreshes when direnv exports `GH_TOKEN`

> Owner: ops · Last updated: 2026-05-26
>
> Use this when `gh auth refresh -h github.com -s <scope>` fails with
> "The value of the GH_TOKEN environment variable is being used for
> authentication. To refresh credentials stored in GitHub CLI, first
> clear the value from the environment." OR when a Project v2 / wiki /
> any scope-gated command returns "Your token has not been granted the
> required scopes" even after a refresh that you thought went through.

---

## TL;DR

This repo's `.envrc` exports `GH_TOKEN=$(gh auth token -u facktivist)`
on every `cd` into the directory (see CLAUDE.md §"GitHub Identity").
That env var **takes precedence** over the gh keyring, so:

- `gh auth refresh` refuses to run while `GH_TOKEN` is set.
- A refresh that lands on the **active keyring account** does not
  necessarily land on **facktivist** — gh CLI keeps a separate token
  per account, and only the active one gets the new scope.
- After a successful refresh, the shell's `GH_TOKEN` is still the
  pre-refresh value until direnv re-evaluates `.envrc` (i.e. you
  `cd` out and back in, or run `direnv reload`).

The fix is always the same shape: pause `GH_TOKEN`, make `facktivist`
the active keyring account, refresh **that** account, then let direnv
re-evaluate.

---

## Symptoms

### Symptom A — refresh refuses to run

```
$ gh auth refresh -h github.com -s project
The value of the GH_TOKEN environment variable is being used for
authentication. To refresh credentials stored in GitHub CLI, first
clear the value from the environment.
```

### Symptom B — refresh "succeeded" but the scope is missing

```
$ gh api graphql -f query='{ viewer { projectsV2(first:1) { totalCount } } }'
gh: Your token has not been granted the required scopes to execute
this query. The 'projectV2' field requires one of the following
scopes: ['read:project'], but your token has only been granted the:
['admin:public_key', 'gist', 'read:org', 'repo'] scopes.
```

### Symptom C — `gh auth status` shows the scope on the wrong account

```
$ gh auth status
  ✓ Logged in to github.com account facktivist (GH_TOKEN)
  - Token scopes: 'admin:public_key', 'gist', 'read:org', 'repo'
  ✓ Logged in to github.com account raveracker (keyring)
  - Active account: true
  - Token scopes: 'admin:public_key', 'gist', 'project', 'read:org', 'repo'
  ✓ Logged in to github.com account facktivist (keyring)
  - Active account: false
  - Token scopes: 'admin:public_key', 'gist', 'read:org', 'repo'
```

The `project` scope landed on `raveracker`, not `facktivist`. Any
write against a `facktivist`-owned resource (issues, projects, wiki)
fails with a permissions error.

### Symptom D — `gh issue close` works but project / wiki writes fail

The earlier commands succeeded because the `repo` scope is enough for
issues; `project` (and `wiki` for non-public wikis) are separate
scopes that must be added explicitly.

---

## Solution — the canonical four-step sequence

### 1. Bounce `GH_TOKEN` for this shell only

Pick whichever feels natural:

```bash
# Option A — strip env for the refresh commands only (recommended)
env -u GH_TOKEN gh auth status

# Option B — temporarily disable direnv
direnv deny
unset GH_TOKEN
```

### 2. Make `facktivist` the active keyring account

This is the step most people miss. `gh auth refresh` operates on the
**active** account; the active account is whatever was last picked by
`gh auth switch` (or whichever was the first keyring entry to be
created).

```bash
env -u GH_TOKEN gh auth switch -u facktivist
env -u GH_TOKEN gh auth status
# → "Active account: true" should now be next to facktivist (keyring)
```

### 3. Refresh with the missing scope

```bash
env -u GH_TOKEN gh auth refresh -h github.com -s project
# (browser opens — see §"Browser sign-in gotcha" below)
env -u GH_TOKEN gh auth status
# → facktivist line should now include 'project'
```

For other scopes (`wiki`, `gist`, `delete_repo`, etc.) substitute
the scope name. Multiple scopes are comma-separated:

```bash
env -u GH_TOKEN gh auth refresh -h github.com -s 'project,read:project'
```

### 4. Let direnv re-evaluate `.envrc`

```bash
cd ..; cd -      # bounce direnv
# or
direnv reload    # if installed
# or
direnv allow     # if you used `direnv deny` in step 1
```

Confirm the new scoped token reached the shell:

```bash
gh auth status | sed -n '/facktivist (GH_TOKEN)/,/^$/p'
# scopes line should include the newly-granted scope
```

---

## Browser sign-in gotcha

The OAuth flow opened by `gh auth refresh` authorises **whoever is
currently signed in to github.com in the browser**, NOT the account
named in `-u`. If your browser is already signed in as `raveracker`,
the refresh will silently land on `raveracker` even when you ran
`gh auth refresh -u facktivist`.

Reliable fix: sign out of github.com first (in the actual browser),
then run the refresh, then sign in as `facktivist` when prompted.

### Alternative — personal access token

If the browser flow keeps mis-routing, generate a classic PAT instead:

1. Open https://github.com/settings/tokens **while signed in as
   `facktivist`** (incognito window is easiest).
2. Generate a new token (classic). Tick `repo` + the missing scope
   (e.g. `project`). Set an expiry that matches your security policy.
3. Copy the token immediately — it won't be shown again.
4. ```bash
   echo "<paste>" | env -u GH_TOKEN gh auth login -u facktivist --with-token
   ```
5. Step 4 of the canonical sequence still applies — direnv needs to
   re-evaluate so the new token reaches `GH_TOKEN`.

---

## How `.envrc` interacts with all of this

The `.envrc` line that drives the precedence:

```sh
export GH_TOKEN=$(gh auth token -u facktivist)
```

- It runs on `cd` (direnv hook), so the **value** of `GH_TOKEN` is
  frozen to whatever `gh auth token -u facktivist` returned at that
  point in time.
- After a refresh, the keyring entry is updated but the env var is
  stale until direnv re-runs.
- `gh auth token -u <name>` is the keyed lookup; it returns the
  token for that named account regardless of which one is active.

That last detail matters: even if the **active** account is correct,
`gh auth token -u facktivist` returns whatever's stored under the
facktivist key — which may still be the pre-refresh token if the
refresh authorised a different account in the browser.

If `.envrc` is set up correctly and the refresh landed on the right
account, step 4 (direnv reload) is the only thing needed to make new
shells see the new scope.

---

## Quick diagnosis flowchart

```
$ gh auth status

Is `facktivist (GH_TOKEN)` listed?
├── No → direnv isn't exporting GH_TOKEN; run `direnv allow` and re-check.
└── Yes → check its scopes line.
    ├── Has the scope you need → you're done.
    └── Missing scope → does another account have it?
        ├── raveracker has it → browser sign-in landed on the wrong
        │   account. Sign out of github.com, redo the canonical
        │   four-step sequence.
        └── No account has it → refresh hasn't run yet. Do the
            canonical four-step sequence.
```

---

## Why this isn't fixed at the `.envrc` layer

The `.envrc` `GH_TOKEN` export is **load-bearing** for the
gh-account guard in `lefthook.yml` + `scripts/check-gh-account.sh` —
it pins this repo's `gh` calls to the `facktivist` identity even when
the global `raveracker` account is otherwise active. Removing the
export to "fix" the refresh interaction would re-introduce the
identity-leak risk the guard exists to prevent. The right model is
to keep the export and route around it for refresh operations only,
exactly as documented above.

---

## Related

- `CLAUDE.md` §"GitHub Identity" — original gh-account discipline rationale
- `scripts/check-gh-account.sh` — runtime guard called by lefthook pre-push
- `lefthook.yml` pre-push `gh-account` command — fails fast on identity mismatch
- `scripts/project/bootstrap.sh` — first consumer of the `project` scope
- `scripts/project/sync-status.sh` — second consumer
- `scripts/project/ensure-phase9-option.sh` — third consumer
