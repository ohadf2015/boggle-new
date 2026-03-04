---
phase: 47-tile-reworks
plan: 05
subsystem: ui
tags: [blast, game-mechanics, special-tiles, wave-config, spawn-distribution, wildcard-removal, mirror, silver, diamond, tdd, jest]

# Dependency graph
requires:
  - phase: 47-tile-reworks
    plan: 04
    provides: Mirror tile mechanic, Wildcard fully removed from type union, Silver/Diamond multipliers

provides:
  - WaveConfig interface with mirrorEnabled, silverEnabled, diamondEnabled flags
  - vortexEnabled/frostEnabled fields (renamed from magnetEnabled/frozenEnabled with backward compat aliases)
  - Candy Crush staircase unlock progression: wave1=basics, wave2+gem, wave3+prism+mirror, wave4+frost+lightning+diamond, wave6+vortex
  - getWaveDistribution: wildcard=0 in all waves; silver present in all waves (SILVER_BASE=0.15)
  - New tile shares carved from gold+rainbow pool: mirror(0.06), diamond(0.04), vortex(0.06), frost(0.05), gem(0.06), prism(0.06), lightning(0.08)
  - Backward compat: distribution output has both vortex+magnet and frost+frozen key pairs

affects:
  - BlastView (consumes getWaveConfig/getWaveDistribution — no breaking changes, extra fields ignored)
  - blastLetterGenerator (customDistribution from wave config drives tile rolls)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "takeShare() helper: carves tile share proportionally from gold+rainbow pool (avoids zero crossing)"
    - "Backward compat aliases in distribution output: vortex=magnet, frost=frozen (both keys equal)"
    - "WaveConfig uses both new (vortexEnabled, frostEnabled) and deprecated (magnetEnabled, frozenEnabled) fields set consistently"

key-files:
  created: []
  modified:
    - fe-next/components/blast/utils/blastWaveConfig.ts
    - fe-next/components/blast/utils/__tests__/blastWaveConfig.test.ts

key-decisions:
  - "Backward compat: keep magnet/frozen as aliases in distribution output (old tests and consumers still work)"
  - "Silver baked into base distribution (SILVER_BASE=0.15) from wave 1, not wave-gated"
  - "Individual share constants reduced (lightning 0.10→0.08, gem 0.08→0.06, etc.) to prevent gold going negative in wave 5"
  - "WaveConfig: both vortexEnabled/magnetEnabled and frostEnabled/frozenEnabled set consistently (no divergence)"

requirements-completed: []

# Metrics
duration: 8min
completed: 2026-03-04
---

# Phase 47 Plan 05: Spawn Distribution Tables Summary

**Wildcard removed from all wave distributions; Candy Crush staircase unlock progression with silver baked in from wave 1 and mirror/diamond/vortex/frost gates added**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-04
- **Completed:** 2026-03-04
- **Tasks:** 2 (TDD: RED + GREEN)
- **Files modified:** 2

## Accomplishments

- Added 10 new distribution tests (RED phase): wave-by-wave unlock assertions, no-wildcard check, sum-to-1.0, WaveConfig flag checks
- Updated `WaveConfig` interface: added `mirrorEnabled`, `silverEnabled`, `diamondEnabled`, `vortexEnabled`, `frostEnabled`
- Updated `WAVE_TABLE` with correct unlock flags per wave (staircase: basics→gem→prism+mirror→frost+lightning+diamond→vortex)
- Removed wildcard entirely from `getWaveDistribution` (was 0.17 fixed base)
- Added silver as base tile (SILVER_BASE=0.15) present in all waves
- Added mirror, diamond, vortex, frost, gem, prism, lightning share extraction via takeShare()
- Distribution output includes backward compat aliases: `magnet=vortex`, `frozen=frost`
- Reduced share constants to prevent gold going negative at wave 5 (lightning 0.08, others 0.04-0.06)
- All 37 blastWaveConfig tests pass; full blast suite: 737 tests pass, 0 regressions

