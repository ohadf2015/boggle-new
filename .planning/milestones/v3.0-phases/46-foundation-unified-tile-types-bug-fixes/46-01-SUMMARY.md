---
phase: 46-foundation-unified-tile-types-bug-fixes
plan: 01
subsystem: shared-types
tags: [types, blast, migration, unification]
dependency_graph:
  requires: []
  provides: [canonical-BlastTileType, shared-types-blast]
  affects: [blast-multiplayer, blast-singleplayer, phaser-blast]
tech_stack:
  added: []
  patterns: [canonical-type-source, re-export-pattern]
key_files:
  created:
    - fe-next/shared/types/blast.ts
    - fe-next/shared/types/__tests__/blast.test.ts
  modified:
    - fe-next/shared/types/index.ts
    - fe-next/shared/constants/blastMultiplayerConstants.ts
    - fe-next/shared/types/game.ts
    - fe-next/shared/types/socket.ts
    - fe-next/backend/modules/blastModeManager.ts
    - fe-next/backend/modules/__tests__/blastModeManager.test.ts
    - fe-next/components/blast/types.ts
    - fe-next/components/game/BlastMultiplayerOverlay.tsx
    - fe-next/translations/en.js
    - fe-next/translations/he.js
    - fe-next/translations/sv.js
    - fe-next/translations/ja.js
    - fe-next/translations/es.js
decisions:
  - BlastTileType union of 11 types: standard + gold + bomb + rainbow + ice + wildcard + lightning + magnet + prism + gem + frozen
  - components/blast/types.ts kept as re-export hub so all blast component imports remain unchanged
  - BLAST_TILE_BONUSES expanded to full 11-type canonical set (MP had 8 types, SP had 11)
  - BlastMPTileType introduced as MP-specific subset type for future type safety
metrics:
  duration: 13min
  completed: "2026-03-04"
  tasks: 2
  files: 13
---

# Phase 46 Plan 01: Unify BlastTileType Summary

Single `BlastTileType` union in `shared/types/blast.ts` — 11 types, canonical source, all 35+ consumers migrated, MP 'normal' renamed to 'standard'.

## What Was Built

**Task 1: Canonical type + verification test**

Created `fe-next/shared/types/blast.ts` with:
- `BlastTileType` union: `'standard' | 'gold' | 'bomb' | 'rainbow' | 'ice' | 'wildcard' | 'lightning' | 'magnet' | 'prism' | 'gem' | 'frozen'`
- `BLAST_TILE_TYPE_LIST` const array for runtime iteration
- `BlastTileState` interface (moved from `components/blast/types.ts`)

Tests confirm:
- Exactly 11 entries
- 'standard' is present, 'normal' is not
- All expected types included
- No duplicates

**Task 2: Consumer migration**

All consumers now import from `@/shared/types/blast` (directly or via `components/blast/types.ts` re-export):
- `components/blast/types.ts`: local definitions removed, re-exports canonical types
- `shared/constants/blastMultiplayerConstants.ts`: local type removed, imports from shared; 'normal' renamed to 'standard'; BLAST_TILE_BONUSES expanded to all 11 types
- `shared/types/game.ts`: import path updated
- `shared/types/socket.ts`: import path updated
- `backend/modules/blastModeManager.ts`: 'normal' → 'standard', import from shared
- `components/game/BlastMultiplayerOverlay.tsx`: import from shared

## Verification

```
npx jest --testPathPattern="blast" --no-coverage
Test Suites: 51 passed, 51 total
Tests:       594 passed, 594 total
```

```
grep "^export type BlastTileType" fe-next/**/*.ts
→ Only: ./shared/types/blast.ts:10:export type BlastTileType =
```

```
grep "'normal'" in blast files
→ None found
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Pre-commit hook failing on missing translation keys**
- **Found during:** Task 1 commit
- **Issue:** Pre-commit hook (translation check) exited with code 1 due to 8 missing keys (`wordHunt.found`, `wordHunt.foundTarget`, `wordHunt.guessTarget`, `wordHunt.submit`, `wordHunt.lifeBar`, `presets.fast`, `presets.party`, `presets.challenge`) used in pre-existing untracked files in the working tree. Blocked all commits.
- **Fix:** Added all 8 missing keys to all 5 translation files (en, he, sv, ja, es)
- **Files modified:** `translations/en.js`, `translations/he.js`, `translations/sv.js`, `translations/ja.js`, `translations/es.js`
- **Commit:** `563e2962`

**2. [Rule 1 - Bug] blastModeManager.ts used 'normal' as default fallback tile type**
- **Found during:** Task 2 review of blastModeManager.ts
- **Issue:** Lines 148/159 had `|| 'normal'` as default tile type; line 28 filtered `t !== 'normal'`
- **Fix:** Renamed to `'standard'` throughout; updated corresponding test assertions
- **Files modified:** `backend/modules/blastModeManager.ts`, `backend/modules/__tests__/blastModeManager.test.ts`
- **Commit:** `29f34e4e`

**3. [Rule 1 - Bug] BLAST_TILE_BONUSES had only 8 types (missing wildcard, prism, frozen)**
- **Found during:** Task 2 — creating full canonical BLAST_TILE_BONUSES record
- **Issue:** MP constants only covered 8 tile types; SP uses 11. Type error would occur when any of the 3 new types were scored in MP.
- **Fix:** Added `wildcard: 1`, `prism: 2`, `frozen: 1.5` to `BLAST_TILE_BONUSES`
- **Files modified:** `shared/constants/blastMultiplayerConstants.ts`
- **Commit:** `29f34e4e`

### Pre-existing Build Error (not addressed)

Build fails with 5 "Module not found" errors (`dailyChallengesManager.js`, etc.) — confirmed pre-existing in STATE.md, not in scope for this plan.

## Self-Check: PASSED

Files exist:
- [x] `fe-next/shared/types/blast.ts` - FOUND
- [x] `fe-next/shared/types/__tests__/blast.test.ts` - FOUND

Commits exist:
- [x] `563e2962` - FOUND
- [x] `29f34e4e` - FOUND
