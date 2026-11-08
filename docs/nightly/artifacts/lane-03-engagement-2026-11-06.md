status: partial
attempted: flag hygiene sweep + new typed experiment targeting he/word-tower/daily rage clicks + instrumentation gaps
files_touched:
  - fe-next/components/wordTower/WordTowerWheel.tsx (instrumented word_tower_tap_blocked, reason=placing)
  - docs/nightly/impact-ledger.ndjson (IMPACT CHECK verdict for 10-24 offline-retry instrumentation: neutral, still 0; new entry for tonight's instrumentation)
  - docs/nightly/triage-queue.md (58-flag decided-winner sweep deferred; word-tower rage-click fix deferred to lane 02/11)
  - docs/nightly/reports/2026-11-06.md (Lane 2 section)
next_steps:
  - Flag hygiene (Step 2) NOT done: 58 active flags, no per-flag n/p-value pull this run. Script a batch sweep (one HogQL call per flag) instead of ad-hoc queries — budget ran out mid-investigation.
  - New experiment (Step 3) NOT shipped: root-caused the #1 brief signal (he/word-tower/daily rage clicks = taps on the disabled wheel during the crane-placement lock) but chose instrumentation over a blind timing/UX change — that's a game-feel call for lane 02/11, backed by real data once word_tower_tap_blocked collects for ~3 days.
  - Re-verify exp-practice-wheel-cta-v1 / exp-game-abandon-confirm-v1 wiring (repo-wide rg timed out at 2min tonight — use targeted dir search next time, not a bare recursive grep).
  - Check word_tower_tap_blocked volume in ~3 days (impact ledger entry) before deciding the word-tower fix.
