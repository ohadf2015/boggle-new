# Feature: Adventure Mode Sprint 4 - Integration & Navigation

**IMPORTANT:** Before implementing, validate documentation and codebase patterns. Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

Connect the Adventure Mode gameplay system to the app's routing and navigation infrastructure. This sprint integrates all previously built components (WorldMap, LevelGrid, AdventureGame, ProgressionContext) into a cohesive user flow where players can navigate from world selection → level selection → gameplay → completion → back to world map.

## User Story

As a **player**
I want to **click on a level and start playing the adventure game**
So that **I can progress through levels, earn stars, and see my progression saved**

## Problem Statement

Currently, the Adventure Mode has:
- ✅ Complete types and constants (`types/adventure.ts`, `lib/adventure/`)
- ✅ Complete API routes (`/api/adventure/progress`, `/api/adventure/complete`)
- ✅ ProgressionContext for global state management
- ✅ WorldMap for world selection
- ✅ LevelGrid for level selection (but levels are NOT clickable to start game)
- ✅ AdventureGame component for gameplay
- ✅ useAdventureGame hook for game state
- ✅ useAdventureLevel hook for level config

What's MISSING:
- Level click handler to transition from LevelGrid → AdventureGame
- Play view state management in AdventureView (world map vs level grid vs playing)
- Letter grid generation for adventure levels
- Completion callback to save progress via ProgressionContext
- Back navigation from game → level grid → world map
- Entry point from landing page to Adventure Mode

## Solution Statement

Create a complete navigation flow:
1. Add "Adventure" mode card to LandingView (like Multiplayer/Singleplayer)
2. Update LevelGrid to have clickable levels with `onLevelSelect` callback
3. Update AdventureView to manage 3 view states: `worldMap` | `levelGrid` | `playing`
4. Create letter grid generator for adventure levels
5. Connect AdventureGame completion to ProgressionContext.completeLevel
6. Add proper back navigation at each stage

## Feature Metadata

**Feature Type:** Integration (Connecting existing components)
**Estimated Complexity:** Medium
**Primary Systems Affected:** Navigation, State Management, Components
**Dependencies:**
- All Sprint 1-3 components (COMPLETE)
- ProgressionContext (COMPLETE)
- Landing page navigation patterns

---

## CONTEXT REFERENCES

### Prime Context (READ THIS FIRST!)

- `fe-next/CLAUDE.md` - Project coding standards and design system
- `.claude/rules/22-tdd-strict.md` - TDD requirements (RED-GREEN-REFACTOR)
- `.claude/rules/20-testing.md` - Given-When-Then test patterns

### Relevant Codebase Files (MUST READ BEFORE IMPLEMENTING!)

#### Existing Adventure Components
- `components/adventure/AdventureView.tsx` (lines 1-216)
  - **WHY:** Main view component - needs view state management for gameplay
  - **CURRENT STATE:** Manages `selectedWorld` for world/level grid toggle
  - **PATTERN:** Uses `useState` for view state, Framer Motion for transitions

- `components/adventure/LevelGrid.tsx` (lines 1-251)
  - **WHY:** Level buttons are NOT clickable - need `onLevelSelect` prop
  - **CURRENT STATE:** Renders levels but `disabled={!isUnlocked}` only
  - **PATTERN:** `motion.button` with hover/tap effects

- `components/adventure/AdventureGame.tsx` (lines 1-343)
  - **WHY:** Main gameplay component - already complete with props interface
  - **INTERFACE:** `{ levelConfig, initialGrid, onLevelComplete, onExit }`
  - **PATTERN:** Uses useAdventureGame hook, handles game flow

#### Navigation Patterns
- `components/landing/LandingView.tsx` (lines 1-617)
  - **WHY:** Reference for adding Adventure mode card
  - **PATTERN:** Mode cards with Link to `/${language}/adventure`
  - **KEY:** Uses ModeCard component and direct Link elements

- `components/landing/ModeCard.tsx`
  - **WHY:** Reusable card component for mode selection
  - **PATTERN:** variant prop for color theming

