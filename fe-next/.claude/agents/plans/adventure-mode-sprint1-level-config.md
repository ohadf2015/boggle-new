# Feature: Adventure Mode Sprint 1 - Level Config and Constants

**IMPORTANT:** Before implementing, validate documentation and codebase patterns. Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

Create the foundational level configuration and constants for Adventure Mode. This includes all game constants (XP progression, world unlock requirements, special tiles, objectives) and level configurations for all 10 worlds (100 levels total). This foundation enables the gameplay mechanics, world map, and progression systems.

## User Story

As a **single-player game system**
I want to **have well-defined level configurations and game constants**
So that **each level presents unique, balanced challenges with consistent progression mechanics**

## Problem Statement

Adventure Mode requires a structured configuration system that:
- Defines game constants (XP progression, star requirements, unlock gates)
- Provides level configurations for all 100 levels across 10 worlds
- Ensures balanced difficulty progression with world-specific mechanics
- Enables the API routes to fetch and validate level data

## Solution Statement

Create two core library files:
1. `lib/adventure/constants.ts` - All game constants, XP calculations, unlock logic
2. `lib/adventure/levelConfig.ts` - Level configurations, world definitions, objective generation

## Feature Metadata

**Feature Type:** New Capability (Foundation)
**Estimated Complexity:** Medium
**Primary Systems Affected:** Single Player, API Routes, Types
**Dependencies:** Existing `types/adventure.ts` (already created)

---

## CONTEXT REFERENCES

### Prime Context (READ THIS FIRST!)

- `fe-next/CLAUDE.md` - Project coding standards and design system
- `.claude/rules/22-tdd-strict.md` - TDD requirements (RED-GREEN-REFACTOR)
- `.claude/rules/20-testing.md` - Given-When-Then test patterns

### Relevant Codebase Files (MUST READ BEFORE IMPLEMENTING!)

#### Existing Adventure Types
- `types/adventure.ts` (lines 1-214)
  - **WHY:** Contains all TypeScript interfaces we must implement against
  - **PATTERN:** TileType, LevelConfig, LevelObjective, SpecialTile, etc.
  - **KEY TYPES:**
    ```typescript
    type TileType = 'standard' | 'gold' | 'ice' | 'bomb' | 'rainbow';
    type ObjectiveType = 'wordCount' | 'scoreTarget' | 'clearIce' | 'longWords' | 'timeBonus' | 'collectGems';
    interface LevelConfig {
      world: number;
      level: number;
      gridSize: 4 | 5 | 6 | 7;
      timerSeconds: number;
      objectives: LevelObjective[];
      specialTiles: SpecialTile[];
      difficulty: 'EASY' | 'MEDIUM' | 'HARD';
      hiddenWord?: string;
      worldMechanic?: string;
    }
    ```

#### Existing API Routes (Reference XP calculation patterns)
- `app/api/adventure/complete/route.ts` (lines 15-111)
  - **WHY:** Contains XP calculation logic that constants must align with
  - **PATTERN:**
    ```typescript
    const XP_PER_STAR = 25;
    const BASE_COMPLETION_XP = 50;
    function calculatePlayerLevel(totalXp: number): number {
      // Level N requires N^1.5 * 100 XP
    }
    ```

#### Database Schema (Reference constraints)
- `supabase/migrations/049_adventure_mode.sql` (lines 130-166)
  - **WHY:** Contains DB functions for XP calculations
  - **PATTERN:** Must align constants with `calculate_player_level()` and `xp_for_level()` functions

#### Design Specifications
- `.claude/agents/plans/adventure-mode-design-spec.md`
  - **WHY:** Contains world definitions, mechanics, and progression design
  - **KEY INFO:**
    - 10 worlds, 10 levels each (100 total)
    - World mechanics: synonymPairs, etymologyRoots, idioms, compounds, anagrams, palindromes, rareWords, multilingual
    - Boss battles every 10th level
    - Star requirements: 2 stars to unlock next level, 15 stars to unlock next world

### New Files to Create

```
lib/adventure/constants.ts          # Game constants and utility functions
lib/adventure/levelConfig.ts        # World and level configuration data
lib/adventure/__tests__/            # Test directory
lib/adventure/__tests__/constants.test.ts
lib/adventure/__tests__/levelConfig.test.ts
```

### Patterns to Follow

**Constants Pattern (from existing codebase):**
```typescript
// ✅ GOOD: Constants with JSDoc documentation
/**
 * Total number of worlds in Adventure Mode
 */
export const WORLDS_COUNT = 10;

/**
 * Number of levels per world
 */
export const LEVELS_PER_WORLD = 10;

// ✅ GOOD: Type-safe const objects
export const TILE_TYPES = {
  STANDARD: 'standard',
  GOLD: 'gold',
  ICE: 'ice',
  BOMB: 'bomb',
  RAINBOW: 'rainbow',
} as const;

// ✅ GOOD: Pure functions with JSDoc
/**
 * Calculate XP required to reach a specific level
 * Uses curved progression: Level N requires N^1.5 * 100 XP
 * @param level - Target level (1-50)
 * @returns XP required
 */
export function getXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(Math.pow(level, 1.5) * 100);
}
```

**Test Pattern (Given-When-Then):**
```typescript
describe('getXpForLevel', () => {
  it('should return 0 for level 1', () => {
    // GIVEN
    const level = 1;

    // WHEN
    const result = getXpForLevel(level);

    // THEN
    expect(result).toBe(0);
  });

  it('should use curved progression formula', () => {
    // GIVEN
    const level = 10;

    // WHEN
    const result = getXpForLevel(level);

    // THEN - Level 10 requires 10^1.5 * 100 = ~3162 XP
    expect(result).toBe(Math.floor(Math.pow(10, 1.5) * 100));
  });
});
```

---

## IMPLEMENTATION PLAN

### Phase 1: Constants Foundation

Create `lib/adventure/constants.ts` with all game constants and utility functions.

**Tasks:**
1. Create constants file with core game values
2. Implement XP calculation functions (aligned with DB functions)
3. Implement unlock checking functions
4. Add comprehensive tests

### Phase 2: Level Configuration

Create `lib/adventure/levelConfig.ts` with world definitions and level generators.

**Tasks:**
1. Create world configuration data for all 10 worlds
2. Implement level configuration generator
3. Implement objective and special tile generators
4. Add comprehensive tests

---

## STEP-BY-STEP TASKS

**IMPORTANT:** Execute every task in order, top to bottom. Each task follows TDD: write test FIRST (RED), then implement (GREEN), then refactor.

---

### Task 1: CREATE lib/adventure/__tests__/constants.test.ts

- **IMPLEMENT:** Test suite for all constants and utility functions
- **PATTERN:** Given-When-Then structure from `.claude/rules/20-testing.md`
- **TDD:** RED phase - tests MUST fail before implementation

