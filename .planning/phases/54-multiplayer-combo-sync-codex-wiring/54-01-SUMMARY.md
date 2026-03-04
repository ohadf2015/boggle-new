---
phase: 54-multiplayer-combo-sync-codex-wiring
plan: "01"
subsystem: blast-multiplayer
tags: [blast, multiplayer, combo-sync, codex, socket, auth]
dependency_graph:
  requires: []
  provides: [SYNC-02, SYNC-04]
  affects: [useWordSubmission, BlastView, InGameScreen, PortraitLayout, LandscapeLayout]
tech_stack:
  added: []
  patterns: [comboTypeRef pattern, onPathSubmit detection, useAuth userId wiring]
key_files:
  created:
    - fe-next/components/blast/__tests__/BlastView.discovery.test.tsx (modified — added 2 new tests)
    - fe-next/components/game/in-game/hooks/__tests__/useWordSubmission.comboType.test.ts
  modified:
    - fe-next/components/blast/BlastView.tsx
    - fe-next/components/game/in-game/hooks/useWordSubmission.ts
    - fe-next/components/game/InGameScreen.tsx
    - fe-next/components/game/in-game/components/PortraitLayout.tsx
    - fe-next/components/game/in-game/components/LandscapeLayout.tsx
decisions:
  - "comboTypeRef stored in InGameScreen (not passed down from parent) — detected internally from blastTileOverlay"
  - "handlePathSubmit only detects combos when gameMode === 'blast' && blastTileOverlay exists — safe no-op otherwise"
  - "comboTypeRef added to useCallback dep array per react-hooks/exhaustive-deps (refs are stable, no perf impact)"
metrics:
  duration: 15min
  completed: "2026-03-04"
  tasks: 2
  files: 7
---

# Phase 54 Plan 01: Multiplayer Combo Sync + Codex Wiring Summary

Two narrow wiring gaps closed to complete SYNC-02 and SYNC-04: `comboType` now flows from path detection through socket emit to server broadcast, and authenticated `userId` reaches `useBlastComboDiscovery` for Supabase persistence.

## What Was Built

### SYNC-04 — Authenticated Combo Codex Persistence (Task 1)

`BlastView.tsx` now imports `useAuth` and passes `user?.id` to `useBlastComboDiscovery`:

```typescript
const { user } = useAuth();
const { discoveredCombos, ... } = useBlastComboDiscovery({ userId: user?.id });
```

The hook already supported `userId` (implemented in Phase 52) but `BlastView` was calling it with no args. Three lines of production change closes the gap.

### SYNC-02 — comboType in Multiplayer submitWord Emit (Task 2)

**useWordSubmission:** Added optional `comboTypeRef?: MutableRefObject<string | null>` to options. Socket emit now includes `comboType: comboTypeRef?.current ?? null`.

**InGameScreen:** Added:
- `comboTypeRef = useRef<string | null>(null)`
- `handlePathSubmit` callback: when `gameMode === 'blast'` and `blastTileOverlay` exists, builds a minimal `BlastTileState[][]` from the overlay, calls `detectSpecialCombos(path, tileStates)`, stores first combo type in ref
- Passes `comboTypeRef` to `useWordSubmission`
- Passes `handlePathSubmit` to `sharedLayoutProps.onPathSubmit`

**PortraitLayout + LandscapeLayout:** Added `onPathSubmit?` prop, wired to `GridComponent`.

`GridComponent.onPathSubmit` fires synchronously before `onWordSubmit` in the same tick (existing behavior in `useGridInteraction.ts`) — so `comboTypeRef.current` is set before the socket emit reads it.

## Tests

| Suite | Tests | Result |
|-------|-------|--------|
| BlastView.discovery (2 new) | userId wiring (auth + unauth) | PASS |
| useWordSubmission.comboType (3 new) | comboType present / null / backward-compat | PASS |
| Full suite | 11125 tests | PASS |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Lint] Duplicate react imports in test file**
- **Found during:** Task 2 lint run
- **Issue:** Test file had separate `import { useRef } from 'react'` and `import type { MutableRefObject } from 'react'`
- **Fix:** Merged into single `import { useRef, type MutableRefObject } from 'react'`
- **Files modified:** `useWordSubmission.comboType.test.ts`
- **Commit:** f96f1e67

**2. [Rule 2 - Missing dep] comboTypeRef not in useCallback dependency array**
- **Found during:** Task 2 lint run
- **Issue:** `react-hooks/exhaustive-deps` warning — `comboTypeRef` used in `useCallback` but not in dep array
- **Fix:** Added `comboTypeRef` to dep array. Refs are stable objects so no re-render impact.
- **Files modified:** `useWordSubmission.ts`
- **Commit:** f96f1e67

## Commits

| Hash | Message |
|------|---------|
| 2d8e9ede | feat(54-01): wire userId from useAuth to useBlastComboDiscovery in BlastView |
| d70aa097 | feat(54-01): include comboType in multiplayer blast submitWord socket emit |
| f96f1e67 | fix(54-01): fix lint issues in comboType wiring |

## Self-Check: PASSED

All key files verified present. All commits verified in git log.