#### Hooks
- `hooks/useAdventureGame.ts` (lines 1-540)
  - **WHY:** Provides game state - already used by AdventureGame
  - **INTERFACE:** `{ levelConfig, initialGrid }` → returns game controls

- `hooks/useAdventureLevel.ts` (lines 1-110)
  - **WHY:** Gets level config for starting gameplay
  - **INTERFACE:** `useAdventureLevel(world, level)` → `{ levelConfig, worldConfig }`

#### Context
- `contexts/ProgressionContext.tsx` (lines 1-262)
  - **WHY:** Has `completeLevel()` function to save progress
  - **INTERFACE:** `completeLevel(world, level, stars, score, words)`
  - **PATTERN:** Optimistic update, API call, error handling

#### Utility Patterns
- `lib/adventure/index.ts`
  - **WHY:** Central export for adventure utilities
  - **EXPORTS:** getLevelConfig, getWorldConfig, WORLDS_COUNT, LEVELS_PER_WORLD

### New Files to Create

```
lib/adventure/gridGenerator.ts             # Generate letter grids for levels
lib/adventure/__tests__/gridGenerator.test.ts
components/adventure/__tests__/AdventureView.integration.test.tsx
```

### Patterns to Follow

**View State Pattern (from AdventureView):**
```typescript
// ✅ GOOD: Simple union type for view state
type ViewState = 'worldMap' | 'levelGrid' | 'playing';
const [viewState, setViewState] = useState<ViewState>('worldMap');
const [selectedWorld, setSelectedWorld] = useState<number | null>(null);
const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
```

**Level Click Pattern (to add to LevelGrid):**
```typescript
// ✅ GOOD: Props interface with callback
interface LevelGridProps {
  world: WorldConfig;
  completions: Array<{ world: number; level: number; stars: number }>;
  totalStars: number;
  onLevelSelect: (worldId: number, levelId: number) => void; // NEW
}

// Button click handler
<motion.button
  disabled={!isUnlocked}
  onClick={() => isUnlocked && onLevelSelect(world.id, levelNum)}
  ...
>
```

**Grid Generator Pattern (new):**
```typescript
// ✅ GOOD: Pure function for grid generation
export function generateAdventureGrid(
  size: 4 | 5 | 6 | 7,
  seed?: number
): string[][] {
  // Use seeded random for reproducible grids (optional)
  // Ensure good letter distribution (vowels, common consonants)
  // Return 2D array of uppercase letters
}
```

**Completion Flow Pattern:**
```typescript
// ✅ GOOD: Callback to save progress and navigate
const handleLevelComplete = useCallback(async (stars: number, score: number) => {
  if (selectedWorld && selectedLevel) {
    try {
      await completeLevel(selectedWorld, selectedLevel, stars, score, wordsFound.length);
      // Navigate back to level grid with success state
      setViewState('levelGrid');
      setSelectedLevel(null);
    } catch (error) {
      console.error('Failed to save progress:', error);
      // Still navigate back, progress not saved
      setViewState('levelGrid');
    }
  }
}, [selectedWorld, selectedLevel, completeLevel]);
```

**Landing Page Mode Card Pattern:**
```typescript
// ✅ GOOD: Using existing ModeCard component
<ModeCard
  title={t('landing.adventure') || 'Adventure'}
  description={t('landing.adventureDesc') || 'Progress through 100 levels!'}
  href={`/${language}/adventure`}
  icon={<Map className="w-6 h-6" />}
  variant="yellow"  // or "lime" for adventure theme
/>
```

---

## IMPLEMENTATION PLAN

### Phase 1: Letter Grid Generator

Create utility for generating letter grids for adventure levels.

**Tasks:**
1. Create gridGenerator utility with tests
2. Ensure good letter distribution (vowels, consonants)
3. Optional seeding for reproducible grids

**Order:** Foundation for gameplay - must be complete first.

### Phase 2: LevelGrid Interactivity

Make level buttons clickable to start gameplay.

**Tasks:**
1. Add `onLevelSelect` prop to LevelGrid
2. Wire up button click to callback
3. Add visual feedback for clickable vs locked

**Order:** Depends on Phase 1 completion.

### Phase 3: AdventureView State Management

