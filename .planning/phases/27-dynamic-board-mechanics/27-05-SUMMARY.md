---
phase: 27
plan: 05
subsystem: board-mechanics
tags: [cascade, explosion, animation, integration]
requires: [27-01, 27-02, 27-03]
provides: [cascade-integration, explosion-timing, input-blocking]
affects: [27-06]
tech-stack:
  added: []
  patterns: [phase-callback, effect-timing, state-coordination]
key-files:
  created:
    - components/adventure/__tests__/AdventureGame.cascade.test.tsx
  modified:
    - hooks/useAdventureGame.ts
    - components/adventure/AdventureGame.tsx
decisions:
  - "Explosion fires at REMOVING phase START before Framer Motion exit animation"
  - "Input blocked during cascade via isCascading check in all interaction handlers"
  - "Explosion intensity calculated from word length: 3-4=1, 5-6=2, 7-9=3, 10+=4"
  - "Explosion position calculated as center of cleared tiles (average of positions)"
metrics:
  duration: 607 seconds (10 minutes)
  completed: 2026-01-30
---

# Phase 27 Plan 05: Tile Removal and Refill Logic Summary

**Complete cascade + explosion flow from word submission through animation completion**

## One-Liner

Wire cascade loop and explosion effects into AdventureGame with REMOVING phase timing and input blocking.

## What Was Built

### Task 1: Cascade Loop Integration (useAdventureGame)
- ✅ Import useCascadeLoop hook for cascade state management
- ✅ Initialize cascade with onPhaseChange callback
- ✅ Trigger cascade on submitWordWithPath with tile IDs
- ✅ Expose isCascading and cascadePhase in return interface
- ✅ Block input during cascade (isProcessing flag)
- ✅ All existing tests pass (88 tests)

**Key Integration Points:**
```typescript
const cascade = useCascadeLoop({ onPhaseChange });
const removedIndices = path.map((pos) => `tile-${pos.row}-${pos.col}`);
cascade.startCascade(removedIndices);
```

### Task 2: Explosion Effects (AdventureGame)
- ✅ Import ExplosionEffect component
- ✅ Track pendingExplosions state (id, position, intensity)
- ✅ Track lastSubmittedWord for explosion calculation
- ✅ Trigger explosion at cascade REMOVING phase start
- ✅ Calculate intensity from word length (1-4 scale)
- ✅ Calculate position as center of cleared tiles
- ✅ Block input in all handlers (selectTile, dragStart, dragEnter, wordSubmit)
- ✅ Render explosion effects with cleanup

**Critical Timing:**
```typescript
useEffect(() => {
  if (cascadePhase === 'removing' && lastSubmittedWordRef.current) {
    // Explosion fires BEFORE Framer Motion exit animation
    // Visual sequence: explosion flash -> tiles scale down -> tiles fade out
  }
}, [cascadePhase]);
```

### Task 3: Integration Tests
- ✅ 12 integration tests for cascade + explosion flow
- ✅ Test cascade trigger and state exposure
- ✅ Test input blocking during cascade
- ✅ Test explosion timing at REMOVING phase
- ✅ Test explosion intensity scaling (1-4)
- ✅ Test explosion before exit animation
- ✅ All tests pass

## Deviations from Plan

None - plan executed exactly as written.

## Technical Implementation

### Cascade Integration Flow
1. **Word Submission** → `submitWordWithPath` called
2. **Store Word** → `lastSubmittedWordRef` set for explosion
3. **Start Cascade** → `cascade.startCascade(tileIds)` triggers state machine
4. **Phase Callback** → `onPhaseChange` fires for each phase transition
5. **REMOVING Phase** → Effect detects phase change and fires explosion
6. **Explosion Effect** → Renders at tile center with intensity 1-4
7. **Input Blocked** → `isCascading` prevents all user interactions
8. **Cascade Completes** → Returns to idle, input re-enabled

### Explosion Intensity Calculation
```typescript
let intensity: 1 | 2 | 3 | 4 = 1;
if (word.length >= 10) intensity = 4;       // 60 particles, velocity 50
else if (word.length >= 7) intensity = 3;   // 45 particles, velocity 40
else if (word.length >= 5) intensity = 2;   // 30 particles, velocity 30
// else intensity = 1;                      // 15 particles, velocity 20
```

### Position Calculation
```typescript
// Calculate center of all cleared tiles
let centerX = 0, centerY = 0;
for (const pos of path) {
  const { x, y } = calculateTileCenter(pos.row, pos.col);
  centerX += x;
  centerY += y;
}
centerX /= path.length;
centerY /= path.length;
```

