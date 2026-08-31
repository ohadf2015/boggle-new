# OPENROUTER_API_KEY rotation — handoff

**Date:** 2026-08-31
**Status:** NOT ROTATED. Blocked on human auth. Premise falsified for this repo.

## What the task asked

Rotate the `OPENROUTER_API_KEY` GitHub Actions secret in `ohadf2015/boggle-new`, on the
theory that a revoked key kept `nightly-agent.yml` dark for 3 nights while Actions were
disabled for 17+ days.

## Premise is false for this repo

Verified in this checkout (branch `agent/p0-lexiclash-rotate-openrouter-api-key-g`):

| Claim | Result |
|---|---|
| `OPENROUTER_API_KEY` is consumed here | **No.** `grep -ril openrouter . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next` returns zero real hits (only the worktree's own `.git` pointer file, which contains the branch name). |
| String ever existed here | **No.** `git log --all -S"OPENROUTER"` is empty. |
| `nightly-agent.yml` exists | **No.** `git log --all -- .github/workflows/nightly-agent.yml` is empty. Workflows present: `ci.yml`, `ci-bun.yml`, `ci-failure-assistant.yml`, `keep-alive.yml`, `quality-audit.yml`, `supabase-migrations.yml`. |

Secrets this repo's workflows actually consume: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `CODECOV_TOKEN`, `SUPABASE_ACCESS_TOKEN`,
`SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF`. No LLM-provider key at all.

**The nightly agent in this repo is not a GitHub Action.** It is a local launchd job —
`scripts/nightly/com.claude.nightly-loop.plist`, `com.claude.nightly-feedback-daemon.plist`,
`scripts/nightly/run.sh`. A revoked Actions secret could not have made it dark. If an
`OPENROUTER_API_KEY` is genuinely stale, the consumer lives in the outer
`brain-worktrees` orchestration layer, outside this checkout — that is where to look,
not here.

## What a human must do (cannot be automated from here)

1. Mint a fresh key at https://openrouter.ai/keys.
2. Set it in whichever repo actually consumes it — **not this one**, unless a consumer is
   added first. `gh secret set OPENROUTER_API_KEY --repo <owner>/<repo>`.
3. Re-run the consuming workflow.

## Verify by STATE, not by parsed output

Do not read the job's step summary or a `<task-notification>` exit code — both report the
wrapper, not the command (see `.claude/rules/60-recurring-pitfalls.md`, Class 4).

```bash
gh run list  --repo <owner>/<repo> --workflow <file>.yml --limit 1 --json databaseId
gh run view  <id> --repo <owner>/<repo> --json conclusion,jobs   # conclusion must be "success"
gh run view  <id> --repo <owner>/<repo> --log | grep -iE '401|unauthorized|invalid api key'
```

An auth failure against OpenRouter surfaces as HTTP 401 in the job log. A green
`conclusion` with 401s in the log means the consuming script swallows the error — fix that
before trusting the rotation.

## Blocked in this session

- `gh secret list --repo ohadf2015/boggle-new` required interactive approval and was not
  run. **Secret state was never read** — this document asserts nothing about whether the
  secret exists or is valid.
- Writing a GitHub secret is a `never_auto` human-auth action regardless of PAT scope.

## No test

This change is Markdown with no logic. There is nothing to assert and no consumer to
assert it against; a guard for a key this repo does not use would be dead code.

## Separate finding — NOT fixed here

`.github/workflows/supabase-migrations.yml` is a live Class 4 silent-failure plus a loaded
gun, unrelated to this task and deliberately left alone (prod DB deploy path, wrong
branch for it):

- Lines 37–41: `if: always()` followed by a hardcoded
  `echo "✅ Database migrations completed successfully"`. The summary reports success even
  when `supabase db push` failed — e.g. on the 30-day silent expiry of an `sbp_`
  `SUPABASE_ACCESS_TOKEN`.
- Line 32 runs `supabase db push` on every push to master touching
  `fe-next/supabase/migrations/**`. Project memory (`never-supabase-db-push-193-pending`)
  records ~195 of 600 local migrations pending on remote — this workflow would ship other
  sessions' unmerged migrations to prod.

Recommend its own branch: gate the summary on `steps.<id>.outcome == 'success'`, and
decide whether the auto-push should run at all.