```typescript
/**
 * Adventure Mode Constants Tests
 *
 * Tests for game constants and utility functions
 * Following TDD: Write tests FIRST, then implement
 */

import {
  // Core constants
  WORLDS_COUNT,
  LEVELS_PER_WORLD,
  MAX_PLAYER_LEVEL,
  TOTAL_LEVELS,
  // XP constants
  BASE_COMPLETION_XP,
  XP_PER_STAR,
  // Progression constants
  STARS_TO_UNLOCK_NEXT_LEVEL,
  STARS_TO_UNLOCK_NEXT_WORLD,
  TOTAL_STARS_FOR_FINAL_WORLD,
  // Tile and objective constants
  TILE_TYPES,
  OBJECTIVE_TYPES,
  // Grid and timer configuration
  GRID_SIZES,
  TIMER_DURATIONS,
  // Utility functions
  getXpForLevel,
  getLevelFromXp,
  getXpProgressInLevel,
  getWorldUnlockRequirement,
  isWorldUnlocked,
  isLevelUnlocked,
} from '../constants';

describe('Adventure Constants', () => {
  describe('Core Constants', () => {
    it('should have 10 worlds', () => {
      expect(WORLDS_COUNT).toBe(10);
    });

    it('should have 10 levels per world', () => {
      expect(LEVELS_PER_WORLD).toBe(10);
    });

    it('should have 100 total levels', () => {
      expect(TOTAL_LEVELS).toBe(100);
    });

    it('should have max player level of 50', () => {
      expect(MAX_PLAYER_LEVEL).toBe(50);
    });
  });

  describe('XP Constants', () => {
    it('should award 50 base XP per completion', () => {
      expect(BASE_COMPLETION_XP).toBe(50);
    });

    it('should award 25 XP per star', () => {
      expect(XP_PER_STAR).toBe(25);
    });
  });

  describe('Tile Types', () => {
    it('should have all 5 tile types', () => {
      expect(TILE_TYPES.STANDARD).toBe('standard');
      expect(TILE_TYPES.GOLD).toBe('gold');
      expect(TILE_TYPES.ICE).toBe('ice');
      expect(TILE_TYPES.BOMB).toBe('bomb');
      expect(TILE_TYPES.RAINBOW).toBe('rainbow');
    });
  });

  describe('Objective Types', () => {
    it('should have all 6 objective types', () => {
      expect(OBJECTIVE_TYPES.WORD_COUNT).toBe('wordCount');
      expect(OBJECTIVE_TYPES.SCORE_TARGET).toBe('scoreTarget');
      expect(OBJECTIVE_TYPES.CLEAR_ICE).toBe('clearIce');
      expect(OBJECTIVE_TYPES.LONG_WORDS).toBe('longWords');
      expect(OBJECTIVE_TYPES.TIME_BONUS).toBe('timeBonus');
      expect(OBJECTIVE_TYPES.COLLECT_GEMS).toBe('collectGems');
    });
  });

  describe('Grid Sizes', () => {
    it('should have grid size for each world', () => {
      // Worlds 1-2: 4x4 (tutorial)
      expect(GRID_SIZES[1]).toBe(4);
      expect(GRID_SIZES[2]).toBe(4);

      // Worlds 3-5: 5x5 (standard)
      expect(GRID_SIZES[3]).toBe(5);
      expect(GRID_SIZES[4]).toBe(5);
      expect(GRID_SIZES[5]).toBe(5);

      // Worlds 6-8: 6x6 (challenging)
      expect(GRID_SIZES[6]).toBe(6);
      expect(GRID_SIZES[7]).toBe(6);
      expect(GRID_SIZES[8]).toBe(6);

      // Worlds 9-10: 7x7 (expert)
      expect(GRID_SIZES[9]).toBe(7);
      expect(GRID_SIZES[10]).toBe(7);
    });
  });

  describe('Timer Durations', () => {
    it('should decrease timer with higher worlds', () => {
      // World 1 has longest timer
      expect(TIMER_DURATIONS[1]).toBeGreaterThanOrEqual(90);

      // World 10 has shortest timer
      expect(TIMER_DURATIONS[10]).toBeLessThanOrEqual(45);

      // Timer decreases as worlds increase
      expect(TIMER_DURATIONS[5]).toBeLessThan(TIMER_DURATIONS[1]);
      expect(TIMER_DURATIONS[10]).toBeLessThan(TIMER_DURATIONS[5]);
    });
  });
});

describe('XP Calculation Functions', () => {
  describe('getXpForLevel', () => {
    it('should return 0 for level 1', () => {
      // GIVEN
      const level = 1;

      // WHEN
      const result = getXpForLevel(level);

      // THEN
      expect(result).toBe(0);
    });

    it('should return 0 for level 0 or negative', () => {
      expect(getXpForLevel(0)).toBe(0);
      expect(getXpForLevel(-1)).toBe(0);
    });

    it('should use curved progression formula (N^1.5 * 100)', () => {
      // GIVEN - Level 10

      // WHEN
      const result = getXpForLevel(10);

      // THEN - Level 10 requires 10^1.5 * 100 ≈ 3162 XP
      const expected = Math.floor(Math.pow(10, 1.5) * 100);
      expect(result).toBe(expected);
    });

    it('should cap at level 50', () => {
      // Levels above 50 should return same as level 50
      const level50Xp = getXpForLevel(50);
      const level51Xp = getXpForLevel(51);
      const level100Xp = getXpForLevel(100);

      expect(level51Xp).toBe(level50Xp);
      expect(level100Xp).toBe(level50Xp);
    });
  });

  describe('getLevelFromXp', () => {
    it('should return level 1 for 0 XP', () => {
      expect(getLevelFromXp(0)).toBe(1);
    });

    it('should return level 1 for negative XP', () => {
      expect(getLevelFromXp(-100)).toBe(1);
    });

    it('should calculate correct level from XP', () => {
      // Just under level 2 threshold
      const level2Threshold = getXpForLevel(2);
      expect(getLevelFromXp(level2Threshold - 1)).toBe(1);
      expect(getLevelFromXp(level2Threshold)).toBe(2);
    });

    it('should cap at level 50', () => {
      // Even with massive XP, cap at 50
      expect(getLevelFromXp(999999999)).toBe(50);
    });

    it('should be inverse of getXpForLevel', () => {
      // getLevelFromXp(getXpForLevel(N)) should return N
      for (let level = 1; level <= 50; level++) {
        const xp = getXpForLevel(level);
        expect(getLevelFromXp(xp)).toBe(level);
      }
    });
  });

  describe('getXpProgressInLevel', () => {
    it('should return progress percentage within current level', () => {
      // GIVEN - Exactly at level 5
      const xpAtLevel5 = getXpForLevel(5);
      const xpAtLevel6 = getXpForLevel(6);
      const midwayXp = xpAtLevel5 + (xpAtLevel6 - xpAtLevel5) / 2;

      // WHEN
      const progress = getXpProgressInLevel(midwayXp);

      // THEN - Should be approximately 50%
      expect(progress).toBeGreaterThanOrEqual(0.49);
      expect(progress).toBeLessThanOrEqual(0.51);
    });

    it('should return 0 at level boundary', () => {
      const xpAtLevel3 = getXpForLevel(3);
      const progress = getXpProgressInLevel(xpAtLevel3);
      expect(progress).toBeCloseTo(0, 1);
    });

    it('should return value between 0 and 1', () => {
      // Test various XP values
      const testXps = [0, 100, 500, 1000, 5000, 10000];
      for (const xp of testXps) {
        const progress = getXpProgressInLevel(xp);
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThanOrEqual(1);
      }
    });
  });
});

describe('World Unlock Functions', () => {
  describe('getWorldUnlockRequirement', () => {
    it('should return 0 for world 1 (always unlocked)', () => {
      expect(getWorldUnlockRequirement(1)).toBe(0);
    });

    it('should require 15 stars per world', () => {
      // World 2 requires 15 stars
      expect(getWorldUnlockRequirement(2)).toBe(15);
      // World 3 requires 30 stars
      expect(getWorldUnlockRequirement(3)).toBe(30);
      // World 4 requires 45 stars
      expect(getWorldUnlockRequirement(4)).toBe(45);
    });

    it('should require 80 stars for world 10', () => {
      // Final world has special requirement
      expect(getWorldUnlockRequirement(10)).toBe(80);
    });

    it('should handle invalid world numbers', () => {
      expect(getWorldUnlockRequirement(0)).toBe(0);
      expect(getWorldUnlockRequirement(-1)).toBe(0);
      expect(getWorldUnlockRequirement(11)).toBe(80);
    });
  });

  describe('isWorldUnlocked', () => {
    it('should always unlock world 1', () => {
      expect(isWorldUnlocked(1, 0)).toBe(true);
    });

    it('should unlock world 2 with 15+ stars', () => {
      expect(isWorldUnlocked(2, 14)).toBe(false);
      expect(isWorldUnlocked(2, 15)).toBe(true);
      expect(isWorldUnlocked(2, 30)).toBe(true);
    });

    it('should unlock world 10 with 80+ stars', () => {
      expect(isWorldUnlocked(10, 79)).toBe(false);
      expect(isWorldUnlocked(10, 80)).toBe(true);
    });
  });

  describe('isLevelUnlocked', () => {
    it('should always unlock level 1 of any world', () => {
      const completions: Array<{ world: number; level: number; stars: number }> = [];
      expect(isLevelUnlocked(1, 1, completions)).toBe(true);
      expect(isLevelUnlocked(5, 1, completions)).toBe(true);
      expect(isLevelUnlocked(10, 1, completions)).toBe(true);
    });

    it('should require previous level completion with at least 1 star', () => {
      // No completions - level 2 locked
      expect(isLevelUnlocked(1, 2, [])).toBe(false);

      // Level 1 completed with 1 star - level 2 unlocked
      const completions = [{ world: 1, level: 1, stars: 1 }];
      expect(isLevelUnlocked(1, 2, completions)).toBe(true);
    });

    it('should require completing previous level in same world', () => {
      // Completed level 5 in world 1 - level 6 in world 1 unlocked
      const completions = [{ world: 1, level: 5, stars: 2 }];
      expect(isLevelUnlocked(1, 6, completions)).toBe(true);

      // But level 2 in world 2 is NOT unlocked (different world)
      expect(isLevelUnlocked(2, 2, completions)).toBe(false);
    });

    it('should check stars >= 1', () => {
      // 0 stars doesn't count as completion
      const zeroStars = [{ world: 1, level: 1, stars: 0 }];
      expect(isLevelUnlocked(1, 2, zeroStars)).toBe(false);

      // 1+ stars unlocks next level
      const oneStars = [{ world: 1, level: 1, stars: 1 }];
      expect(isLevelUnlocked(1, 2, oneStars)).toBe(true);
    });
  });
});
```

