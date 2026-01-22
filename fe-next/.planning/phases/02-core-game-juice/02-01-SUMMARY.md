---
phase: 02-core-game-juice
plan: 01
subsystem: adventure-mode
tags: [animation, trail, visual-feedback, wordpathtrail, adventure]
requires:
  - 01-01-remotion-setup
  - WordPathTrail component (pre-existing)
provides:
  - Word selection trail animation in adventure mode
  - Visual feedback during letter selection
  - Coordinate-based path point calculation
affects:
  - 02-02 (may reference trail pattern)
  - 02-03 (may reference trail pattern)
tech-stack:
  added: []
  patterns:
    - forwardRef for grid container ref passing
    - Coordinate calculation with DOM fallback
    - State-driven animation triggers
key-files:
  created:
    - components/adventure/__tests__/AdventureGrid.trail.test.tsx
  modified:
    - hooks/useAdventureSelection.ts
    - components/adventure/AdventureGrid.tsx
    - components/adventure/AdventureGame.tsx
decisions:
  - id: trail-coordinate-calculation
    what: Calculate path points from tile DOM positions
    why: Provides accurate coordinates for trail animation
    alternatives: [CSS-only approach, Canvas-based trail]
    tradeoffs: DOM queries impact performance but ensure accuracy
  - id: forwardref-pattern
    what: Use forwardRef to expose grid container ref
    why: Enables coordinate calculation in parent hook
    alternatives: [Context API, Custom ref prop]
    tradeoffs: More complex typing but standard React pattern
  - id: stable-timestamps
    what: Use index-based timestamps instead of Date.now()
    why: Prevents re-renders and ensures consistent animation
    alternatives: [Date.now(), Performance.now()]
    tradeoffs: Less accurate timing but better performance
metrics:
  duration: 18min
  completed: 2026-01-22
---

# Phase 2 Plan 1: Word Selection Trail Animation Summary

**One-liner:** Integrated WordPathTrail animation into adventure mode with coordinate-based path tracking and real-time visual feedback

## What Was Built

Integrated the existing WordPathTrail component into adventure mode to provide visual feedback as users select letters. The trail connects selected tiles with an animated glowing line that changes color based on word validity and flashes on successful submission.

### Core Components

1. **useAdventureSelection Hook Enhancement**
   - Added PathPoint calculation using tile DOM positions
   - Accepts gridRef for coordinate lookup
   - Provides stable timestamp-based animation timing
   - Includes mathematical fallback for element-less scenarios

2. **AdventureGrid Integration**
   - Implemented forwardRef pattern to expose grid container
   - Added data-row and data-col attributes to tiles
   - Rendered WordPathTrail overlay inside grid container
   - Passed trail props (pathPoints, isWordValid, wasWordSubmitted)

3. **AdventureGame Orchestration**
   - Connected gridRef from AdventureGrid to useAdventureSelection
   - Tracked word validity and submission state
   - Flashed trail on successful word submission (400ms duration)

### Technical Implementation

**Path Point Calculation:**
```typescript
const pathPoints = useMemo(() => {
  // Get cell elements by data-row/data-col
  const cellElement = gridContainer.querySelector(
    `[data-row="${tile.row}"][data-col="${tile.col}"]`
  );

  // Calculate center position relative to grid
  const rect = cellElement.getBoundingClientRect();
  const gridRect = gridContainer.getBoundingClientRect();

  return {
    x: rect.left + rect.width / 2 - gridRect.left,
    y: rect.top + rect.height / 2 - gridRect.top,
    timestamp: baseTimestamp + index * 100, // Stable timing
  };
}, [selectedIndices, tiles, gridRef, gridSize]);
```

**Coordinate Fallback:**
If DOM elements not found (e.g., in tests), calculate mathematically:
```typescript
const cellSize = gridRect.width / gridSize;
const gap = 4; // Tailwind gap-1
return {
  x: tile.col * (cellSize + gap) + cellSize / 2,
  y: tile.row * (cellSize + gap) + cellSize / 2,
  timestamp: baseTimestamp + index * 100,
};
```

## Testing

Created comprehensive trail integration tests (`AdventureGrid.trail.test.tsx`):