## Task Commits

1. **Task 1: Write failing tests for updated spawn distributions** - `448a3431` (test)
2. **Task 2: Update WaveConfig, WAVE_TABLE, and getWaveDistribution** - `38e80339` (feat)

## Files Created/Modified

- `fe-next/components/blast/utils/__tests__/blastWaveConfig.test.ts` — 13 new tests: wave unlock progression (1-6), wildcard=0, sum=1.0, WaveConfig flag types, mirrorEnabled/diamondEnabled/silverEnabled per-wave checks
- `fe-next/components/blast/utils/blastWaveConfig.ts` — WaveConfig interface expanded; WAVE_TABLE updated with all new flags; getWaveDistribution rewritten: wildcard gone, silver base, takeShare for mirror/diamond/vortex/frost/gem/prism/lightning; backward compat aliases in output

## Decisions Made

- Silver baked into base (not wave-gated) — it's the lowest-tier gold replacement, always available
- Backward compat aliases in distribution output (vortex+magnet, frost+frozen both present) — prevents breaking old tests and BlastView consumers without needing upstream changes
- Individual share values reduced vs. plan spec to keep gold positive at wave 5 (total special pool ~0.41 vs available 0.35 at wave 5 goldDist=0.14)
- WaveConfig keeps both old and new field names set consistently — avoids any consumer breaking

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] WAVE_OBJECTIVES tileType for wave 5 reverted from 'frost' to 'frozen'**
- **Found during:** Task 2 regression check (blastWaveObjectives.test.ts failed)
- **Issue:** I changed wave 5 objective tileType from 'frozen' to 'frost', but BlastTileType is still 'frozen' (frost is mechanic name, not type). Test expected 'frozen'.
- **Fix:** Reverted WAVE_OBJECTIVES[5][0].tileType back to 'frozen' (correct tile type string)
- **Files modified:** `fe-next/components/blast/utils/blastWaveConfig.ts`
- **Verification:** blastWaveObjectives test passed after revert
- **Committed in:** `38e80339` (Task 2 commit)

**2. [Rule 1 - Bug] Share values reduced to prevent gold going negative at wave 5**
- **Found during:** Task 2 test run (wave 5 gold=0 in distribution)
- **Issue:** Plan specified larger shares (gem=0.08, prism=0.08, mirror=0.08, etc.); at wave 5 with goldDist=0.14, iceDistribution=0.28, BOMB=0.22, SILVER=0.15 → rainbow=0.21, total pool=0.35. Total shares (lightning+gem+prism+frost+mirror+diamond=0.45) exceeded pool.
- **Fix:** Reduced shares: lightning 0.10→0.08, gem/prism/mirror 0.08→0.06, vortex 0.08→0.06, frost 0.06→0.05, diamond 0.05→0.04. Total shares now 0.35 for wave 5 (pool=0.35, tight but normalization handles).
- **Files modified:** `fe-next/components/blast/utils/blastWaveConfig.ts`
- **Verification:** Wave 5 gold > 0 in distribution tests pass; all sums normalize to 1.0
- **Committed in:** `38e80339` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered

None beyond the auto-fixed deviations above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Wave 1-6 spawn distributions now match the tile unlock staircase plan
- WaveConfig has all new flags needed for any future UI work (mirrorEnabled, diamondEnabled, etc.)
- All 737 blast tests pass, 0 regressions
- Phase 47 (5/5 plans) complete — ready for phase 48

## Self-Check: PASSED
- `fe-next/components/blast/utils/blastWaveConfig.ts` — FOUND (contains mirrorEnabled, vortexEnabled, SILVER_BASE, no wildcard)
- `fe-next/components/blast/utils/__tests__/blastWaveConfig.test.ts` — FOUND (contains 37 tests including new distribution tests)
- Commit `448a3431` — FOUND
- Commit `38e80339` — FOUND

---
*Phase: 47-tile-reworks*
*Completed: 2026-03-04*
