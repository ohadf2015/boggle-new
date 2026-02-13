---
phase: 36-foundation-refactoring
plan: 05
subsystem: education
tags: [xp-economy, progression, education, balancing]

# Dependency graph
requires:
  - phase: 36-foundation-refactoring
    provides: Phase foundation for education 2.0 refactoring
provides:
  - XP economy model spreadsheet with balanced progression rates
  - educationXpManager.ts config ready for Phase 37-39 implementation
  - Anti-inflation rules documented
affects: [37-practice-modes, 38-duels, 39-daily-challenges]

# Tech tracking
tech-stack:
  added: []
  patterns: ["XP economy modeling with progression rate analysis"]

key-files:
  created: [".planning/phases/36-foundation-refactoring/XP-ECONOMY-MODEL.md"]
  modified: ["fe-next/backend/modules/educationXpManager.ts"]

key-decisions:
  - "Mode parity design: Similar XP/hour across all practice modes (no favoritism)"
  - "Anti-inflation: New activities don't stack with existing XP sources"
  - "Progression target: Students level up every 3-4 days at early levels with daily practice"
  - "Loss XP floor: Losing a duel still awards participation XP (60% of win)"

patterns-established:
  - "XP economy modeling: Comprehensive spreadsheet approach prevents inflation"
  - "Config placeholder pattern: Add config early, implement calculation later"

# Metrics
duration: 20 min
completed: 2026-02-13
---

# Phase 36 Plan 05: XP Economy Model Summary

**Unified XP economy model prevents inflation when adding duels and practice modes across 8 new activity types**

## Performance

- **Duration:** 20 min
- **Started:** 2026-02-13T10:34:39Z
- **Completed:** 2026-02-13T10:54:44Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created comprehensive XP economy model covering 12+ activity types
- Documented existing XP sources from educationXpManager.ts with accurate session/day calculations
- Designed balanced XP rates for new activities (duels, practice modes, daily challenges)
- Progression rate analysis confirms balanced leveling pace across all modes
- Updated educationXpManager.ts with placeholder config for Phase 37-39 implementation
- Type definitions ready for new practice modes and duel activities

## Task Commits

Each task was committed atomically:

1. **Task 1: Create XP economy model document** - `859997c7` (docs)
2. **Task 2: Add new activity XP config to educationXpManager.ts** - `56bcafbd` (feat)

**Plan metadata:** (to be created in final commit)

## Files Created/Modified

- `.planning/phases/36-foundation-refactoring/XP-ECONOMY-MODEL.md` - Comprehensive XP economy spreadsheet with balancing analysis
- `fe-next/backend/modules/educationXpManager.ts` - Added config entries for duels, practice modes, daily challenges; updated PracticeSessionXp type

## Decisions Made

1. **Mode Parity Design** - Similar XP/hour across all practice modes to prevent favoritism. A student playing ONLY duels (~325 XP/day) or ONLY practice (~540 XP/day) progresses at reasonable pace.

2. **Anti-Inflation Rules** - New activities don't double-count XP. Duel awards "duel XP", not "duel XP + word discovery XP". Activity type awards XP once per session completion.

3. **Progression Target** - Students level up every 3-4 days at early levels with daily practice. Max theoretical is ~2065 XP/day without streaks, ~4130 XP/day with 30-day streak.

4. **Loss XP Floor** - Losing a duel awards minimum participation XP (60% of win for async, higher for realtime). Prevents discouragement.

5. **Placeholder Config Pattern** - Add config values and type definitions now, implement calculation functions in Phase 37-39. Enables TypeScript safety without implementation overhead.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 37, 38, 39 implementation.**

XP economy model provides:
- Exact config values for all new activity types
- Anti-inflation rules to prevent exploitation
- Progression rate analysis confirming balanced leveling
- Type definitions ready for implementation

**Next steps:**
- Phase 37: Implement practice mode XP calculation functions
- Phase 38: Implement duel XP calculation functions
- Phase 39: Implement daily challenge XP calculation
- Post-Phase 40: Full economy audit with real student data

---
*Phase: 36-foundation-refactoring*
*Completed: 2026-02-13*
