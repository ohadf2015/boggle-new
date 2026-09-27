# Lane 07 — Self-learn — 2026-09-04

status: shipped
files_touched:
  - docs/nightly/learnings.md (rewritten, 176 lines)
  - docs/nightly/loop-improvements/2026-09-04.md (new, 108 lines)
  - docs/nightly/reports/2026-09-04.md (appended Lane 7 section)

## Headline findings
1. **The loop shipped ZERO lane code on 4 consecutive gating nights** (08-28, 08-30, 08-31, 09-01).
   73 file-drops / ~30 distinct files (08-31 and 09-01 overlap by ~14 paths — lanes re-author and re-drop
   the same education/dictionary work nightly). VERIFIED root cause: `_gate_ensure_bin`
   (`gate-isolated.sh:84-96`) is guarded by `[ -e node_modules/.bin/<tool> ]`, and `rg "self-healing
   with|self-heal failed|missing dev-tool"` over all four run logs returns ZERO matches — the self-heal
   NEVER RAN. The `cp -Rc` clone (`:459-464`) leaves `.bin` symlinks present but unrunnable, `-e` passes,
   the gate dies on `command not found` -> "genuinely unverifiable" -> docs-only salvage.
   FIX: drop the guard; after the clone always assert `./node_modules/.bin/eslint --version` executes,
   `cp -a` from the primary checkout if not, hard-fail loudly if that still fails. Editing the
   `npm rebuild` line alone changes nothing — it is unreachable. Last week's file demoted this whole
   item to "watch, did not fire" — wrong call, and it cost a week of code.
2. **Preflight off-master ABORT regressed** (09-02, 09-03) after last week's file declared it CLOSED.
   Both logged "re-running once in 180 min" and no retry log was ever written — silent Class-4 failure.
   Only 4 of the last 7 nights launched lanes.
3. **Lane rc is a health signal that cannot go red** — every lane returned rc=0 on every launched night
   while zero code shipped. Proposed `files_shipped=<n>` per-lane log line.
4. **Isolated ship conflicts on the same 3 nightly artifacts every time** (impact-ledger.ndjson,
   mode-readiness.md, perf-baseline.json) -> 3 stranded refs/nightly-pending (08-03, 08-06, 08-28).
   Fix is a `merge=union` gitattribute.

next_steps:
  - Apply improvement #1 BY HAND (the loop cannot fix itself — no scripts/nightly change has landed in 14d).
  - Then #2 (short-circuit the doomed gate tiers, saves ~2h/night) and #3 (union merge driver).
  - Restore the salvaged set via per-night 3-way `git merge-file`, NEVER restore-salvaged-code.sh. Start with
    the latest tag `20260901-010005` — it alone covers most of the ~30 distinct files.
  - Restore-queue tag `20260827-010001` still has no `{"resolve":...}` line — 8 files unrestored.
