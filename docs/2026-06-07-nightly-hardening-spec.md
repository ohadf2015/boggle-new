# Nightly Hardening — 2026-06-07

Audit of the 2026-06-07 nightly run + three fixes the founder requested:
"make sure it won't happen again, look for more issues, remove the hard caps."

## What actually happened (root causes, evidence-backed)

| Symptom | Root cause | Evidence |
|---|---|---|
| **Push failed → work parked in `refs/nightly-pending/2026-06-07`** | Pure non-fast-forward **race lost twice**. A fast external pusher (founder `/commit-push`, the i18n commit `3689111a0`) won BOTH push windows. The ship code retries the rebase+push **only once** (`git-ship.sh:164`). | Log: `! [rejected] (non-fast-forward)` ×2; `Created autostash → HEAD is up to date → Applied autostash` (autostash popped **cleanly** — NOT a stash conflict); then a 2nd rejection → `conflict: unknown` salvage. |
| **4 lanes timed out (02/03/05/09)** | Fixed wall-clock `gtimeout` SIGKILL ceilings (`headless.sh:208`). Lanes 02/09 on tight 600s; ripgrep EACCES forced `find`+`grep` fallback (~10× slower). | rc=124 on each; `KEEP_TIMEOUT_PARTIALS=1` saved the partial files (no loss, but cut mid-work). |
| **Gate timed out → tests UNVERIFIED** | Fixed 2700s `gtimeout` on the whole `lint && build && test` chain (`gate-isolated.sh:182`). Suite (slow/OOM test — memory names `useBlastEngine.mpGrid.test.ts`) didn't finish; build-only re-gate passed → shipped tests-unverified by design. | `isolated-gate: did NOT complete (rc=124) after 2700s`; first-ever inconclusive night (gate normally completes). |

No silent multi-night loss (only one pending ref). `89a50d6df` is clean-FF-able and build-verified.

## Fixes

### P1 — Push race: bounded retry loop (the actual lost-work fix)
`git-ship.sh`. Replace the single rebase+push retry (and the single isolated worktree push) with a **bounded loop**: re-`fetch` + re-`rebase --autostash` (or re-create the worktree at fresh `origin/master` + re-cherry-pick) + push, up to `NIGHTLY_PUSH_RETRIES` (default 5) attempts with a short jittered `NIGHTLY_PUSH_RETRY_SLEEP` (default 3s) between. Each iteration re-fetches, so it wins as soon as it gets one clean window. Genuine same-file conflict still falls through to the existing `refs/nightly-pending` salvage (unchanged guarantee).

### P2 — Remove the hard caps: idle/progress watchdog
New `lib/idle-timeout.sh` → `run_with_idle_timeout <idle_secs> <max_secs> <outfile> -- cmd…`.
Kills the child **only** when `outfile` has had no new bytes for `idle_secs` (a true wedge), never on wall-clock-while-progressing. A far-out `max_secs` absolute backstop prevents a truly-infinite hang (launchd's 3600s is advisory/unenforced, so a literal no-cap removal would hang the night forever). Returns the child's rc, or 124 on idle/max kill.

- **Lanes** (`headless.sh`): both the claude stream (`$stream_sidecar`) and the gate write their subprocess output to a file — that file's mtime is the progress signal. Replace the fixed per-lane `gtimeout ${budget}s` with `run_with_idle_timeout ${IDLE} ${MAX} $stream_sidecar`. A productive lane emits stream-json on every tool call → never idle-killed. Idle default 300s (5 min no output = wedged); absolute max = generous (e.g. old budget × 3, env `LANE_MAX_SECS`).
- **Gate** (`gate-isolated.sh`): replace fixed 2700s with idle on `$NIGHTLY_LAST_GATE_OUTPUT`. Idle default 600s (next build's compile has ~4min quiet windows — keep > that); absolute max `NIGHTLY_GATE_MAX_SECS` default 5400s. A hanging test (no output 10min) still dies → build-only re-gate; a slow-but-progressing suite (emits per-file ✓) runs to completion → tests VERIFIED.

The rc=124 → rc=3 INCONCLUSIVE handling and `KEEP_TIMEOUT_PARTIALS` salvage are unchanged (idle-kill returns 124 too).

### P3 — ripgrep EACCES (cheap; removes the lane-slowness multiplier)
Headless lanes' Grep/Glob fall back to slow `find`+`grep` because claude's bundled `rg` lacks exec perm in the launchd env. Fix perms / set `RIPGREP_PATH` so lanes search fast. Environmental, not a repo behavior change.

### P0 — Recover `89a50d6df`
Build-verified, clean-FF. Push it (or fast-forward local) so the night's work isn't stranded. Ask before push (project git rule).

## TDD
- `test/git-ship.test.sh`: new scenario — bare origin `pre-receive` hook rejects the first K push attempts then accepts → loop succeeds on K+1; plus all-fail → existing salvage still fires.
- `test/idle-timeout.test.sh` (new): steady-writer completes; silent-writer idle-killed (124); over-max killed (124); fast cmd returns its rc.
- Existing `gate-isolated.test.sh` / `headless` seams stay green.