Add playing view state and game rendering.

**Tasks:**
1. Add view state union type
2. Track selected world AND level
3. Render AdventureGame when in playing state
4. Handle completion callback
5. Handle exit/back navigation

**Order:** Depends on Phase 2 completion.

### Phase 4: Landing Page Integration

Add Adventure mode to main navigation.

**Tasks:**
1. Add Adventure card to LandingView
2. Add translation keys for adventure mode
3. Ensure proper routing

**Order:** Can be done in parallel with Phase 3.

### Phase 5: Testing & Validation

**Tasks:**
1. Integration tests for full flow
2. Manual testing of navigation
3. Verify progress saves correctly

**Order:** After all phases complete.

---

## STEP-BY-STEP TASKS

**IMPORTANT:** Execute every task in order, top to bottom. Each task follows TDD: write test FIRST (RED), then implement (GREEN), then refactor.

---

### Task 1: CREATE lib/adventure/__tests__/gridGenerator.test.ts

- **IMPLEMENT:** Test suite for letter grid generator
- **PATTERN:** Given-When-Then structure
- **TDD:** RED phase - tests MUST fail before implementation

```typescript
/**
 * gridGenerator Tests
 *
 * Tests for adventure level letter grid generation
 */

import {
  generateAdventureGrid,
  VOWELS,
  COMMON_CONSONANTS,
} from '../gridGenerator';

describe('generateAdventureGrid', () => {
  describe('Grid Size', () => {
    it('should generate a 4x4 grid when size is 4', () => {
      // GIVEN
      const size = 4;

      // WHEN
      const grid = generateAdventureGrid(size);

      // THEN
      expect(grid).toHaveLength(4);
      expect(grid[0]).toHaveLength(4);
      expect(grid[3]).toHaveLength(4);
    });

    it('should generate a 5x5 grid when size is 5', () => {
      // GIVEN
      const size = 5;

      // WHEN
      const grid = generateAdventureGrid(size);

      // THEN
      expect(grid).toHaveLength(5);
      expect(grid[0]).toHaveLength(5);
    });

    it('should generate a 6x6 grid when size is 6', () => {
      // GIVEN
      const size = 6;

      // WHEN
      const grid = generateAdventureGrid(size);

      // THEN
      expect(grid).toHaveLength(6);
      expect(grid[0]).toHaveLength(6);
    });

    it('should generate a 7x7 grid when size is 7', () => {
      // GIVEN
      const size = 7;

      // WHEN
      const grid = generateAdventureGrid(size);

      // THEN
      expect(grid).toHaveLength(7);
      expect(grid[0]).toHaveLength(7);
    });
  });

  describe('Letter Content', () => {
    it('should contain only uppercase letters', () => {
      // GIVEN
      const grid = generateAdventureGrid(4);

      // WHEN/THEN
      for (const row of grid) {
        for (const letter of row) {
          expect(letter).toMatch(/^[A-Z]$/);
        }
      }
    });

    it('should include at least 25% vowels for playability', () => {
      // GIVEN
      const grid = generateAdventureGrid(5);
      const totalTiles = 25;

      // WHEN
      let vowelCount = 0;
      for (const row of grid) {
        for (const letter of row) {
          if (VOWELS.includes(letter)) {
            vowelCount++;
          }
        }
      }

      // THEN - at least 25% should be vowels
      expect(vowelCount).toBeGreaterThanOrEqual(totalTiles * 0.25);
    });

    it('should include common consonants for word formation', () => {
      // GIVEN
      const grid = generateAdventureGrid(5);

      // WHEN
      const allLetters = grid.flat();

      // THEN - at least one common consonant should appear
      const hasCommonConsonant = COMMON_CONSONANTS.some((c) =>
        allLetters.includes(c)
      );
      expect(hasCommonConsonant).toBe(true);
    });
  });

  describe('Seeding', () => {
    it('should generate same grid with same seed', () => {
      // GIVEN
      const seed = 12345;

      // WHEN
      const grid1 = generateAdventureGrid(4, seed);
      const grid2 = generateAdventureGrid(4, seed);

      // THEN
      expect(grid1).toEqual(grid2);
    });

    it('should generate different grids with different seeds', () => {
      // GIVEN
      const seed1 = 12345;
      const seed2 = 67890;

      // WHEN
      const grid1 = generateAdventureGrid(4, seed1);
      const grid2 = generateAdventureGrid(4, seed2);

      // THEN
      expect(grid1).not.toEqual(grid2);
    });

    it('should generate different grids without seed (random)', () => {
      // GIVEN - no seed

      // WHEN
      const grid1 = generateAdventureGrid(4);
      const grid2 = generateAdventureGrid(4);

      // THEN - statistically very unlikely to be identical
      // Note: Flaky test potential, but 16! permutations makes this safe
      expect(grid1).not.toEqual(grid2);
    });
  });

  describe('Level-based Generation', () => {
    it('should generate consistent grid for world-level combination', () => {
      // GIVEN
      const world = 3;
      const level = 5;
      const size = 5;

      // WHEN - using world*100 + level as seed for consistency
      const seed = world * 100 + level;
      const grid1 = generateAdventureGrid(size, seed);
      const grid2 = generateAdventureGrid(size, seed);

      // THEN
      expect(grid1).toEqual(grid2);
    });
  });
});
```

