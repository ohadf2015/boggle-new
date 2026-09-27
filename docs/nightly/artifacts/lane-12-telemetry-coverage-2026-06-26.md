---
status: shipped
files_touched:
  - fe-next/lib/drills/telemetry.ts (trackDrillStart now also calls trackGameStart brain-drill)
  - fe-next/lib/drills/__tests__/telemetry.test.ts (new assertion for game_started symmetry)
  - docs/nightly/reports/2026-06-26.md (lane 12 section appended)
next_steps: Wire game_completed for random mode (91 game_started / 0 game_completed — largest funnel blind spot); then adventure mode completion hole (5 started / 0 completed)
---

## Coverage audit 2026-06-26

- 108 registry events · 59 DEAD (long-standing) · 0 CRATERED
- Per-mode holes: random (91→0), adventure (5→0), adventure-boss (3→0)
- brain-drill: game_completed x16 / game_started x0 → FIXED
  - Root cause: trackDrillStart only fired drill_started (custom), never game_started
  - Fix: one import + one call in telemetry.ts fixes all 5 drill types
  - TDD: test asserts trackGameStart('brain-drill', {drillType, level}) on every trackDrillStart call
