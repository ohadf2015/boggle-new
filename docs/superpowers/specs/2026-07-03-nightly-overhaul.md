# Nightly Overhaul — Close the Loop, Stop the Waste

Date: 2026-07-03. Evidence: 15-night log mining + shipped-commit audit + system map + external research.

## Measured problems (2026-06-19 → 2026-07-03)

| # | Problem | Cost |
|---|---------|------|
| P1 | Dropped/salvaged lane code: 312 files over 8 nights; founder restores manually (4 incidents) | Biggest source of lost improvements |
| P2 | No impact loop: nothing verifies yesterday's shipped change moved its metric; regressions invisible until founder notices | Unmeasured, likely large |
| P3 | Preflight aborts (wrong branch ×3, network ×1) = 4/15 zero nights, no self-heal | 27% of nights ship nothing |
| P4 | Fixed lane order + quota aborts: when usage-limit hits, remaining lanes die regardless of signal severity; lanes with empty briefs still burn quota | Quota spent on low-signal work |
| P5 | Gate wedge rc=124 on 10/15 nights (~4–6h each) — partially fixed by NIGHTLY_SKIP_NEXT_TS (c826e1924, 07-01); 07-02 still 7h | ~50h wall time |

## Design (4 changes, smallest diffs that close each loop)

### C1 — Repair pass + auto-requeue for dropped files (P1)
After drop-and-re-gate converges with ≥1 dropped file:
1. **Repair attempt**: one capped headless run (sonnet, ≤600s) fed the exact gate stderr + dropped file list; mission = fix the compile/test error only (recurring causes are mechanical: hooks after early return, `ssr:false` in Server Component). Re-gate once (typecheck tier). Pass → files rejoin allowlist.
2. **Still failing** → append entry to `docs/nightly/restore-queue.ndjson` `{date, files[], error_head, salvage_dir}` + LOUD Telegram line ("N files dropped — queued for restore").
3. Next night, Phase 0 injects unresolved restore-queue entries as TOP item in lane 01 (triage) prompt via existing `__BRIEF__` composition. Lane 01 marks entries resolved when restored.

### C2 — Impact ledger + nightly verification (P2)
- New `docs/nightly/impact-ledger.ndjson`. Lane prompts (01, 02, 03, 09, 12) gain a contract: every shipped change appends one line `{date, lane, sha?, change, metric, source: posthog|sentry|supabase, query_hint, baseline, direction, check_after_days}`. Metric optional only with explicit `"metric": "none", "why": ...`.
- New Phase 0 collector `lib/intel/collect-impact.sh`: reads ledger entries due for check (date + check_after ≤ today, unverified), queries PostHog/Sentry REST (same auth as existing collectors), writes verdicts `{improved|neutral|regressed}` back to ledger + into brief. **Regressed → becomes a top-ranked brief signal for lane 01** (fix-or-revert task) + Telegram digest line.

### C3 — Brief-scored lane scheduling + quota-aware trimming (P4)
- New `lib/lane-scheduler.sh`: reads `brief.json`, computes per-lane signal score (each brief section maps to a lane; score = severity-weighted count). Emits night's lane order: lanes sorted by score desc, fixed priority as tiebreak.
- Lanes with zero signal AND no founder directive: run at most 2 of them (rotation by day-of-year) instead of all — quota saved goes to high-signal lanes.
- Lane 01 (triage) always first, always runs. Circuit-breaker unchanged.
- On usage-limit risk (any rc=75 seen), scheduler trims to top-3 remaining scored lanes.

### C4 — Preflight self-heal: wrong-branch → worktree fallback (P3)
- Preflight currently aborts when HEAD ≠ master (founder left tree on feature branch). Instead: create/reuse dedicated worktree `~/.cache/lexi-nightly/nightly-wt` checked out to `origin/master`, run the whole nightly there. Shared-tree mode remains default when HEAD == master.
- Also fixes concurrent-session file contention (root cause behind several P1 drops) whenever founder is mid-feature at 01:00.
- Network preflight fail: keep abort but add one retry after 300s before giving up.

## Out of scope
- Gate wedge deep-fix beyond existing NIGHTLY_SKIP_NEXT_TS invariant (watch 2 more nights; wedge tier-escalation already exists).
- Auto-revert on metric regression (C2 flags it as top triage signal instead — human-visible, agent-actionable; full auto-revert is a later step).

## Verification
- Unit tests in `scripts/nightly/test/` for: scheduler scoring/ordering/trimming, ledger due-check selection, restore-queue append/consume.
- Dry-run: `run.sh` sections exercised via existing test harness patterns (107 gate tests precedent).
- Success metric for the overhaul itself: next 14 nights — dropped-files/night ↓, zero preflight-abort nights, ledger verdicts appearing in morning digest.