- **VALIDATE:** `npm run test -- --testPathPattern="gridGenerator.test"` → Tests fail (RED)

---

### Task 2: CREATE lib/adventure/gridGenerator.ts

- **IMPLEMENT:** Letter grid generator for adventure levels
- **PATTERN:** Pure function with seeded random
- **TDD:** GREEN phase - make all tests pass

```typescript
/**
 * gridGenerator
 *
 * Generates letter grids for adventure mode levels.
 * Ensures good letter distribution for word formation.
 */

// ==============================================
// CONSTANTS
// ==============================================

/** Vowels for word formation */
export const VOWELS = ['A', 'E', 'I', 'O', 'U'];

/** Common consonants that form many words */
export const COMMON_CONSONANTS = ['R', 'S', 'T', 'L', 'N', 'D', 'C', 'M', 'P', 'B'];

/** Less common consonants */
export const RARE_CONSONANTS = ['F', 'G', 'H', 'K', 'V', 'W', 'Y', 'J', 'X', 'Q', 'Z'];

/** Full alphabet for reference */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Letter frequency weights (based on English word usage)
const LETTER_WEIGHTS: Record<string, number> = {
  E: 12, T: 9, A: 8, O: 8, I: 7, N: 7, S: 6, H: 6, R: 6,
  D: 4, L: 4, C: 3, U: 3, M: 3, W: 2, F: 2, G: 2, Y: 2,
  P: 2, B: 1, V: 1, K: 1, J: 1, X: 1, Q: 1, Z: 1,
};

// ==============================================
// SEEDED RANDOM
// ==============================================

/**
 * Simple seeded random number generator (Mulberry32)
 * Returns a function that generates pseudo-random numbers [0, 1)
 */
function createSeededRandom(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ==============================================
// GRID GENERATOR
// ==============================================

/**
 * Generate a letter grid for adventure mode
 *
 * @param size - Grid size (4, 5, 6, or 7)
 * @param seed - Optional seed for reproducible grids
 * @returns 2D array of uppercase letters
 */
export function generateAdventureGrid(
  size: 4 | 5 | 6 | 7,
  seed?: number
): string[][] {
  // Use seeded random if provided, otherwise Math.random
  const random = seed !== undefined
    ? createSeededRandom(seed)
    : Math.random.bind(Math);

  const totalTiles = size * size;

  // Calculate target letter counts for good distribution
  const minVowels = Math.ceil(totalTiles * 0.28); // ~28% vowels
  const targetCommon = Math.ceil(totalTiles * 0.45); // ~45% common consonants

  // Build weighted letter pool
  const letters: string[] = [];

  // Add vowels (ensuring minimum)
  for (let i = 0; i < minVowels; i++) {
    letters.push(weightedRandomLetter(VOWELS, random));
  }

  // Add common consonants
  for (let i = 0; i < targetCommon; i++) {
    letters.push(weightedRandomLetter(COMMON_CONSONANTS, random));
  }

  // Fill remaining with weighted random from full alphabet
  while (letters.length < totalTiles) {
    letters.push(weightedRandomFromAlphabet(random));
  }

  // Shuffle the letters
  shuffle(letters, random);

  // Build 2D grid
  const grid: string[][] = [];
  for (let row = 0; row < size; row++) {
    const gridRow: string[] = [];
    for (let col = 0; col < size; col++) {
      gridRow.push(letters[row * size + col]);
    }
    grid.push(gridRow);
  }

  return grid;
}

/**
 * Pick a random letter from a subset
 */
function weightedRandomLetter(
  subset: string[],
  random: () => number
): string {
  return subset[Math.floor(random() * subset.length)];
}

/**
 * Pick a weighted random letter from full alphabet
 */
function weightedRandomFromAlphabet(random: () => number): string {
  // Build weighted pool
  const pool: string[] = [];
  for (const [letter, weight] of Object.entries(LETTER_WEIGHTS)) {
    for (let i = 0; i < weight; i++) {
      pool.push(letter);
    }
  }
  return pool[Math.floor(random() * pool.length)];
}

/**
 * Fisher-Yates shuffle with seeded random
 */
function shuffle(array: string[], random: () => number): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

/**
 * Generate a grid seed from world and level numbers
 * Provides consistent grids for the same level across plays
 */
export function getLevelSeed(world: number, level: number): number {
  return world * 1000 + level;
}
```