- **VALIDATE:** `npm run test -- --testPathPattern="constants.test"`

---

### Task 2: CREATE lib/adventure/constants.ts

- **IMPLEMENT:** All game constants and utility functions
- **PATTERN:** Align with DB functions in `049_adventure_mode.sql`
- **TDD:** GREEN phase - make all tests pass
- **IMPORTS:** Match types from `@/types/adventure`

```typescript
/**
 * Adventure Mode Constants
 *
 * Core game constants and utility functions for Adventure Mode progression system.
 * These values are aligned with database functions in 049_adventure_mode.sql.
 */

// ==============================================
// CORE GAME CONSTANTS
// ==============================================

/**
 * Total number of worlds in Adventure Mode
 */
export const WORLDS_COUNT = 10;

/**
 * Number of levels per world
 */
export const LEVELS_PER_WORLD = 10;

/**
 * Total number of levels (WORLDS_COUNT * LEVELS_PER_WORLD)
 */
export const TOTAL_LEVELS = WORLDS_COUNT * LEVELS_PER_WORLD;

/**
 * Maximum player level achievable
 */
export const MAX_PLAYER_LEVEL = 50;

// ==============================================
// XP PROGRESSION CONSTANTS
// ==============================================

/**
 * Base XP awarded for completing a level (first time)
 */
export const BASE_COMPLETION_XP = 50;

/**
 * XP awarded per star earned (only for new stars)
 */
export const XP_PER_STAR = 25;

/**
 * Maximum XP for any single level completion
 * (BASE_COMPLETION_XP + 3 stars * XP_PER_STAR = 125)
 */
export const MAX_LEVEL_XP = BASE_COMPLETION_XP + 3 * XP_PER_STAR;

// ==============================================
// STAR & UNLOCK PROGRESSION
// ==============================================

/**
 * Minimum stars needed to unlock next level (must earn at least 1 star)
 */
export const STARS_TO_UNLOCK_NEXT_LEVEL = 1;

/**
 * Stars needed from previous world to unlock next world
 * (15 stars = 50% of world's 30 possible stars)
 */
export const STARS_TO_UNLOCK_NEXT_WORLD = 15;

/**
 * Total stars required to unlock the final world (World 10)
 * Special requirement: needs 80 total stars regardless of distribution
 */
export const TOTAL_STARS_FOR_FINAL_WORLD = 80;

/**
 * Maximum stars per level
 */
export const MAX_STARS_PER_LEVEL = 3;

/**
 * Maximum stars per world (LEVELS_PER_WORLD * MAX_STARS_PER_LEVEL)
 */
export const MAX_STARS_PER_WORLD = LEVELS_PER_WORLD * MAX_STARS_PER_LEVEL;

// ==============================================
// TILE TYPE CONSTANTS
// ==============================================

/**
 * All special tile types available in Adventure Mode
 */
export const TILE_TYPES = {
  /** Normal letter tile */
  STANDARD: 'standard',
  /** 3x score multiplier */
  GOLD: 'gold',
  /** Obstacle - must be cleared by using adjacent tiles */
  ICE: 'ice',
  /** Clears entire row when used in a word */
  BOMB: 'bomb',
  /** Wildcard - matches any letter */
  RAINBOW: 'rainbow',
} as const;

// ==============================================
// OBJECTIVE TYPE CONSTANTS
// ==============================================

/**
 * All objective types available in Adventure Mode
 */
export const OBJECTIVE_TYPES = {
  /** Find N words */
  WORD_COUNT: 'wordCount',
  /** Achieve N points */
  SCORE_TARGET: 'scoreTarget',
  /** Clear N ice tiles */
  CLEAR_ICE: 'clearIce',
  /** Find N words with 5+ letters */
  LONG_WORDS: 'longWords',
  /** Complete with N seconds remaining */
  TIME_BONUS: 'timeBonus',
  /** Collect N special gems */
  COLLECT_GEMS: 'collectGems',
} as const;

// ==============================================
// GRID SIZE CONFIGURATION
// ==============================================

/**
 * Grid sizes per world (4x4 to 7x7)
 * Progressively larger grids for higher worlds
 */
export const GRID_SIZES: Record<number, 4 | 5 | 6 | 7> = {
  1: 4,  // Tutorial - smallest grid
  2: 4,  // Tutorial - smallest grid
  3: 5,  // Standard difficulty begins
  4: 5,
  5: 5,
  6: 6,  // Challenging difficulty
  7: 6,
  8: 6,
  9: 7,  // Expert difficulty
  10: 7, // Final world - largest grid
};

/**
 * Get grid size for a world (with fallback)
 */
export function getGridSize(world: number): 4 | 5 | 6 | 7 {
  if (world < 1) return GRID_SIZES[1];
  if (world > 10) return GRID_SIZES[10];
  return GRID_SIZES[world];
}

// ==============================================
// TIMER CONFIGURATION
// ==============================================

/**
 * Timer durations per world (in seconds)
 * Shorter timers for higher worlds
 */
export const TIMER_DURATIONS: Record<number, number> = {
  1: 120,  // 2 minutes - generous for tutorial
  2: 110,
  3: 100,
  4: 90,
  5: 80,
  6: 70,
  7: 60,
  8: 55,
  9: 50,
  10: 45, // 45 seconds - challenging finale
};

/**
 * Get timer duration for a world (with fallback)
 */
export function getTimerDuration(world: number): number {
  if (world < 1) return TIMER_DURATIONS[1];
  if (world > 10) return TIMER_DURATIONS[10];
  return TIMER_DURATIONS[world];
}

// ==============================================
// XP CALCULATION FUNCTIONS
// ==============================================

/**
 * Calculate XP required to reach a specific level
 * Uses curved progression: Level N requires N^1.5 * 100 XP
 *
 * Must match database function `xp_for_level()` in 049_adventure_mode.sql
 *
 * @param level - Target level (1-50)
 * @returns XP required to reach that level
 */
export function getXpForLevel(level: number): number {
  if (level <= 1) return 0;
  const cappedLevel = Math.min(level, MAX_PLAYER_LEVEL);
  return Math.floor(Math.pow(cappedLevel, 1.5) * 100);
}

/**
 * Calculate player level from total XP
 * Uses curved progression: Level N requires N^1.5 * 100 XP
 *
 * Must match database function `calculate_player_level()` in 049_adventure_mode.sql
 *
 * @param totalXp - Total XP accumulated
 * @returns Current player level (1-50)
 */
export function getLevelFromXp(totalXp: number): number {
  if (totalXp <= 0) return 1;

  let level = 1;
  while (level < MAX_PLAYER_LEVEL) {
    const xpRequired = getXpForLevel(level + 1);
    if (totalXp < xpRequired) {
      return level;
    }
    level++;
  }
  return MAX_PLAYER_LEVEL;
}

/**
 * Calculate progress percentage within current level
 *
 * @param totalXp - Total XP accumulated
 * @returns Progress (0.0 to 1.0) toward next level
 */
export function getXpProgressInLevel(totalXp: number): number {
  if (totalXp <= 0) return 0;

  const currentLevel = getLevelFromXp(totalXp);
  if (currentLevel >= MAX_PLAYER_LEVEL) return 1;

  const currentLevelXp = getXpForLevel(currentLevel);
  const nextLevelXp = getXpForLevel(currentLevel + 1);
  const xpIntoLevel = totalXp - currentLevelXp;
  const xpNeededForNext = nextLevelXp - currentLevelXp;

  return xpNeededForNext > 0 ? xpIntoLevel / xpNeededForNext : 0;
}

/**
 * Calculate XP needed to reach next level
 *
 * @param totalXp - Total XP accumulated
 * @returns XP remaining to level up (0 if at max level)
 */
export function getXpToNextLevel(totalXp: number): number {
  const currentLevel = getLevelFromXp(totalXp);
  if (currentLevel >= MAX_PLAYER_LEVEL) return 0;

  const nextLevelXp = getXpForLevel(currentLevel + 1);
  return nextLevelXp - totalXp;
}

// ==============================================
// WORLD UNLOCK FUNCTIONS
// ==============================================

/**
 * Get stars required to unlock a specific world
 *
 * @param world - World number (1-10)
 * @returns Stars required to unlock
 */
export function getWorldUnlockRequirement(world: number): number {
  if (world <= 1) return 0; // World 1 always unlocked
  if (world >= 10) return TOTAL_STARS_FOR_FINAL_WORLD; // World 10 needs 80 total stars

  // Worlds 2-9: Need 15 stars per previous world
  return STARS_TO_UNLOCK_NEXT_WORLD * (world - 1);
}

/**
 * Check if a world is unlocked based on total stars
 *
 * @param world - World number (1-10)
 * @param totalStars - Player's total stars
 * @returns true if world is unlocked
 */
export function isWorldUnlocked(world: number, totalStars: number): boolean {
  return totalStars >= getWorldUnlockRequirement(world);
}

/**
 * Check if a level is unlocked within a world
 *
 * @param world - World number (1-10)
 * @param level - Level number within world (1-10)
 * @param completions - Array of completed levels with stars
 * @returns true if level is unlocked
 */
export function isLevelUnlocked(
  world: number,
  level: number,
  completions: Array<{ world: number; level: number; stars: number }>
): boolean {
  // Level 1 of any world is always available (if world is unlocked)
  if (level <= 1) return true;

  // Need at least 1 star on previous level in same world
  const previousCompletion = completions.find(
    (c) => c.world === world && c.level === level - 1
  );

  return previousCompletion !== undefined && previousCompletion.stars >= STARS_TO_UNLOCK_NEXT_LEVEL;
}

/**
 * Get the next locked level for a player
 *
 * @param currentWorld - Current world
 * @param completions - Array of completed levels
 * @returns { world, level } of next locked level, or null if all complete
 */
export function getNextUnlockedLevel(
  currentWorld: number,
  completions: Array<{ world: number; level: number; stars: number }>
): { world: number; level: number } | null {
  // Find highest completed level in current world
  const worldCompletions = completions.filter((c) => c.world === currentWorld);
  const maxLevel = worldCompletions.reduce((max, c) => Math.max(max, c.level), 0);

  // If not all levels complete in current world
  if (maxLevel < LEVELS_PER_WORLD) {
    return { world: currentWorld, level: maxLevel + 1 };
  }

  // Move to next world
  if (currentWorld < WORLDS_COUNT) {
    return { world: currentWorld + 1, level: 1 };
  }

  // All complete
  return null;
}

// ==============================================
// DIFFICULTY HELPERS
// ==============================================

/**
 * Get difficulty level for a world
 *
 * @param world - World number (1-10)
 * @returns Difficulty string
 */
export function getDifficultyForWorld(world: number): 'EASY' | 'MEDIUM' | 'HARD' {
  if (world <= 3) return 'EASY';
  if (world <= 6) return 'MEDIUM';
  return 'HARD';
}

/**
 * Get the global level number (1-100) from world and level
 *
 * @param world - World number (1-10)
 * @param level - Level within world (1-10)
 * @returns Global level number (1-100)
 */
export function getGlobalLevel(world: number, level: number): number {
  return (world - 1) * LEVELS_PER_WORLD + level;
}

/**
 * Get world and level from global level number
 *
 * @param globalLevel - Global level number (1-100)
 * @returns { world, level }
 */
export function getWorldAndLevel(globalLevel: number): { world: number; level: number } {
  const world = Math.ceil(globalLevel / LEVELS_PER_WORLD);
  const level = ((globalLevel - 1) % LEVELS_PER_WORLD) + 1;
  return { world: Math.min(world, WORLDS_COUNT), level };
}
```

