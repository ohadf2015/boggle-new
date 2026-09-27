# Nightly hardening — never give up on a lane, never strand work (2026-05-28)

Source: `/claude-council` (gemini-3-flash, grok-4.20-reasoning) + advisor review.
Measured over last 6 nights (46 lane-runs): Lane 05 100% timeout/zero-output;
35% lane-run timeout rate; push FAILED 2/6 nights with work stranded; gate-fail
discards all code (docs-only salvage).

## Invariant we are buying

**After every run, `local master == origin/master`.** A nightly commit is either
pushed, or saved to a recovery ref and master reset to origin. This is the crux:
preflight ABORTS on any unpushed non-docs commit, so a stranded nightly commit
does not merely lose one night — it BRICKS every subsequent night until a human
intervenes (this is exactly what forced the 2026-05-27 manual recovery; 05-28
only ran because the founder cleared the strand).

## P0a — git-ship: preserve + reset + notify (was: strand local commit)

`scripts/nightly/lib/git-ship.sh` terminal failure path (genuine non-docs
rebase conflict, or rebased-push otherwise failed):

OLD: `git rebase --abort` → commit left on local master → return 1.
   → bug: strands the commit, blocks the next preflight.

NEW:
1. `git rebase --abort` (restore tree).
2. Save the commit: `git update-ref refs/nightly-pending/$TODAY <HEAD>`.
3. Preserve founder WIP across the reset: if tree dirty, `git stash push -u`
   (pop conflict keeps the stash entry → never lost).
4. `git reset --hard origin/master` → master == origin/master.
5. Restore WIP: `git stash pop` (notify if it conflicts).
6. Telegram: name the conflict file + the exact recovery command
   (`git cherry-pick $(git rev-parse refs/nightly-pending/$TODAY)`).
7. return 1 (visible failure, but recoverable AND non-blocking).

We do NOT auto-resurrect the pending ref on a later run: a genuine non-docs
conflict means a human edited the same source, and silently auto-merging
concurrent human edits is unsafe (advisor reject). The ref + Telegram make it a
30-second human cherry-pick. (Follow-up: prune `refs/nightly-pending/*` >14d —
harmless to accumulate, not done this pass.)

Test (`scripts/nightly/test/git-ship.test.sh`): rewrite scenarios 5 & 8 to the
new contract (master==origin, commit recoverable via ref, alert names file +
recovery), add a scenario proving founder WIP survives the reset.

## P0c — never give up on a lane

1. `scripts/nightly/run.sh:41` — flip `KEEP_TIMEOUT_PARTIALS` default 0 → 1.
   A lane that hits exit-124 but left ≥1 file keeps it (the gate still validates
   before anything ships). Combined with (2), a timed-out lane never yields nothing.
   KNOWN TRADE-OFF (watch in learnings): a half-written `.tsx` from a timed-out
   lane now ENTERS the gate. If drop-and-re-gate's 2 rounds can't isolate it, the
   night falls to docs-only salvage — losing the GOOD lanes' code that would have
   shipped under the old revert-on-timeout behavior. Not a correctness/strand bug
   (docs-only salvage is the pre-existing fallback), but if docs-only nights tick
   up after this flip, P2 (validated-slice salvage) jumps priority.
2. Mandatory-Minimum-Artifact contract added to lane prompts: BEFORE doing the
   heavy work, every lane writes `docs/nightly/artifacts/lane-NN-$TODAY.md` with
   status / attempted / files_touched / next_steps. Docs live outside `fe-next/`
   so they are gate-clean by construction → always shippable. This is a
   BEST-EFFORT FLOOR, not a hard guarantee: it is a prompt instruction, so a true
   SIGKILL can still preempt even the first write. Front-loading it ("FIRST
   action") is the mitigation; a stream-log post-kill synthesizer (grok's idea)
   is the hard-guarantee version, deferred.
3. Lane 05 scope cut: prompt changes "full landing variant in 5 locales" → ONE
   small shippable slice per night (one section / copy+CTA tweak / one route),
   behind the existing flag. Bigger timeout is the weakest lever (council
   consensus); scope + mandatory artifact is the fix.

## P1 (follow-up, not tonight) — kill MCP-hang timeouts

Pre-fetch PostHog / GSC / heavy Supabase queries into
`docs/nightly/data-cache/$TODAY/*.json` before lanes; lanes read the snapshot
first, only hit live MCP if stale/missing. Per-lane MCP allowlist via
`claude -p --mcp-config <lane.json> --strict-mcp-config` (CLI supports both).
Highest stability ROI but largest effort → separate session.

## Done-bar

All 11 nightly bash suites green (the only verification proxy without a live
2am run): `for t in scripts/nightly/test/*.test.sh; do bash "$t"; done`.
