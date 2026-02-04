# AdventureGrid.tsx Extraction Plan

**Current Size:** 975 lines
**Target Size:** <500 lines
**Lines to Extract:** ~475+ lines

---

## Phase 1: Extract Tile Badge Components (Priority: HIGH, Impact: ~90 lines)

### Current Structure (lines 838-925):
- Gold badge (16 lines)
- Rainbow badge (14 lines)
- Bomb badge + row indicator (20 lines)
- Chain badge (14 lines)
- Time badge (14 lines)
- Frost overlay (10 lines)

### Extraction Strategy:

**1.1 Create `TileBadge.tsx` Component**
```typescript
interface TileBadgeProps {
  type: TileType;
  isFrozen?: boolean;
}

export function TileBadge({ type, isFrozen }: TileBadgeProps) {
  // Render appropriate badge based on type
  // Each badge is a pure presentational component
}
```

**Benefits:**
- Reduces main component by ~90 lines
- Single responsibility (badge rendering)
- Easier to test badge variants
- Can add new tile types without modifying main component

**Testing:**
- Test each badge variant renders correctly
- Test frost overlay on ice tiles
- Snapshot tests for visual consistency

---

## Phase 2: Extract Touch/Drag Gesture Logic (Priority: MEDIUM, Impact: ~150 lines)

### Current Structure:
- 6 refs for drag state tracking (lines 168-178)
- 5 event handlers (lines 327-462):
  - handleDragStart (30 lines)
  - handleDragEnter (11 lines)
  - handleDragEnd (14 lines)
  - handleTouchMove (79 lines) ← LARGEST
  - handleMouseUp (11 lines)
- Grid measurement caching (lines 310-325)

### Extraction Strategy:

**2.1 Create `useGridGestures` Custom Hook**
```typescript
interface UseGridGesturesProps {
  gridRef: RefObject<HTMLDivElement>;
  gridSize: number;
  interactive: boolean;
  disabled: boolean;
  onTileSelect?: (index: number, tile: GridTileState) => void;
  onDragStart?: (index: number, tile: GridTileState) => void;
  onDragEnter?: (index: number, tile: GridTileState) => void;
  onDragEnd?: () => void;
}

export function useGridGestures(props: UseGridGesturesProps) {
  // All drag/touch logic isolated
  return {
    handleTileClick,
    handleDragStart,
    handleDragEnter,
    handleDragEnd,
    handleTouchMove,
    handleMouseUp,
  };
}
```

**Benefits:**
- Reduces main component by ~150 lines
- Testable gesture logic in isolation
- Reusable for other grid components
- Performance optimizations remain intact

**Testing:**
- Test touch deadzone behavior
- Test diagonal vs adjacent selection
- Test grid measurement caching
- Test touch move throttling

---

## Phase 3: Extract Cascade Animation Logic (Priority: LOW, Impact: ~80 lines)

### Current Structure:
- Cascade state and refs (lines 180-211)
- 3 useEffect hooks for cascade timing
- getCascadeDelay callback
- Chain cascade integration

### Extraction Strategy:

**3.1 Create `useGridCascade` Custom Hook**
```typescript
interface UseGridCascadeProps {
  tiles: GridTileState[];
  gridSize: number;
  showCascade: boolean;
  onCascadeComplete?: () => void;
  enableComplexAnimations: boolean;
}

export function useGridCascade(props: UseGridCascadeProps) {
  // Cascade timing logic
  return {
    cascadeComplete,
    getCascadeDelay,
    chainCascade,
  };
}
```

**Benefits:**
- Reduces main component by ~80 lines
- Animation logic isolated for optimization
- Easier to adjust timing constants
- Can test cascade behavior independently

**Testing:**
- Test cascade completion callback
- Test diagonal wave pattern timing
- Test chain cascade reactions

---

## Phase 4: Extract Tile Rendering Logic (Priority: MEDIUM, Impact: ~200 lines)

### Current Structure:
- Single motion.div with 15+ props (lines 545-939)
- Complex className computation (50+ lines)
- Animation configuration (30+ lines)
- Badge rendering (90 lines) ← Already extracted in Phase 1