- **VALIDATE:** `npm run test -- --testPathPattern="constants.test"` → All tests pass

---

### Task 3: CREATE lib/adventure/__tests__/levelConfig.test.ts

- **IMPLEMENT:** Test suite for world and level configuration
- **PATTERN:** Given-When-Then structure
- **TDD:** RED phase - tests MUST fail before implementation

```typescript
/**
 * Adventure Mode Level Configuration Tests
 *
 * Tests for world definitions and level configuration generators
 * Following TDD: Write tests FIRST, then implement
 */

import {
  // World configuration
  WORLD_CONFIGS,
  getWorldConfig,
  getAllWorldConfigs,
  // Level configuration
  getLevelConfig,
  getWorldLevels,
  getAllLevelConfigs,
  // Generators
  generateObjectives,
  generateSpecialTiles,
  // Validation
  validateLevelConfig,
} from '../levelConfig';
import type { LevelConfig, LevelObjective, SpecialTile } from '@/types/adventure';
import { WORLDS_COUNT, LEVELS_PER_WORLD } from '../constants';

describe('World Configuration', () => {
  describe('WORLD_CONFIGS', () => {
    it('should have configuration for all 10 worlds', () => {
      expect(WORLD_CONFIGS).toHaveLength(10);
    });

    it('should have unique IDs for each world', () => {
      const ids = WORLD_CONFIGS.map((w) => w.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);
    });

    it('should have unique names for each world', () => {
      const names = WORLD_CONFIGS.map((w) => w.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(10);
    });

    it('should have valid color references', () => {
      for (const world of WORLD_CONFIGS) {
        expect(world.colorPrimary).toBeTruthy();
        expect(world.colorSecondary).toBeTruthy();
      }
    });

    it('should have boss names for all worlds', () => {
      for (const world of WORLD_CONFIGS) {
        expect(world.bossName).toBeTruthy();
      }
    });
  });

  describe('getWorldConfig', () => {
    it('should return correct config for world 1', () => {
      const config = getWorldConfig(1);

      expect(config.id).toBe(1);
      expect(config.name).toBe('alphabetMeadows');
      expect(config.mechanic).toBeNull(); // Tutorial world has no special mechanic
    });

    it('should return correct config for world 2 (synonymSprings)', () => {
      const config = getWorldConfig(2);

      expect(config.id).toBe(2);
      expect(config.name).toBe('synonymSprings');
      expect(config.mechanic).toBe('synonymPairs');
    });

    it('should return correct config for world 10 (final)', () => {
      const config = getWorldConfig(10);

      expect(config.id).toBe(10);
      expect(config.name).toBe('lexiconThrone');
      expect(config.bossName).toBe('lexiconDragon');
    });

    it('should throw error for invalid world numbers', () => {
      expect(() => getWorldConfig(0)).toThrow();
      expect(() => getWorldConfig(11)).toThrow();
      expect(() => getWorldConfig(-1)).toThrow();
    });
  });

  describe('getAllWorldConfigs', () => {
    it('should return all world configs', () => {
      const configs = getAllWorldConfigs();
      expect(configs).toHaveLength(10);
      expect(configs[0].id).toBe(1);
      expect(configs[9].id).toBe(10);
    });
  });
});

describe('Level Configuration', () => {
  describe('getLevelConfig', () => {
    it('should return valid config for world 1, level 1', () => {
      // GIVEN
      const world = 1;
      const level = 1;

      // WHEN
      const config = getLevelConfig(world, level);

      // THEN
      expect(config.world).toBe(1);
      expect(config.level).toBe(1);
      expect(config.gridSize).toBe(4); // Tutorial world
      expect(config.timerSeconds).toBeGreaterThanOrEqual(90);
      expect(config.difficulty).toBe('EASY');
      expect(config.objectives.length).toBeGreaterThan(0);
    });

    it('should return valid config for any valid world/level', () => {
      // Test a sampling of levels across worlds
      const testCases = [
        { world: 1, level: 1 },
        { world: 1, level: 10 },
        { world: 5, level: 5 },
        { world: 10, level: 1 },
        { world: 10, level: 10 },
      ];

      for (const { world, level } of testCases) {
        const config = getLevelConfig(world, level);

        expect(config.world).toBe(world);
        expect(config.level).toBe(level);
        expect([4, 5, 6, 7]).toContain(config.gridSize);
        expect(config.timerSeconds).toBeGreaterThan(0);
        expect(['EASY', 'MEDIUM', 'HARD']).toContain(config.difficulty);
        expect(config.objectives.length).toBeGreaterThan(0);
      }
    });

    it('should include world mechanic for non-tutorial worlds', () => {
      // World 2+ should have mechanics
      const world2Config = getLevelConfig(2, 1);
      expect(world2Config.worldMechanic).toBe('synonymPairs');

      const world3Config = getLevelConfig(3, 1);
      expect(world3Config.worldMechanic).toBe('etymologyRoots');
    });

    it('should not include world mechanic for world 1 (tutorial)', () => {
      const config = getLevelConfig(1, 1);
      expect(config.worldMechanic).toBeUndefined();
    });

    it('should increase difficulty for higher worlds', () => {
      const world1 = getLevelConfig(1, 5);
      const world5 = getLevelConfig(5, 5);
      const world10 = getLevelConfig(10, 5);

      expect(world1.difficulty).toBe('EASY');
      expect(world5.difficulty).toBe('MEDIUM');
      expect(world10.difficulty).toBe('HARD');
    });

    it('should throw error for invalid world/level', () => {
      expect(() => getLevelConfig(0, 1)).toThrow();
      expect(() => getLevelConfig(1, 0)).toThrow();
      expect(() => getLevelConfig(11, 1)).toThrow();
      expect(() => getLevelConfig(1, 11)).toThrow();
    });
  });

  describe('getWorldLevels', () => {
    it('should return 10 levels for a world', () => {
      const levels = getWorldLevels(1);
      expect(levels).toHaveLength(10);
    });

    it('should return levels in order', () => {
      const levels = getWorldLevels(3);

      for (let i = 0; i < levels.length; i++) {
        expect(levels[i].world).toBe(3);
        expect(levels[i].level).toBe(i + 1);
      }
    });
  });

  describe('getAllLevelConfigs', () => {
    it('should return all 100 level configs', () => {
      const allConfigs = getAllLevelConfigs();
      expect(allConfigs).toHaveLength(100);
    });

    it('should be ordered by world then level', () => {
      const allConfigs = getAllLevelConfigs();

      // Check first level
      expect(allConfigs[0].world).toBe(1);
      expect(allConfigs[0].level).toBe(1);

      // Check last level
      expect(allConfigs[99].world).toBe(10);
      expect(allConfigs[99].level).toBe(10);

      // Check order throughout
      for (let i = 0; i < 100; i++) {
        const expectedWorld = Math.floor(i / 10) + 1;
        const expectedLevel = (i % 10) + 1;
        expect(allConfigs[i].world).toBe(expectedWorld);
        expect(allConfigs[i].level).toBe(expectedLevel);
      }
    });
  });
});

describe('Objective Generation', () => {
  describe('generateObjectives', () => {
    it('should generate at least one primary objective', () => {
      const objectives = generateObjectives(1, 1);

      const primary = objectives.filter((o) => o.isPrimary);
      expect(primary.length).toBeGreaterThanOrEqual(1);
    });

    it('should generate wordCount or scoreTarget as primary', () => {
      // Test multiple levels to ensure variety
      let hasWordCount = false;
      let hasScoreTarget = false;

      for (let level = 1; level <= 10; level++) {
        const objectives = generateObjectives(1, level);
        const primary = objectives.find((o) => o.isPrimary);

        if (primary?.type === 'wordCount') hasWordCount = true;
        if (primary?.type === 'scoreTarget') hasScoreTarget = true;
      }

      // Should have both types across 10 levels
      expect(hasWordCount || hasScoreTarget).toBe(true);
    });

    it('should increase objective targets for higher levels', () => {
      const early = generateObjectives(1, 1);
      const late = generateObjectives(3, 10);

      const earlyPrimary = early.find((o) => o.isPrimary);
      const latePrimary = late.find((o) => o.isPrimary);

      expect(latePrimary!.target).toBeGreaterThan(earlyPrimary!.target);
    });

    it('should add secondary objectives for higher levels', () => {
      // Early level should have fewer objectives
      const earlyObjectives = generateObjectives(1, 1);

      // Later level should have more objectives
      const lateObjectives = generateObjectives(3, 8);

      expect(lateObjectives.length).toBeGreaterThanOrEqual(earlyObjectives.length);
    });

    it('should add clearIce objective for worlds with ice tiles', () => {
      // World 2+ has ice tiles
      const objectives = generateObjectives(2, 7);
      const hasClearIce = objectives.some((o) => o.type === 'clearIce');

      // Should sometimes have clearIce objectives
      // (not always, so we check multiple levels)
      let foundClearIce = false;
      for (let level = 1; level <= 10; level++) {
        const objs = generateObjectives(2, level);
        if (objs.some((o) => o.type === 'clearIce')) {
          foundClearIce = true;
          break;
        }
      }
      expect(foundClearIce).toBe(true);
    });
  });
});

describe('Special Tile Generation', () => {
  describe('generateSpecialTiles', () => {
    it('should return empty array for world 1 early levels', () => {
      // Tutorial levels have no special tiles
      const tiles = generateSpecialTiles(1, 1, 4);
      expect(tiles).toHaveLength(0);
    });

    it('should add gold tiles from world 1 level 8+', () => {
      const tiles = generateSpecialTiles(1, 8, 4);
      const goldTiles = tiles.filter((t) => t.type === 'gold');

      expect(goldTiles.length).toBeGreaterThan(0);
    });

    it('should add ice tiles from world 2+', () => {
      const tiles = generateSpecialTiles(2, 3, 5);
      const iceTiles = tiles.filter((t) => t.type === 'ice');

      expect(iceTiles.length).toBeGreaterThan(0);
    });

    it('should add bomb tiles from world 3+', () => {
      const tiles = generateSpecialTiles(3, 5, 5);
      const bombTiles = tiles.filter((t) => t.type === 'bomb');

      expect(bombTiles.length).toBeGreaterThan(0);
    });

    it('should respect grid bounds', () => {
      const gridSize = 5;
      const tiles = generateSpecialTiles(5, 5, gridSize);

      for (const tile of tiles) {
        expect(tile.row).toBeGreaterThanOrEqual(0);
        expect(tile.row).toBeLessThan(gridSize);
        expect(tile.col).toBeGreaterThanOrEqual(0);
        expect(tile.col).toBeLessThan(gridSize);
      }
    });

    it('should not have duplicate positions', () => {
      const tiles = generateSpecialTiles(5, 10, 6);
      const positions = new Set(tiles.map((t) => `${t.row},${t.col}`));

      expect(positions.size).toBe(tiles.length);
    });
  });
});

describe('Level Config Validation', () => {
  describe('validateLevelConfig', () => {
    it('should pass for valid config', () => {
      const config = getLevelConfig(1, 1);
      const result = validateLevelConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for invalid world', () => {
      const config: LevelConfig = {
        world: 0, // Invalid
        level: 1,
        gridSize: 5,
        timerSeconds: 90,
        objectives: [],
        specialTiles: [],
        difficulty: 'EASY',
      };

      const result = validateLevelConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid world: must be 1-10');
    });

    it('should fail for empty objectives', () => {
      const config: LevelConfig = {
        world: 1,
        level: 1,
        gridSize: 5,
        timerSeconds: 90,
        objectives: [], // Empty!
        specialTiles: [],
        difficulty: 'EASY',
      };

      const result = validateLevelConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one objective required');
    });

    it('should fail for special tile outside grid', () => {
      const config: LevelConfig = {
        world: 1,
        level: 1,
        gridSize: 4,
        timerSeconds: 90,
        objectives: [{ type: 'wordCount', target: 10, isPrimary: true }],
        specialTiles: [{ row: 5, col: 0, type: 'gold' }], // Row 5 invalid for 4x4
        difficulty: 'EASY',
      };

      const result = validateLevelConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('outside grid'))).toBe(true);
    });
  });
});
```

