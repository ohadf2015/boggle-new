# Sprint 3: Adventure Gameplay Implementation Plan

## Overview

Build the core adventure gameplay components, extending the existing game board for special tiles and adventure-specific mechanics.

**Sprint Duration:** 2 weeks (as per design spec)
**Methodology:** TDD (Test-Driven Development)

---

## Architecture Decision

**Approach: Composition over Modification**

Instead of modifying the 944-line `GridComponent`, we'll create:
1. `AdventureGrid` - Wrapper that adds special tile visuals on top of base grid
2. `useAdventureGame` - Hook for adventure-specific game state management
3. New UI components for adventure-specific features

This follows Open/Closed Principle - extending without modifying existing code.

---

## Sprint 3 Tasks

### Task 1: Create useAdventureGame Hook (TDD)

**Purpose:** Manage adventure game state including tiles, objectives, timer, and score.

**Test File:** `hooks/__tests__/useAdventureGame.test.ts`

**Key Tests:**
1. Should initialize game state from level config
2. Should track word submissions and update score
3. Should update objective progress (wordCount, scoreTarget, longWords, etc.)
4. Should handle timer countdown
5. Should calculate stars based on performance
6. Should detect level completion
7. Should handle special tile effects (gold multiplier, ice clearing, bomb effect)

---

### Task 2: Create AdventureTile Component (TDD)

**Purpose:** Render special tiles with unique visual styles (gold glow, ice frost, bomb pulse, rainbow shimmer).

**Test File:** `components/adventure/__tests__/AdventureTile.test.tsx`

**Key Tests:**
1. Should render standard tile with letter
2. Should render gold tile with 3x multiplier indicator
3. Should render ice tile with frozen visual
4. Should render bomb tile with pulsing effect
5. Should render rainbow tile with color cycling
6. Should apply cleared state visually

---

### Task 3: Create AdventureGrid Component (TDD)

**Purpose:** Extend GridComponent with special tile overlay support for adventure mode.

**Test File:** `components/adventure/__tests__/AdventureGrid.test.tsx`

**Key Tests:**
1. Should render grid with correct dimensions
2. Should overlay special tile visuals from tile state
3. Should pass word submissions to parent
4. Should animate tile clearing on word submission
5. Should apply cascade animations

---

### Task 4: Create AdventureObjectives Component (TDD)

**Purpose:** Display objective progress with animated progress bars.

**Test File:** `components/adventure/__tests__/AdventureObjectives.test.tsx`

**Key Tests:**
1. Should display all objectives with icons
2. Should show progress bars for each objective
3. Should mark completed objectives with checkmark
4. Should animate progress updates
5. Should handle primary vs secondary objective styling

---

### Task 5: Create AdventureTimer Component (TDD)

**Purpose:** Display countdown timer with urgency states.

**Test File:** `components/adventure/__tests__/AdventureTimer.test.tsx`

**Key Tests:**
1. Should display formatted time (MM:SS)
2. Should apply normal color when time is adequate
3. Should apply warning color when <30 seconds
4. Should apply danger color when <10 seconds
5. Should animate on time changes

---

### Task 6: Create LevelCompleteModal Component (TDD)

**Purpose:** Show level completion with star animation and stats.

**Test File:** `components/adventure/__tests__/LevelCompleteModal.test.tsx`

**Key Tests:**
1. Should display earned stars with animation
2. Should show final score and words found
3. Should show objective completion status
4. Should display XP earned
5. Should provide "Next Level" and "Replay" buttons
6. Should call onComplete when proceeding

---

### Task 7: Create AdventureGame Page Component (TDD)

**Purpose:** Main adventure gameplay screen integrating all components.

**Test File:** `components/adventure/__tests__/AdventureGame.test.tsx`

**Key Tests:**
1. Should fetch level config on mount
2. Should render grid, timer, and objectives
3. Should handle word submission flow
4. Should update context on level completion
5. Should navigate back on exit
6. Should handle loading and error states

---

### Task 8: Create Adventure Play Route

**Purpose:** Next.js page route for playing adventure levels.

**File:** `app/[locale]/adventure/[world]/[level]/page.tsx`

**Key Tests:**
1. Should parse world and level from URL params
2. Should render AdventureGame component
3. Should handle invalid world/level params

---

## Implementation Order

1. **useAdventureGame** - Core game logic (depends on: types, adventure lib)
2. **AdventureTile** - Visual tile component (depends on: types)
3. **AdventureGrid** - Grid wrapper (depends on: AdventureTile, GridComponent)
4. **AdventureObjectives** - Objective display (depends on: types)
5. **AdventureTimer** - Timer display (standalone)
6. **LevelCompleteModal** - Completion UI (depends on: types)
7. **AdventureGame** - Main component (depends on: all above)
8. **Play Route** - Page route (depends on: AdventureGame)

---

## Component Hierarchy

```
app/[locale]/adventure/[world]/[level]/page.tsx
└── AdventureGame
    ├── AdventureTimer
    ├── AdventureObjectives
    ├── AdventureGrid
    │   └── AdventureTile (per cell)
    └── LevelCompleteModal (conditional)
```

---

## Starting Point: Task 1 - useAdventureGame Hook

Begin with the core game logic hook as it defines the data model for all other components.