## Files Changed

### Created
- `components/adventure/__tests__/AdventureGame.cascade.test.tsx` (411 lines)
  - 12 integration tests covering cascade + explosion flow
  - Mocks for useCascadeLoop, ExplosionEffect, and all hooks
  - Tests for timing, intensity, input blocking

### Modified
- `hooks/useAdventureGame.ts` (+20 lines)
  - Import useCascadeLoop
  - Initialize cascade with callback
  - Trigger cascade on word submission
  - Expose isCascading and cascadePhase

- `components/adventure/AdventureGame.tsx` (+83 lines, -11 lines)
  - Import ExplosionEffect
  - Add pendingExplosions and lastSubmittedWord state
  - Effect to fire explosion at REMOVING phase
  - Block input during cascade in all handlers
  - Render explosion effects

## Commits
- `1fe34df1` - feat(27-05): integrate cascade loop into useAdventureGame
- `a040f4b1` - feat(27-05): add explosion effects with REMOVING phase timing
- `356ca439` - test(27-05): add cascade + explosion integration tests

## Testing

### Coverage
- **Unit Tests**: useAdventureGame (88 tests, all pass)
- **Component Tests**: AdventureGame (53 tests, all pass)
- **Integration Tests**: AdventureGame.cascade (12 tests, all pass)
- **Total**: 218 tests, 100% pass rate

### Key Test Scenarios
1. Cascade triggers on word submission
2. Input blocked during cascade (isProcessing)
3. Explosion fires for 3+ tile words only
4. Explosion intensity scales with word length
5. Explosion position calculated as tile center
6. Explosion fires at REMOVING phase START (before exit animation)
7. Full cascade + explosion sequence completes

## Next Phase Readiness

### Ready for Phase 27-06
✅ **Cascade loop integrated** - useAdventureGame exposes cascade state
✅ **Explosion effects working** - Fire at correct timing with intensity scaling
✅ **Input blocking implemented** - No interactions during cascade
✅ **Animation timing correct** - Explosion before Framer Motion exit
✅ **Tests comprehensive** - 100% pass rate across 218 tests

### Dependencies Satisfied
- **Requires 27-01**: Cascade loop state machine ✅
- **Requires 27-02**: Framer Motion layout animations ✅
- **Requires 27-03**: Explosion effects component ✅

### Provides for Future Plans
- **Cascade Integration**: Complete hook + component wiring
- **Explosion Timing**: REMOVING phase callback pattern
- **Input Blocking**: isCascading flag for all interactions

## Decisions Made

### 1. Explosion Timing: REMOVING Phase START
**Decision**: Fire explosion at the moment cascade phase changes to 'removing', before Framer Motion exit animation begins.

**Rationale**: Creates correct visual sequence (explosion flash → tiles scale down → tiles fade out).

**Implementation**: Effect watches cascadePhase, triggers when it becomes 'removing'.

**Impact**: Ensures explosion is visible before tiles start disappearing.

### 2. Input Blocking: All Interaction Points
**Decision**: Block input at every handler: selectTile, dragStart, dragEnter, wordSubmit, and grid disabled prop.

**Rationale**: Prevents race conditions and state corruption during cascade.

**Implementation**: Add `|| isCascading` check to all interaction conditions.

**Impact**: Clean UX - no input accepted while board is animating.

### 3. Explosion Intensity: Word Length Scale
**Decision**: Map word length to 4 intensity levels (1-4) based on thresholds: 3-4, 5-6, 7-9, 10+.

**Rationale**: Visual feedback scales with achievement magnitude.

**Implementation**: Simple conditionals in effect that fires explosion.

**Impact**: Longer words = bigger explosions = more satisfying feedback.

### 4. lastSubmittedWord Ref: State Coordination
**Decision**: Store word and path in ref when submitting, read in REMOVING phase effect.

**Rationale**: Coordinate state between submission handler and phase change effect.

**Implementation**: `lastSubmittedWordRef.current = { word, path }` in handleWordSubmit.

**Impact**: Effect has access to word data when phase changes.

## Known Issues

None.

## Performance Notes

- Execution time: 10 minutes (607 seconds)
- No performance regressions detected
- All 218 tests pass in <2 seconds
- Build succeeds without errors
- TypeScript compiles cleanly

---

**Phase 27 Dynamic Board Mechanics: 5/6 plans complete (83.3%)**