- **VALIDATE:** `npm run test -- --testPathPattern="levelConfig.test"` → Tests fail (RED)

---

### Task 4: CREATE lib/adventure/levelConfig.ts

- **IMPLEMENT:** World definitions and level configuration generators
- **PATTERN:** Use types from `@/types/adventure`
- **TDD:** GREEN phase - make all tests pass
- **REFERENCE:** World themes from `.claude/agents/plans/adventure-mode-design-spec.md`

```typescript
/**
 * Adventure Mode Level Configuration
 *
 * World definitions, level configurations, and objective/tile generators
 * for the Adventure Mode progression system.
 */

import type {
  LevelConfig,
  LevelObjective,
  SpecialTile,
  ObjectiveType,
  TileType,
} from '@/types/adventure';
import {
  WORLDS_COUNT,
  LEVELS_PER_WORLD,
  OBJECTIVE_TYPES,
  TILE_TYPES,
  getGridSize,
  getTimerDuration,
  getDifficultyForWorld,
} from './constants';

// ==============================================
// WORLD CONFIGURATION
// ==============================================

/**
 * Configuration for a themed world
 */
export interface WorldConfig {
  /** World number (1-10) */
  id: number;
  /** Translation key for world name */
  name: string;
  /** Visual theme identifier */
  theme: string;
  /** Special mechanic for this world (null for tutorial) */
  mechanic: string | null;
  /** Translation key for boss name */
  bossName: string;
  /** Primary Tailwind color class */
  colorPrimary: string;
  /** Secondary Tailwind color class */
  colorSecondary: string;
  /** World description key */
  description: string;
}

/**
 * All world configurations
 */
export const WORLD_CONFIGS: WorldConfig[] = [
  {
    id: 1,
    name: 'alphabetMeadows',
    theme: 'sunny-pastoral',
    mechanic: null, // Tutorial - no special mechanic
    bossName: 'msGrammar',
    colorPrimary: 'neo-lime',
    colorSecondary: 'neo-lime-light',
    description: 'worldDescAlphabetMeadows',
  },
  {
    id: 2,
    name: 'synonymSprings',
    theme: 'waterfalls',
    mechanic: 'synonymPairs', // +25% for synonym pairs
    bossName: 'spellingBee',
    colorPrimary: 'neo-cyan',
    colorSecondary: 'neo-cyan-light',
    description: 'worldDescSynonymSprings',
  },
  {
    id: 3,
    name: 'rootCaverns',
    theme: 'crystal-caves',
    mechanic: 'etymologyRoots', // Bonus for Latin/Greek roots
    bossName: 'professorThesaurus',
    colorPrimary: 'neo-purple',
    colorSecondary: 'neo-purple-light',
    description: 'worldDescRootCaverns',
  },
  {
    id: 4,
    name: 'idiomArchipelago',
    theme: 'tropical-islands',
    mechanic: 'idioms', // Hidden idiom challenges
    bossName: 'captainMetaphor',
    colorPrimary: 'neo-orange',
    colorSecondary: 'neo-yellow',
    description: 'worldDescIdiomArchipelago',
  },
  {
    id: 5,
    name: 'compoundCanyon',
    theme: 'desert-cliffs',
    mechanic: 'compounds', // +30% for compound words
    bossName: 'baronBuildaword',
    colorPrimary: 'neo-red',
    colorSecondary: 'neo-orange',
    description: 'worldDescCompoundCanyon',
  },
  {
    id: 6,
    name: 'anagramLabyrinth',
    theme: 'escher-maze',
    mechanic: 'anagrams', // Solve anagrams for bonuses
    bossName: 'puzzleMaster',
    colorPrimary: 'neo-pink',
    colorSecondary: 'neo-pink-light',
    description: 'worldDescAnagramLabyrinth',
  },
  {
    id: 7,
    name: 'mirrorPalace',
    theme: 'reflective-glass',
    mechanic: 'palindromes', // +50% for palindromes
    bossName: 'reflectionKing',
    colorPrimary: 'neo-cyan',
    colorSecondary: 'neo-white',
    description: 'worldDescMirrorPalace',
  },
  {
    id: 8,
    name: 'neologismNebula',
    theme: 'space-stars',
    mechanic: 'rareWords', // +40% for rare/new words
    bossName: 'cosmicWordsmith',
    colorPrimary: 'neo-purple',
    colorSecondary: 'neo-pink',
    description: 'worldDescNeologismNebula',
  },
  {
    id: 9,
    name: 'polyglotPeaks',
    theme: 'mountain-aurora',
    mechanic: 'multilingual', // Multi-language word bonuses
    bossName: 'linguistSage',
    colorPrimary: 'neo-cyan',
    colorSecondary: 'neo-lime',
    description: 'worldDescPolyglotPeaks',
  },
  {
    id: 10,
    name: 'lexiconThrone',
    theme: 'golden-library',
    mechanic: 'allMechanics', // All mechanics combined
    bossName: 'lexiconDragon',
    colorPrimary: 'neo-yellow',
    colorSecondary: 'neo-orange',
    description: 'worldDescLexiconThrone',
  },
];

/**
 * Get configuration for a specific world
 *
 * @param world - World number (1-10)
 * @returns World configuration
 * @throws Error if world number is invalid
 */
export function getWorldConfig(world: number): WorldConfig {
  if (world < 1 || world > WORLDS_COUNT) {
    throw new Error(`Invalid world: ${world}. Must be between 1 and ${WORLDS_COUNT}.`);
  }
  return WORLD_CONFIGS[world - 1];
}

/**
 * Get all world configurations
 *
 * @returns Array of all world configurations
 */
export function getAllWorldConfigs(): WorldConfig[] {
  return [...WORLD_CONFIGS];
}

// ==============================================
// LEVEL CONFIGURATION
// ==============================================

/**
 * Hidden words for bonus stars on milestone levels
 */
const HIDDEN_WORDS: Record<string, string> = {
  '1-5': 'MAGIC',
  '1-10': 'ADVENTURE',
  '2-5': 'CRYSTAL',
  '2-10': 'LANGUAGE',
  '3-5': 'ANCIENT',
  '3-10': 'KNOWLEDGE',
  '4-5': 'ISLAND',
  '4-10': 'TREASURE',
  '5-5': 'COMPOUND',
  '5-10': 'BUILDER',
  '6-5': 'PUZZLE',
  '6-10': 'TWISTED',
  '7-5': 'MIRROR',
  '7-10': 'REFLECT',
  '8-5': 'COSMOS',
  '8-10': 'STELLAR',
  '9-5': 'GLOBAL',
  '9-10': 'WISDOM',
  '10-5': 'THRONE',
  '10-10': 'LEXICON',
};

/**
 * Get level configuration for a specific world and level
 *
 * @param world - World number (1-10)
 * @param level - Level within world (1-10)
 * @returns Complete level configuration
 * @throws Error if world or level is invalid
 */
export function getLevelConfig(world: number, level: number): LevelConfig {
  // Validate inputs
  if (world < 1 || world > WORLDS_COUNT) {
    throw new Error(`Invalid world: ${world}. Must be between 1 and ${WORLDS_COUNT}.`);
  }
  if (level < 1 || level > LEVELS_PER_WORLD) {
    throw new Error(`Invalid level: ${level}. Must be between 1 and ${LEVELS_PER_WORLD}.`);
  }

  const worldConfig = getWorldConfig(world);
  const gridSize = getGridSize(world);
  const timerSeconds = getTimerDuration(world);
  const difficulty = getDifficultyForWorld(world);

  // Generate level-specific content
  const objectives = generateObjectives(world, level);
  const specialTiles = generateSpecialTiles(world, level, gridSize);

  // Build config
  const config: LevelConfig = {
    world,
    level,
    gridSize,
    timerSeconds,
    objectives,
    specialTiles,
    difficulty,
  };

  // Add world mechanic for non-tutorial worlds
  if (worldConfig.mechanic) {
    config.worldMechanic = worldConfig.mechanic;
  }

  // Add hidden word for milestone levels (5 and 10)
  const hiddenWordKey = `${world}-${level}`;
  if (HIDDEN_WORDS[hiddenWordKey]) {
    config.hiddenWord = HIDDEN_WORDS[hiddenWordKey];
  }

  return config;
}

/**
 * Get all level configs for a specific world
 *
 * @param world - World number (1-10)
 * @returns Array of 10 level configurations
 */
export function getWorldLevels(world: number): LevelConfig[] {
  return Array.from({ length: LEVELS_PER_WORLD }, (_, i) =>
    getLevelConfig(world, i + 1)
  );
}

/**
 * Get all level configs for all worlds
 *
 * @returns Array of 100 level configurations (ordered by world, then level)
 */
export function getAllLevelConfigs(): LevelConfig[] {
  const configs: LevelConfig[] = [];

  for (let world = 1; world <= WORLDS_COUNT; world++) {
    for (let level = 1; level <= LEVELS_PER_WORLD; level++) {
      configs.push(getLevelConfig(world, level));
    }
  }

  return configs;
}

// ==============================================
// OBJECTIVE GENERATION
// ==============================================

/**
 * Generate objectives for a level
 *
 * @param world - World number
 * @param level - Level within world
 * @returns Array of level objectives
 */
export function generateObjectives(world: number, level: number): LevelObjective[] {
  const objectives: LevelObjective[] = [];
  const globalLevel = (world - 1) * LEVELS_PER_WORLD + level;

  // Primary objective: Alternate between wordCount and scoreTarget
  if (level % 2 === 1) {
    // Odd levels: word count
    // Base: 8 words, +2 every 5 global levels, max 25
    const target = Math.min(8 + Math.floor(globalLevel / 5) * 2, 25);
    objectives.push({
      type: OBJECTIVE_TYPES.WORD_COUNT as ObjectiveType,
      target,
      isPrimary: true,
    });
  } else {
    // Even levels: score target
    // Base: 200, +30 per global level, max 1000
    const target = Math.min(200 + globalLevel * 30, 1000);
    objectives.push({
      type: OBJECTIVE_TYPES.SCORE_TARGET as ObjectiveType,
      target,
      isPrimary: true,
    });
  }

  // Secondary objectives based on level progression

  // Long words objective (level 3+)
  if (level >= 3) {
    // 1 long word at level 3, +1 every 3 levels, max 5
    const target = Math.min(1 + Math.floor((level - 3) / 3), 5);
    objectives.push({
      type: OBJECTIVE_TYPES.LONG_WORDS as ObjectiveType,
      target,
      isPrimary: false,
    });
  }

  // Clear ice objective (world 2+, level 5+)
  if (world >= 2 && level >= 5) {
    // 2 ice tiles + 1 per 2 levels, max 10
    const target = Math.min(2 + Math.floor((level - 5) / 2), 10);
    objectives.push({
      type: OBJECTIVE_TYPES.CLEAR_ICE as ObjectiveType,
      target,
      isPrimary: false,
    });
  }

  // Time bonus objective (level 7+, worlds 3+)
  if (world >= 3 && level >= 7) {
    // Complete with 30+ seconds remaining
    const target = Math.max(30 - (world - 3) * 5, 10);
    objectives.push({
      type: OBJECTIVE_TYPES.TIME_BONUS as ObjectiveType,
      target,
      isPrimary: false,
    });
  }

  return objectives;
}

// ==============================================
// SPECIAL TILE GENERATION
// ==============================================

/**
 * Generate special tiles for a level
 *
 * @param world - World number
 * @param level - Level within world
 * @param gridSize - Size of the grid (4-7)
 * @returns Array of special tile positions
 */
export function generateSpecialTiles(
  world: number,
  level: number,
  gridSize: number
): SpecialTile[] {
  const tiles: SpecialTile[] = [];
  const usedPositions = new Set<string>();

  /**
   * Add a tile at a random unique position
   */
  const addTile = (type: TileType): void => {
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
      const row = Math.floor(Math.random() * gridSize);
      const col = Math.floor(Math.random() * gridSize);
      const posKey = `${row},${col}`;

      if (!usedPositions.has(posKey)) {
        usedPositions.add(posKey);
        tiles.push({ row, col, type });
        return;
      }
      attempts++;
    }
  };

  // World 1: No special tiles for levels 1-7 (tutorial)
  if (world === 1 && level < 8) {
    return tiles;
  }

  // Gold tiles: World 1 level 8+, increasing count
  if (world >= 1 && level >= 8 || world >= 2) {
    const goldCount = Math.min(1 + Math.floor((world - 1) / 2) + Math.floor(level / 5), 4);
    for (let i = 0; i < goldCount; i++) {
      addTile(TILE_TYPES.GOLD as TileType);
    }
  }

  // Ice tiles: World 2+
  if (world >= 2) {
    // Base: 2 ice tiles, +1 per 3 levels, +1 per world, max 8
    const iceCount = Math.min(2 + Math.floor(level / 3) + (world - 2), 8);
    for (let i = 0; i < iceCount; i++) {
      addTile(TILE_TYPES.ICE as TileType);
    }
  }

  // Bomb tiles: World 3+, level 3+
  if (world >= 3 && level >= 3) {
    // 1 bomb tile, +1 for level 7+
    const bombCount = level >= 7 ? 2 : 1;
    for (let i = 0; i < bombCount; i++) {
      addTile(TILE_TYPES.BOMB as TileType);
    }
  }

  // Rainbow tiles: World 5+, level 5+
  if (world >= 5 && level >= 5) {
    // 1 rainbow tile, rare
    addTile(TILE_TYPES.RAINBOW as TileType);
  }

  return tiles;
}

// ==============================================
// VALIDATION
// ==============================================

/**
 * Validation result for level config
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a level configuration
 *
 * @param config - Level configuration to validate
 * @returns Validation result with errors
 */
export function validateLevelConfig(config: LevelConfig): ValidationResult {
  const errors: string[] = [];

  // Validate world
  if (config.world < 1 || config.world > WORLDS_COUNT) {
    errors.push('Invalid world: must be 1-10');
  }

  // Validate level
  if (config.level < 1 || config.level > LEVELS_PER_WORLD) {
    errors.push('Invalid level: must be 1-10');
  }

  // Validate grid size
  if (![4, 5, 6, 7].includes(config.gridSize)) {
    errors.push('Invalid grid size: must be 4, 5, 6, or 7');
  }

  // Validate timer
  if (config.timerSeconds <= 0) {
    errors.push('Invalid timer: must be positive');
  }

  // Validate objectives
  if (config.objectives.length === 0) {
    errors.push('At least one objective required');
  }

  const hasPrimary = config.objectives.some((o) => o.isPrimary);
  if (!hasPrimary && config.objectives.length > 0) {
    errors.push('At least one primary objective required');
  }

  // Validate special tiles
  for (const tile of config.specialTiles) {
    if (tile.row < 0 || tile.row >= config.gridSize) {
      errors.push(`Special tile at row ${tile.row} is outside grid bounds`);
    }
    if (tile.col < 0 || tile.col >= config.gridSize) {
      errors.push(`Special tile at col ${tile.col} is outside grid bounds`);
    }
  }

  // Validate difficulty
  if (!['EASY', 'MEDIUM', 'HARD'].includes(config.difficulty)) {
    errors.push('Invalid difficulty: must be EASY, MEDIUM, or HARD');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

- **VALIDATE:** `npm run test -- --testPathPattern="levelConfig.test"` → All tests pass

---

### Task 5: CREATE types/__tests__/adventure.test.ts

- **IMPLEMENT:** Type validation tests to ensure type exports work correctly
- **PATTERN:** Import verification tests
- **TDD:** This validates existing types - should pass immediately

```typescript
/**
 * Adventure Types Export Tests
 *
 * Validates that all adventure types are properly exported
 * and can be imported correctly.
 */

