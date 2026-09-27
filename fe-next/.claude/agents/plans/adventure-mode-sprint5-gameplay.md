# Adventure Mode Sprint 5: Core Gameplay & Word Validation

**Status**: Planning
**Priority**: Critical
**Estimated Complexity**: High
**Dependencies**: Sprint 4 (Navigation & Integration) - COMPLETE

---

## Executive Summary

Sprint 5 focuses on making Adventure Mode **actually playable** by implementing the core word validation system and path selection mechanics. Currently, the game accepts any word without validation - this sprint fixes that critical gap.

---

## Current State Analysis

### What's Working (Sprint 4 Complete)
- ✅ World Map with visual progression
- ✅ Level Grid showing all 10 levels per world
- ✅ View state management (worldMap → levelGrid → playing)
- ✅ AdventureGame component with timer, objectives, pause
- ✅ Grid generation with special tiles
- ✅ Progress saving via ProgressionContext
- ✅ API endpoints for progress/complete
- ✅ Translations for all adventure UI

### Critical Gaps Identified
1. **NO WORD VALIDATION** - `submitWord()` accepts ANY string without checking dictionary
2. **NO PATH VALIDATION** - No check that selected tiles are adjacent
3. **CLICK-ONLY SELECTION** - No drag/swipe gesture for word formation
4. **NO LANDING PAGE ENTRY** - Adventure Mode not accessible from main menu
5. **NO FEEDBACK SOUNDS** - Silent gameplay (no valid/invalid word sounds)

---

## Sprint 5 Tasks

### Phase 1: Word Validation Integration (CRITICAL)

#### Task 1.1: Create useAdventureWordValidation Hook
**File**: `hooks/useAdventureWordValidation.ts`
**Purpose**: Validate words against dictionary before scoring

```typescript
// Key functionality:
// 1. Check word exists in dictionary (reuse backend/dictionary.ts)
// 2. Check path is valid (adjacent tiles)
// 3. Check word not already found
// 4. Return { isValid, errorKey, score }
```

**Requirements**:
- Use existing `clientWordValidator.ts` for path validation (`isWordOnBoard`)
- Call backend `/api/validate-word` for dictionary check (or use client-side dictionary subset)
- Support language parameter (English default for adventure)
- Minimum word length: 3 letters

#### Task 1.2: Update AdventureGame to Use Validation
**File**: `components/adventure/AdventureGame.tsx`
**Changes**:
- Import and use `useAdventureWordValidation`
- Only call `submitWord()` when validation passes
- Show error toast when word is invalid
- Show different feedback for "not a word" vs "not on board" vs "already found"

#### Task 1.3: Update useAdventureGame for Validation
**File**: `hooks/useAdventureGame.ts`
**Changes**:
- Add `validateAndSubmitWord()` function that validates before submitting
- Return validation result for UI feedback
- Track invalid attempts for potential penalty system

---

### Phase 2: Path Selection System

#### Task 2.1: Create useAdventureSelection Hook
**File**: `hooks/useAdventureSelection.ts`
**Purpose**: Handle tile selection with adjacency validation

```typescript
interface UseAdventureSelectionReturn {
  selectedPath: Array<{ row: number; col: number }>;
  currentWord: string;
  isValidPath: boolean;
  selectTile: (row: number, col: number) => void;
  clearSelection: () => void;
  canSelectTile: (row: number, col: number) => boolean;
}
```

**Key Logic**:
- New tile must be adjacent to last selected tile
- Can't select same tile twice
- Clear path option (tap outside or shake gesture)
- Highlight valid next-tile options

#### Task 2.2: Update AdventureGrid for Drag Selection
**File**: `components/adventure/AdventureGrid.tsx`
**Changes**:
- Add touch event handlers (onTouchStart, onTouchMove, onTouchEnd)
- Add mouse drag handlers (onMouseDown, onMouseMove, onMouseUp)
- Show selection path line connecting tiles
- Highlight currently formed word
- Visual feedback for valid/invalid next tiles

#### Task 2.3: Add Selection Line Animation
**File**: `components/adventure/SelectionPath.tsx` (NEW)
**Purpose**: SVG overlay showing path between selected tiles

```typescript
interface SelectionPathProps {
  path: Array<{ row: number; col: number }>;
  gridSize: number;
  tileSize: number;
}
```

---

### Phase 3: Landing Page Integration

#### Task 3.1: Add Adventure Mode Card to Landing
**File**: `components/landing/LandingView.tsx`
**Changes**:
- Add new ModeCard for Adventure Mode
- Show progress (current world/level, total stars)
- Link to `/adventure` route
- Use adventure-specific styling (map icon, world preview)

#### Task 3.2: Create Adventure Progress Badge
**File**: `components/landing/AdventureProgressBadge.tsx` (NEW)
**Purpose**: Show adventure progress on landing card