- **VALIDATE:** `npm run test -- --testPathPattern="gridGenerator.test"` → All tests pass

---

### Task 3: UPDATE lib/adventure/index.ts

- **IMPLEMENT:** Export grid generator from index
- **PATTERN:** Central export pattern

```typescript
// Add to existing exports:
export {
  generateAdventureGrid,
  getLevelSeed,
  VOWELS,
  COMMON_CONSONANTS,
} from './gridGenerator';
```

- **VALIDATE:** `npm run build` → No import errors

---

### Task 4: UPDATE components/adventure/LevelGrid.tsx

- **IMPLEMENT:** Add `onLevelSelect` callback prop
- **PATTERN:** Add callback to props interface and button click
- **READ FIRST:** Current LevelGrid.tsx implementation

**Changes needed:**
1. Add `onLevelSelect` to props interface
2. Wire `onClick` on motion.button to call `onLevelSelect(world.id, levelNum)`

```typescript
// Update interface
interface LevelGridProps {
  world: WorldConfig;
  completions: Array<{ world: number; level: number; stars: number }>;
  totalStars: number;
  onLevelSelect: (worldId: number, levelId: number) => void; // ADD THIS
}

// Update component signature
export default function LevelGrid({
  world,
  completions,
  totalStars,
  onLevelSelect, // ADD THIS
}: LevelGridProps): React.JSX.Element {

// Update motion.button (around line 135)
<motion.button
  key={levelNum}
  disabled={!isUnlocked}
  onClick={() => isUnlocked && onLevelSelect(world.id, levelNum)} // ADD THIS
  // ... rest of props
>
```

- **VALIDATE:** `npm run build` → TypeScript compilation succeeds

---

### Task 5: UPDATE components/adventure/AdventureView.tsx

- **IMPLEMENT:** Add playing state and game rendering
- **PATTERN:** State machine with 3 views
- **READ FIRST:** Current AdventureView.tsx implementation

**Key changes:**
1. Add view state type and state
2. Track selectedLevel in addition to selectedWorld
3. Render AdventureGame when in 'playing' state
4. Handle completion callback
5. Handle exit navigation

