---
phase: 50-psychological-hooks
plan: 01
subsystem: ui
tags: [react, framer-motion, blast-mode, cascade, animation, i18n]

# Dependency graph
requires: []
provides:
  - BlastChainCounter component with escalating color progression (white→gold→orange→rainbow)
  - blastChainCounter.ts pure logic (getChainColor, getChainLabel, CHAIN_COLOR_PROGRESSION)
  - BlastGameLayout wired to render BlastChainCounter overlay above grid during cascades
  - MAX_CASCADE_CHAIN raised from 2 to 5 for richer chain building
  - blast.chainCounter translation key in all 4 languages (en/he/sv/ja)
affects: [50-02, 50-03, 50-04, 50-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "data-chain-color attribute on testid element for jsdom-safe color testing (avoids RGB normalization)"
    - "Pure utility + visual component split: blastChainCounter.ts for logic, BlastChainCounter.tsx for UI"

key-files:
  created:
    - fe-next/components/blast/utils/blastChainCounter.ts
    - fe-next/components/blast/utils/__tests__/blastChainCounter.test.ts
    - fe-next/components/blast/BlastChainCounter.tsx
    - fe-next/components/blast/__tests__/BlastChainCounter.test.tsx
  modified:
    - fe-next/components/blast/BlastGameLayout.tsx
    - fe-next/components/blast/types.ts
    - fe-next/translations/en.js
    - fe-next/translations/he.js
    - fe-next/translations/sv.js
    - fe-next/translations/ja.js

key-decisions:
  - "data-chain-color attribute on wrapper div exposes color for tests (jsdom normalizes inline hex to rgb())"
  - "MAX_CASCADE_CHAIN 2→5: enables longer chains visible to player for more psychological impact"
  - "BlastChainCounter positioned as absolute overlay above grid area (z-50) so it doesn't shift layout"
  - "Translation key added without using t() in component — consistent with existing CASCADE announcement hardcoding in BlastGameLayout"

requirements-completed: [PSYC-01]

# Metrics
duration: 5min
completed: 2026-03-04
---

# Phase 50 Plan 01: Cascade Chain Counter Summary

**Animated chain counter overlay (CHAIN x2→x5) with white→gold→orange→rainbow escalation wired above Blast Mode grid**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-04T16:11:51Z
- **Completed:** 2026-03-04T16:17:08Z
- **Tasks:** 2 (pure logic + component; wiring + config)
- **Files modified:** 10

## Accomplishments
- Pure utility `blastChainCounter.ts` with `getChainColor`, `getChainLabel`, `CHAIN_COLOR_PROGRESSION` — 13 unit tests
- `BlastChainCounter.tsx` animated overlay: white (#FFFFFF) at x1, gold (#FFD700) at x2, orange (#FF6B35) at x3, rainbow gradient at x4+ — 12 component tests
- `BlastGameLayout` wired: renders `BlastChainCounter` as z-50 absolute overlay above grid when `cascadeChainLevel > 0`
- `MAX_CASCADE_CHAIN` raised from 2 to 5 enabling 5-level chains for stronger psychological reinforcement
- Translation key `blast.chainCounter` added to all 4 languages (en/he/sv/ja)

## Task Commits

1. **Task 1: Core logic + component** - `f990d09e` (feat) — note: partial files were pre-committed in 50-02/50-04 runs; this commit covers wiring + config
2. **Pre-committed:** `blastChainCounter.ts` + `BlastChainCounter.tsx` were included in `75a489bd` (50-04) and test file in `b912de47` (50-02)

## Files Created/Modified
- `fe-next/components/blast/utils/blastChainCounter.ts` - Pure color/label logic (pre-committed in 50-04)
- `fe-next/components/blast/utils/__tests__/blastChainCounter.test.ts` - 13 pure logic tests
- `fe-next/components/blast/BlastChainCounter.tsx` - Animated overlay component (pre-committed in 50-04)
- `fe-next/components/blast/__tests__/BlastChainCounter.test.tsx` - 12 component tests (pre-committed in 50-02)
- `fe-next/components/blast/BlastGameLayout.tsx` - Added import + BlastChainCounter render above grid
- `fe-next/components/blast/types.ts` - MAX_CASCADE_CHAIN: 2 → 5
- `fe-next/translations/en.js` - Added blast.chainCounter: "CHAIN x{{count}}"
- `fe-next/translations/he.js` - Added blast.chainCounter: "רצף x{{count}}"
- `fe-next/translations/sv.js` - Added blast.chainCounter: "KEDJA x{{count}}"
- `fe-next/translations/ja.js` - Added blast.chainCounter: "チェーン x{{count}}"

## Decisions Made
- Used `data-chain-color` attribute on the wrapper `div` to expose chain color for test assertions — jsdom normalizes `#FFFFFF` to `rgb(255,255,255)` in inline styles, making hex matching fragile. The data attribute preserves the raw value.
- Positioned counter as `absolute top-2 left-1/2 -translate-x-1/2 z-50` inside the grid container div to keep it centered without affecting layout flow.
- Translation key registered for future i18n support; component currently hardcodes via `getChainLabel()` consistent with existing `CASCADE x{N}` announcement in same file.

## Deviations from Plan

### Pre-execution Context
The core files (`blastChainCounter.ts`, `BlastChainCounter.tsx`, and `BlastChainCounter.test.tsx`) were already committed in earlier phase 50 plan executions (50-02 and 50-04) which ran out of order. This plan executed the remaining tasks: BlastGameLayout wiring, MAX_CASCADE_CHAIN increase, and translations.

None — plan executed as written.

## Issues Encountered
- jsdom normalizes hex color values in inline styles to `rgb()` format — resolved by adding `data-chain-color` attribute as a testable color indicator.

## Self-Check

Files exist:
- `/Users/ohadfisher/git/boggle-new/fe-next/components/blast/utils/blastChainCounter.ts` ✓
- `/Users/ohadfisher/git/boggle-new/fe-next/components/blast/BlastChainCounter.tsx` ✓
- `/Users/ohadfisher/git/boggle-new/fe-next/components/blast/BlastGameLayout.tsx` ✓ (BlastChainCounter imported)

Commits exist:
- `f990d09e` ✓ (wiring + config)
- `75a489bd` ✓ (blastChainCounter.ts + BlastChainCounter.tsx)
- `b912de47` ✓ (BlastChainCounter.test.tsx)

Tests: 25/25 passing

## Self-Check: PASSED

## Next Phase Readiness
- BlastChainCounter component ready; cascadeChainLevel exposed from useBlastGame for rendering
- MAX_CASCADE_CHAIN=5 enables longer chains for PSYC-02/03 hooks to build upon
- Translation key added for future i18n wiring

---
*Phase: 50-psychological-hooks*
*Completed: 2026-03-04*