```typescript
interface AdventureProgressBadgeProps {
  totalStars: number;
  currentWorld: number;
  currentLevel: number;
}
```

---

### Phase 4: Audio Feedback

#### Task 4.1: Create Sound Effects Hook
**File**: `hooks/useGameSounds.ts`
**Purpose**: Play sound effects for game actions

**Sounds Needed**:
- `word-valid.mp3` - Valid word found
- `word-invalid.mp3` - Invalid word attempt
- `word-bonus.mp3` - Special tile word (gold, bomb)
- `tile-select.mp3` - Tile selection tap
- `level-complete.mp3` - Level completed
- `star-earned.mp3` - Star animation

#### Task 4.2: Integrate Sounds into AdventureGame
**File**: `components/adventure/AdventureGame.tsx`
**Changes**:
- Play sounds on word validation result
- Play sounds on special tile effects
- Play sounds on level complete
- Respect user sound preferences (mute option)

---

### Phase 5: Polish & Testing

#### Task 5.1: Write Tests for Word Validation
**File**: `hooks/__tests__/useAdventureWordValidation.test.ts`
**Coverage**:
- Valid word on board → accepted
- Valid word NOT on board → rejected with error
- Invalid word (not in dictionary) → rejected
- Already found word → rejected
- Too short word → rejected

#### Task 5.2: Write Tests for Selection System
**File**: `hooks/__tests__/useAdventureSelection.test.ts`
**Coverage**:
- Adjacent tile selection allowed
- Non-adjacent tile selection blocked
- Same tile selection blocked
- Path clears correctly

#### Task 5.3: Write Tests for Landing Integration
**File**: `components/landing/__tests__/LandingView.adventure.test.tsx`
**Coverage**:
- Adventure card renders
- Progress shows correctly
- Link navigates to /adventure

#### Task 5.4: E2E Test for Complete Flow
**File**: `e2e/adventure-gameplay.spec.ts`
**Coverage**:
- Navigate from landing to adventure
- Select world and level
- Play game with word submission
- Complete level and see progress

---

## Technical Decisions

### Dictionary Strategy
**Decision**: Use hybrid approach
1. **Client-side pre-check**: Use common word list (10K words) for instant feedback
2. **Server validation**: Full dictionary check on submit for authoritative result

### Path Rendering
**Decision**: Use SVG overlay
- More performant than canvas for simple lines
- Easier to animate with CSS/Framer Motion
- Natural fit with React component model

### Sound Loading
**Decision**: Preload on game mount
- Use Web Audio API for low-latency playback
- Fallback to HTML5 Audio for unsupported browsers
- Lazy-load sound files only when entering game

---

## File Changes Summary

### New Files
- `hooks/useAdventureWordValidation.ts`
- `hooks/useAdventureSelection.ts`
- `hooks/useGameSounds.ts`
- `components/adventure/SelectionPath.tsx`
- `components/landing/AdventureProgressBadge.tsx`
- `public/sounds/adventure/*.mp3` (6 files)
- `hooks/__tests__/useAdventureWordValidation.test.ts`
- `hooks/__tests__/useAdventureSelection.test.ts`
- `e2e/adventure-gameplay.spec.ts`

### Modified Files
- `components/adventure/AdventureGame.tsx` - Integrate validation & sounds
- `components/adventure/AdventureGrid.tsx` - Add drag selection
- `hooks/useAdventureGame.ts` - Add validation integration
- `components/landing/LandingView.tsx` - Add adventure card

---

## Acceptance Criteria

### Must Have (Sprint 5 Complete When)
1. ✅ Words are validated against dictionary before scoring
2. ✅ Only adjacent tile paths are allowed
3. ✅ Adventure Mode accessible from landing page
4. ✅ All tests pass with >80% coverage
5. ✅ Build succeeds without errors

### Should Have
1. Drag/swipe selection working on touch devices
2. Selection path line animation
3. Valid/invalid sound feedback

### Nice to Have
1. Haptic feedback on mobile
2. Word definition tooltip after valid word
3. Animated tile effects for special tiles

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Dictionary size affects bundle | Medium | Use CDN for dictionary, lazy load |
| Touch events complex | High | Use battle-tested library (use-gesture) |
| Sound loading affects performance | Low | Preload during world map, not during game |

---

## Definition of Done

- [ ] All Phase 1-5 tasks completed
- [ ] All tests written and passing
- [ ] Code reviewed and merged
- [ ] Build passes
- [ ] Manual QA on desktop and mobile
- [ ] Translations updated for new UI text
- [ ] Documentation updated

---

## Next Sprint Preview (Sprint 6)

After Sprint 5, Adventure Mode will be **playable**. Sprint 6 will focus on:
- Tutorial/onboarding for new players
- Achievement system integration
- Leaderboards per world
- Offline progress sync