```typescript
// Type for view state
type ViewState = 'worldMap' | 'levelGrid' | 'playing';

// State additions
const [viewState, setViewState] = useState<ViewState>('worldMap');
const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

// Import AdventureGame
import AdventureGame from './AdventureGame';
import { generateAdventureGrid, getLevelSeed, getLevelConfig } from '@/lib/adventure';

// Level select handler
const handleLevelSelect = useCallback((worldId: number, levelId: number) => {
  setSelectedWorld(worldId);
  setSelectedLevel(levelId);
  setViewState('playing');
}, []);

// Completion handler
const { completeLevel } = useProgression();

const handleLevelComplete = useCallback(async (stars: number, score: number) => {
  if (selectedWorld && selectedLevel) {
    try {
      await completeLevel(selectedWorld, selectedLevel, stars as 0|1|2|3, score, 0);
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
    // Navigate back regardless
    setViewState('levelGrid');
    setSelectedLevel(null);
  }
}, [selectedWorld, selectedLevel, completeLevel]);

// Exit handler
const handleGameExit = useCallback(() => {
  setViewState('levelGrid');
  setSelectedLevel(null);
}, []);

// Get level config and grid for gameplay
const levelConfig = selectedWorld && selectedLevel
  ? getLevelConfig(selectedWorld, selectedLevel)
  : null;

const gameGrid = selectedWorld && selectedLevel
  ? generateAdventureGrid(
      levelConfig?.gridSize ?? 4,
      getLevelSeed(selectedWorld, selectedLevel)
    )
  : null;

// Render playing state in AnimatePresence
{viewState === 'playing' && levelConfig && gameGrid && (
  <motion.div
    key="playing"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="h-full"
  >
    <AdventureGame
      levelConfig={levelConfig}
      initialGrid={gameGrid}
      onLevelComplete={handleLevelComplete}
      onExit={handleGameExit}
    />
  </motion.div>
)}

// Update back button logic
// When in playing state, back goes to levelGrid
// When in levelGrid, back goes to worldMap
// When in worldMap, back goes to home

// Update LevelGrid call to include onLevelSelect
<LevelGrid
  world={selectedWorldConfig}
  completions={completions}
  totalStars={totalStars}
  onLevelSelect={handleLevelSelect}
/>
```

- **VALIDATE:** `npm run build` → TypeScript compilation succeeds
- **VALIDATE:** `npm run test -- --testPathPattern="adventure"` → Tests pass

---

### Task 6: ADD Adventure Mode to Landing Page (Optional Enhancement)

- **IMPLEMENT:** Add Adventure card to LandingView
- **LOCATION:** `components/landing/LandingView.tsx`
- **PATTERN:** Follow ModeCard usage pattern

**Note:** Adventure is already accessible via `/[locale]/adventure`. This task adds visibility on the landing page.

```typescript
// Import Map icon
import { User, Users, Bot, Trophy, LayoutGrid, Crown, GraduationCap, Brain, Lock, Map } from 'lucide-react';

// Add Adventure card after Brain Training card (around line 520-537)
// In desktop grid view:
<div className="col-span-1 sm:col-span-2 flex justify-center w-full gap-4">
  <ModeCard
    title={t('landing.brainTraining') || 'Brain Training'}
    // ... existing brain training card
  />
  <ModeCard
    title={t('landing.adventure') || 'Adventure'}
    description={t('landing.adventureDesc') || '100 levels of word challenges!'}
    href={`/${language}/adventure`}
    icon={<Map className="w-6 h-6" />}
    variant="lime"
    secondary
  />
</div>
```

**Translation keys to add:**
- `landing.adventure`: "Adventure"
- `landing.adventureDesc`: "100 levels of word challenges!"

- **VALIDATE:** `npm run build` → TypeScript compilation succeeds
- **VALIDATE:** Manual - Navigate to landing page and see Adventure card

---

### Task 7: ADD Translation Keys for Adventure Navigation

- **IMPLEMENT:** Add missing translation keys
- **FILES:** `translations/en.json`, `translations/he.json`, `translations/sv.json`, `translations/ja.json`