### Extraction Strategy:

**4.1 Create `AdventureTile.tsx` Component**
```typescript
interface AdventureTileProps {
  tile: GridTileState;
  index: number;
  isSelected: boolean;
  isHintHighlighted: boolean;
  canInteract: boolean;
  worldId: number;
  bombRowPreview: number | null;
  showCascade: boolean;
  cascadeComplete: boolean;
  getCascadeDelay: (row: number, col: number) => number;
  prefersReducedMotion: boolean;
  enableComplexAnimations: boolean;
  onClick: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseEnter: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  getTileAriaLabel: (tile: GridTileState) => string;
}

export const AdventureTile = memo((props: AdventureTileProps) => {
  // Single tile rendering with all logic
});
```

**Benefits:**
- Reduces main component by ~200 lines (after Phase 1)
- Tile rendering logic isolated
- memo() optimization at tile level
- Easier to test individual tile states

**Testing:**
- Test tile selection states
- Test special tile type rendering
- Test cascade animations
- Test world theming

---

## Extraction Order & Dependencies

```
Phase 1: TileBadge Component
  ↓ (Independent - can start immediately)

Phase 4: AdventureTile Component (depends on Phase 1)
  ↓ (Tiles use badges)

Phase 2: useGridGestures Hook
  ↓ (Independent from rendering)

Phase 3: useGridCascade Hook
  ↓ (Lowest priority, optional)
```

---

## Implementation Plan

### Step 1: Extract TileBadge Component (TDD)
1. Write tests for each badge type
2. Create TileBadge.tsx component
3. Refactor AdventureGrid to use TileBadge
4. Verify tests pass
5. Commit: `refactor(adventure): extract tile badge components`

### Step 2: Extract AdventureTile Component (TDD)
1. Write tests for tile rendering variants
2. Create AdventureTile.tsx component
3. Refactor AdventureGrid to use AdventureTile
4. Verify tests pass
5. Commit: `refactor(adventure): extract tile rendering component`

### Step 3: Extract useGridGestures Hook (TDD)
1. Write tests for gesture handling
2. Create useGridGestures.ts hook
3. Refactor AdventureGrid to use hook
4. Verify tests pass
5. Commit: `refactor(adventure): extract grid gesture logic hook`

### Step 4: Extract useGridCascade Hook (Optional)
1. Write tests for cascade timing
2. Create useGridCascade.ts hook
3. Refactor AdventureGrid to use hook
4. Verify tests pass
5. Commit: `refactor(adventure): extract cascade animation hook`

---

## Expected Results

### Before Extraction:
- AdventureGrid.tsx: 975 lines
- 1 massive component file
- Difficult to test individual behaviors
- High cognitive load

### After Extraction (Phases 1-3):
- AdventureGrid.tsx: ~455 lines (-520)
- TileBadge.tsx: ~90 lines (new)
- AdventureTile.tsx: ~210 lines (new)
- useGridGestures.ts: ~150 lines (new)
- useGridCascade.ts: ~80 lines (optional, new)

**Total Lines:** Same (~975-1000 lines)
**Key Improvement:** 5 focused, testable files vs 1 monolithic component

---

## Risk Assessment

### Low Risk:
- ✅ Phase 1 (TileBadge) - Pure presentational, no state
- ✅ Phase 2 (useGridGestures) - Well-isolated logic

### Medium Risk:
- ⚠️ Phase 4 (AdventureTile) - Many props, performance-sensitive
  - Mitigation: Extensive testing of memo() behavior
  - Mitigation: Performance profiling before/after

### High Risk:
- ⚠️ Phase 3 (useGridCascade) - Complex timing dependencies
  - Mitigation: Optional - only if time permits
  - Mitigation: Thorough cascade animation testing

---

## Success Criteria

1. ✅ AdventureGrid.tsx < 500 lines
2. ✅ All existing tests pass
3. ✅ No performance degradation (profile with React DevTools)
4. ✅ Each extracted piece has comprehensive tests
5. ✅ Code coverage maintains or improves
6. ✅ Lint passes with no new warnings
7. ✅ Build succeeds