**Trail Rendering:**
- ✓ Renders trail with 2+ path points
- ✓ Does NOT render with <2 points
- ✓ Handles undefined/empty pathPoints

**Trail Props:**
- ✓ Passes isValid to WordPathTrail
- ✓ Passes wasSubmitted to WordPathTrail
- ✓ Passes pathPoints array correctly

**Tile Data Attributes:**
- ✓ Tiles have data-row attributes
- ✓ Tiles have data-col attributes
- ✓ Coordinates match tile positions

**Trail Container:**
- ✓ Absolute positioning
- ✓ pointer-events-none (non-interactive overlay)

**All 471 adventure tests pass** (no regressions)

## User Experience

**Before:**
- No visual feedback during letter selection
- Unclear path between selected tiles

**After:**
- Animated trail connects selected tiles
- Glow effect on high-end devices
- Simple line on low-end devices
- Trail color indicates word validity (cyan = valid)
- Flash effect on successful submission
- Respects prefers-reduced-motion (static line fallback)

## Performance Considerations

**Optimizations:**
- Stable timestamps prevent re-renders
- useMemo for path point calculations
- Mathematical fallback avoids repeated DOM queries
- Trail only renders when 2+ points selected

**Device Adaptation:**
- Glow effects disabled on low-end devices
- Particles disabled with prefers-reduced-motion
- Simplified rendering for accessibility

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Ready for 02-02 (Tile Cascade Animation):**
- ✓ Trail pattern established for other animations
- ✓ Device performance hooks in place
- ✓ Test patterns reusable

**Ready for 02-03 (Word Flash Animation):**
- ✓ wasWordSubmitted state pattern available
- ✓ Timing coordination (400ms flash) established

**Blockers:** None

**Concerns:**
- Build issue with friends page pre-exists (unrelated to this work)
- DOM coordinate queries may impact performance on very large grids (not an issue for 4-7 grid sizes)

## File Changes

### Created (1 file)
- `components/adventure/__tests__/AdventureGrid.trail.test.tsx` (226 lines)

### Modified (3 files)
- `hooks/useAdventureSelection.ts` (+58 lines)
  - Added PathPoint type
  - Added gridRef prop
  - Added pathPoints calculation
  - Return pathPoints in hook result

- `components/adventure/AdventureGrid.tsx` (+26 lines, refactored)
  - Implemented forwardRef pattern
  - Added trail props (pathPoints, isWordValid, wasWordSubmitted)
  - Added data-row/data-col attributes to tiles
  - Rendered WordPathTrail overlay

- `components/adventure/AdventureGame.tsx` (+15 lines)
  - Created gridRef and passed to AdventureGrid
  - Added wasWordSubmitted and isWordValid state
  - Passed trail props to AdventureGrid
  - Flash trail on submission (400ms)

## Commits

| Commit | Message | Files |
|--------|---------|-------|
| c8be486 | feat(02-01): add pathPoints calculation to useAdventureSelection | hooks/useAdventureSelection.ts |
| 38be23d | feat(02-01): integrate WordPathTrail into AdventureGrid | components/adventure/AdventureGrid.tsx |
| d0cc365 | feat(02-01): wire trail into AdventureGame and add tests | AdventureGame.tsx, AdventureGrid.tsx, useAdventureSelection.ts, AdventureGrid.trail.test.tsx |

## Lessons Learned

1. **forwardRef Complexity:** Using forwardRef requires careful typing but provides clean ref access pattern
2. **Stable Timestamps:** Index-based timestamps prevent re-renders and ensure consistent animations
3. **DOM Fallback:** Mathematical coordinate calculation enables testing without DOM
4. **Test Mocking:** Jest module mocks need proper component structure (displayName, etc.)

## Future Improvements

1. **Real-time Validation:** Could validate word as user selects (show trail color change)
2. **Performance Profiling:** Measure impact on low-end devices with large grids
3. **Trail Customization:** World-specific trail colors/effects
4. **Accessibility:** Add ARIA live region announcing letter selection

---

**Status:** ✅ Complete - All tasks executed, tests pass, ready for Phase 2 continuation