```json
// English (en.json)
{
  "landing": {
    "adventure": "Adventure",
    "adventureDesc": "100 levels of word challenges!"
  },
  "adventure": {
    "startLevel": "Start Level",
    "levelComplete": "Level Complete!",
    "starsEarned": "Stars Earned",
    "continueToNext": "Continue",
    "retryLevel": "Retry",
    "exitToMap": "Exit to Map"
  }
}

// Hebrew (he.json) - RTL
{
  "landing": {
    "adventure": "הרפתקה",
    "adventureDesc": "100 שלבים של אתגרי מילים!"
  },
  "adventure": {
    "startLevel": "התחל שלב",
    "levelComplete": "השלב הושלם!",
    "starsEarned": "כוכבים שנצברו",
    "continueToNext": "המשך",
    "retryLevel": "נסה שוב",
    "exitToMap": "יציאה למפה"
  }
}

// Swedish (sv.json)
{
  "landing": {
    "adventure": "Äventyr",
    "adventureDesc": "100 nivåer av ordutmaningar!"
  },
  "adventure": {
    "startLevel": "Starta nivå",
    "levelComplete": "Nivå klar!",
    "starsEarned": "Stjärnor intjänade",
    "continueToNext": "Fortsätt",
    "retryLevel": "Försök igen",
    "exitToMap": "Avsluta till karta"
  }
}

// Japanese (ja.json)
{
  "landing": {
    "adventure": "アドベンチャー",
    "adventureDesc": "100レベルの言葉チャレンジ！"
  },
  "adventure": {
    "startLevel": "レベル開始",
    "levelComplete": "レベルクリア！",
    "starsEarned": "獲得した星",
    "continueToNext": "続ける",
    "retryLevel": "リトライ",
    "exitToMap": "マップに戻る"
  }
}
```

- **VALIDATE:** `npm run build` → No missing key warnings

---

### Task 8: CREATE Integration Test for Full Flow

- **IMPLEMENT:** Test the complete navigation flow
- **FILE:** `components/adventure/__tests__/AdventureView.integration.test.tsx`

```typescript
/**
 * AdventureView Integration Tests
 *
 * Tests for the complete adventure mode navigation flow
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdventureView from '../AdventureView';

// Mock contexts
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    dir: 'ltr',
  }),
}));

jest.mock('@/contexts/ProgressionContext', () => ({
  useProgression: () => ({
    progression: {
      userId: 'test-user',
      playerLevel: 5,
      xp: 2500,
      currentWorld: 2,
      currentLevel: 3,
      totalStars: 25,
      completions: [
        { world: 1, level: 1, stars: 3, bestScore: 450, bestWords: 15, completedAt: '2025-01-20T12:00:00Z' },
      ],
    },
    isLoading: false,
    error: null,
    completeLevel: jest.fn().mockResolvedValue(undefined),
    isWorldUnlocked: (worldId: number) => worldId <= 2,
    isLevelUnlocked: (worldId: number, levelId: number) => worldId === 1 || (worldId === 2 && levelId <= 3),
  }),
}));

// Mock framer-motion
jest.mock('framer-motion', () => {
  const React = require('react');
  const MockDiv = React.forwardRef(({ children, ...props }: any, ref: any) =>
    React.createElement('div', { ...props, ref }, children)
  );
  MockDiv.displayName = 'MockDiv';

  return {
    motion: { div: MockDiv, button: MockDiv },
    AnimatePresence: ({ children }: any) => children,
  };
});

describe('AdventureView Integration', () => {
  it('should show world map on initial load', () => {
    // GIVEN / WHEN
    render(<AdventureView />);

    // THEN
    expect(screen.getByText(/adventure.title/i)).toBeInTheDocument();
  });

  it('should navigate to level grid when world is selected', async () => {
    // GIVEN
    render(<AdventureView />);

    // WHEN - click on a world (world 1)
    // Note: Implementation will have clickable world buttons
    // This is a placeholder for the actual world selection mechanism

    // THEN - should show level grid
    // expect(screen.getByText(/Level 1/)).toBeInTheDocument();
  });

  it('should navigate back to world map from level grid', async () => {
    // Test back navigation
  });

  it('should start game when level is clicked', async () => {
    // Test level selection → game start
  });

  it('should return to level grid after game completion', async () => {
    // Test game completion flow
  });
});
```

- **VALIDATE:** `npm run test -- --testPathPattern="AdventureView.integration"` → Tests pass

---

## TESTING STRATEGY

### Unit Tests

**Scope and Requirements:**
- Test gridGenerator for letter distribution
- Test level click handler in LevelGrid
- Test view state transitions in AdventureView