import type {
  TileType,
  TileState,
  SpecialTile,
  ObjectiveType,
  LevelObjective,
  LevelConfig,
  LevelCompletion,
  PlayerProgression,
  AdventureGameState,
  WorldName,
} from '@/types/adventure';
import { WORLD_NAMES } from '@/types/adventure';

describe('Adventure Types', () => {
  describe('Type Exports', () => {
    it('should export TileType as string union', () => {
      const tile: TileType = 'standard';
      expect(['standard', 'gold', 'ice', 'bomb', 'rainbow']).toContain(tile);
    });

    it('should export ObjectiveType as string union', () => {
      const obj: ObjectiveType = 'wordCount';
      expect(['wordCount', 'scoreTarget', 'clearIce', 'longWords', 'timeBonus', 'collectGems']).toContain(obj);
    });

    it('should export WORLD_NAMES constant', () => {
      expect(WORLD_NAMES).toHaveLength(10);
      expect(WORLD_NAMES[0]).toBe('alphabetMeadows');
      expect(WORLD_NAMES[9]).toBe('lexiconThrone');
    });
  });

  describe('TileState Interface', () => {
    it('should have all required properties', () => {
      const state: TileState = {
        letter: 'A',
        type: 'standard',
        isCleared: false,
      };

      expect(state.letter).toBe('A');
      expect(state.type).toBe('standard');
      expect(state.isCleared).toBe(false);
    });

    it('should accept optional properties', () => {
      const state: TileState = {
        letter: 'B',
        type: 'ice',
        isCleared: false,
        cascadeDelay: 100,
        isFrozen: true,
      };

      expect(state.cascadeDelay).toBe(100);
      expect(state.isFrozen).toBe(true);
    });
  });

  describe('SpecialTile Interface', () => {
    it('should have position and type', () => {
      const tile: SpecialTile = {
        row: 2,
        col: 3,
        type: 'gold',
      };

      expect(tile.row).toBe(2);
      expect(tile.col).toBe(3);
      expect(tile.type).toBe('gold');
    });
  });

  describe('LevelObjective Interface', () => {
    it('should have required properties', () => {
      const objective: LevelObjective = {
        type: 'wordCount',
        target: 10,
      };

      expect(objective.type).toBe('wordCount');
      expect(objective.target).toBe(10);
    });

    it('should accept optional properties', () => {
      const objective: LevelObjective = {
        type: 'scoreTarget',
        target: 500,
        current: 250,
        isComplete: false,
        isPrimary: true,
      };

      expect(objective.current).toBe(250);
      expect(objective.isComplete).toBe(false);
      expect(objective.isPrimary).toBe(true);
    });
  });

  describe('LevelConfig Interface', () => {
    it('should have all required properties', () => {
      const config: LevelConfig = {
        world: 1,
        level: 1,
        gridSize: 4,
        timerSeconds: 90,
        objectives: [{ type: 'wordCount', target: 10 }],
        specialTiles: [],
        difficulty: 'EASY',
      };

      expect(config.world).toBe(1);
      expect(config.gridSize).toBe(4);
      expect(config.difficulty).toBe('EASY');
    });

    it('should accept optional properties', () => {
      const config: LevelConfig = {
        world: 2,
        level: 5,
        gridSize: 5,
        timerSeconds: 75,
        objectives: [{ type: 'wordCount', target: 15 }],
        specialTiles: [{ row: 2, col: 2, type: 'gold' }],
        difficulty: 'MEDIUM',
        hiddenWord: 'CRYSTAL',
        worldMechanic: 'synonymPairs',
      };

      expect(config.hiddenWord).toBe('CRYSTAL');
      expect(config.worldMechanic).toBe('synonymPairs');
    });
  });

  describe('LevelCompletion Interface', () => {
    it('should track completion data', () => {
      const completion: LevelCompletion = {
        world: 1,
        level: 5,
        stars: 2,
        bestScore: 450,
        bestWords: 15,
        completedAt: '2025-01-21T12:00:00Z',
      };

      expect(completion.stars).toBe(2);
      expect(completion.bestScore).toBe(450);
    });

    it('should constrain stars to 0-3', () => {
      const completion: LevelCompletion = {
        world: 1,
        level: 1,
        stars: 3, // Max is 3
        bestScore: 999,
        bestWords: 25,
        completedAt: new Date().toISOString(),
      };

      expect([0, 1, 2, 3]).toContain(completion.stars);
    });
  });

  describe('PlayerProgression Interface', () => {
    it('should have all required properties', () => {
      const progression: PlayerProgression = {
        userId: 'user-123',
        playerLevel: 5,
        xp: 2500,
        currentWorld: 2,
        currentLevel: 3,
        totalStars: 25,
        completions: [],
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-21T12:00:00Z',
      };

      expect(progression.playerLevel).toBe(5);
      expect(progression.totalStars).toBe(25);
    });
  });

  describe('AdventureGameState Interface', () => {
    it('should have all required properties', () => {
      const state: AdventureGameState = {
        levelConfig: {
          world: 1,
          level: 1,
          gridSize: 4,
          timerSeconds: 90,
          objectives: [],
          specialTiles: [],
          difficulty: 'EASY',
        },
        tiles: [],
        score: 0,
        wordsFound: [],
        objectives: [],
        comboCount: 0,
        cascadeActive: false,
        isComplete: false,
        stars: 0,
      };

      expect(state.score).toBe(0);
      expect(state.isComplete).toBe(false);
    });
  });
});
```

- **VALIDATE:** `npm run test -- --testPathPattern="adventure.test"` → All tests pass

---

### Task 6: UPDATE types/index.ts exports (if needed)

- **IMPLEMENT:** Ensure all new exports are available from `@/types`
- **PATTERN:** Central export file pattern
- **NOTE:** Verify `@/lib/adventure` can be imported

```typescript
// Verify in types/index.ts that adventure exports are correct
// Add to exports if missing:
export * from './adventure';
```

- **VALIDATE:** `npm run build` → No TypeScript errors

---

## TESTING STRATEGY

### Unit Tests

**Scope and Requirements:**
- Test all constants values
- Test all utility functions (XP calculations, unlock checking)
- Test all level configuration generators
- Test validation functions

**Pattern (Given-When-Then):**
```typescript
describe('getXpForLevel', () => {
  it('should calculate XP using curved formula', () => {
    // GIVEN
    const level = 10;

    // WHEN
    const result = getXpForLevel(level);

    // THEN
    const expected = Math.floor(Math.pow(10, 1.5) * 100);
    expect(result).toBe(expected);
  });
});
```

### Edge Cases

- Level 0 or negative
- Level above max (50)
- World 0 or negative
- World above max (10)
- Empty completions array
- Boundary conditions for star requirements

---

## VALIDATION COMMANDS

### Level 1: TypeScript Compilation
```bash
cd fe-next && npm run build
```
**Expected:** Build succeeds with no TypeScript errors

### Level 2: Unit Tests
```bash
cd fe-next && npm run test -- --testPathPattern="lib/adventure"
```
**Expected:** All adventure-related tests pass

### Level 3: Type Tests
```bash
cd fe-next && npm run test -- --testPathPattern="types.*adventure"
```
**Expected:** All type export tests pass

### Level 4: Lint Check
```bash
cd fe-next && npm run lint
```
**Expected:** No linting errors

---

## ACCEPTANCE CRITERIA

- [ ] `lib/adventure/constants.ts` created with all game constants
- [ ] `lib/adventure/levelConfig.ts` created with world/level configs
- [ ] All 10 worlds defined with unique names, themes, mechanics
- [ ] All 100 levels have valid configurations
- [ ] XP calculation matches database functions (N^1.5 * 100)
- [ ] Star unlock requirements implemented correctly
- [ ] Objective generation scales with difficulty
- [ ] Special tile generation respects world progression
- [ ] Validation functions work correctly
- [ ] Unit test coverage >= 80%
- [ ] All validation commands pass

---

## COMPLETION CHECKLIST

- [ ] Task 1: constants.test.ts created (RED phase)
- [ ] Task 2: constants.ts implemented (GREEN phase)
- [ ] Task 3: levelConfig.test.ts created (RED phase)
- [ ] Task 4: levelConfig.ts implemented (GREEN phase)
- [ ] Task 5: adventure.test.ts for types created
- [ ] Task 6: exports verified
- [ ] All tests passing
- [ ] Lint check passes
- [ ] Build succeeds
- [ ] Code follows project conventions

---

## NOTES

### Design Rationale

**Why curved XP progression (N^1.5 * 100)?**
- Matches database function in `049_adventure_mode.sql`
- Creates satisfying early game progress
- Slows down at higher levels without being punishing
- Level 10 = ~3162 XP, Level 50 = ~35355 XP

**Why 15 stars per world unlock?**
- 50% of max stars (30) per world
- Allows some levels to be skipped
- Not punishing for players who struggle on specific levels

**Why deterministic tile generation in test vs random in production?**
- Tests use seeded random for reproducibility
- Production uses `Math.random()` for variety
- Both ensure no duplicate positions

### Future Considerations

- Seeded random for reproducible level layouts
- Level editor for custom levels
- A/B testing different difficulty curves
- Localization for world names and descriptions