**Pattern (Given-When-Then):**
```typescript
it('should transition to playing state when level is selected', () => {
  // GIVEN
  render(<AdventureView />);
  // Navigate to level grid first...

  // WHEN
  fireEvent.click(screen.getByRole('button', { name: /Level 1/ }));

  // THEN
  expect(screen.getByTestId('adventure-game')).toBeInTheDocument();
});
```

### Integration Tests

**Scope:**
- Full navigation flow: World Map → Level Grid → Game → Completion → Level Grid
- Progress saving via ProgressionContext
- Back navigation at each stage

### Edge Cases

- Starting game for locked level (should not work)
- Network error during progress save (should still navigate back)
- Timer expires during gameplay
- User exits mid-game

---

## VALIDATION COMMANDS

### Level 1: TypeScript Compilation

```bash
cd fe-next && npm run build
```

**Expected:** Build succeeds with no TypeScript errors

### Level 2: Grid Generator Tests

```bash
cd fe-next && npm run test -- --testPathPattern="gridGenerator"
```

**Expected:** All grid generator tests pass

### Level 3: Adventure Component Tests

```bash
cd fe-next && npm run test -- --testPathPattern="adventure"
```

**Expected:** All adventure-related tests pass

### Level 4: Lint Check

```bash
cd fe-next && npm run lint
```

**Expected:** No linting errors

### Level 5: Manual Testing

```bash
# Start dev server
cd fe-next && npm run dev

# Test flow:
# 1. Navigate to /adventure
# 2. Click on World 1
# 3. Click on Level 1
# 4. Play game (find words)
# 5. Complete or let timer expire
# 6. Verify back to level grid
# 7. Verify stars updated
```

---

## ACCEPTANCE CRITERIA

- [ ] `lib/adventure/gridGenerator.ts` generates valid letter grids
- [ ] LevelGrid has clickable level buttons with `onLevelSelect` callback
- [ ] AdventureView manages 3 view states: worldMap | levelGrid | playing
- [ ] Clicking a level starts AdventureGame with correct config and grid
- [ ] Game completion calls ProgressionContext.completeLevel
- [ ] Back navigation works at each stage
- [ ] Loading and error states handled
- [ ] Translation keys added for all 4 languages
- [ ] Unit tests for grid generator pass
- [ ] Integration flow works end-to-end
- [ ] All validation commands pass

---

## COMPLETION CHECKLIST

- [ ] Task 1: gridGenerator.test.ts created (RED phase)
- [ ] Task 2: gridGenerator.ts implemented (GREEN phase)
- [ ] Task 3: Export added to lib/adventure/index.ts
- [ ] Task 4: LevelGrid updated with onLevelSelect
- [ ] Task 5: AdventureView updated with playing state
- [ ] Task 6: (Optional) Adventure card added to landing page
- [ ] Task 7: Translation keys added
- [ ] Task 8: Integration tests created
- [ ] All tests passing
- [ ] Lint check passes
- [ ] Build succeeds
- [ ] Manual testing confirms flow works

---

## NOTES

### Design Rationale

**Why view state instead of routing?**
- Simpler state management (no URL params needed)
- Faster transitions (no full page reload)
- Matches existing pattern in AdventureView
- Game state preserved during navigation

**Why seeded grid generation?**
- Same level always has same grid (fair for all players)
- Enables "replay" feature in future
- Predictable testing

**Why handle completion errors gracefully?**
- User experience: Don't block navigation on API failure
- Progress can be re-synced on next load
- Better than showing error modal during success flow

### Future Considerations

**Potential Improvements:**
- Add "next level" button on completion (auto-advance)
- Add level preview before starting
- Add difficulty indicator on level cards
- Sound effects for level start/complete

**Known Limitations:**
- Grid generation doesn't guarantee word existence (future: validate grid)
- No "continue" feature if browser closed mid-game
- Stars animation not implemented on completion

### Extension Points

- `generateAdventureGrid` can be extended with difficulty modifiers
- `AdventureView` can add more view states (e.g., 'tutorial', 'boss')
- `LevelGrid` can add "preview" mode before starting
