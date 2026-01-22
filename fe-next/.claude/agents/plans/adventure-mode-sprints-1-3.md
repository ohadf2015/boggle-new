# Feature: LexiClash Adventure Mode (Sprints 1-3)

**IMPORTANT:** Before implementing, validate documentation and codebase patterns. Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

Transform LexiClash's single player from a preset-based casual experience into an engaging, progression-driven adventure with levels, story elements, and visual evolution. This plan covers **Sprints 1-3 (Foundation, World Map, and Adventure Gameplay)** - a playable single-player adventure without bosses.

**Design Reference:** See full design at `~/.claude/plans/silly-purring-riddle.md` for visual mockups, research, and complete feature specification.

## User Story

As a **casual word game player**
I want to **play through themed worlds with progressive difficulty**
So that **I feel a sense of achievement and have a reason to return daily**

## Problem Statement

Current single-player mode lacks progression - each session feels isolated with no sense of journey or completion. Players have nothing to work toward, resulting in lower retention compared to industry benchmarks (Wordscapes achieves 10%+ D28 retention).

## Solution Statement

Implement "Word Realms" - a hybrid level + XP progression system with:
- **10 themed worlds** with 10 levels each (100 total levels)
- **3-star rating** system per level with clear objectives
- **Special tiles** (Gold 3x, Ice obstacles, Bomb row-clear)
- **Cascade/chain reaction** mechanics for satisfying feedback
- **XP and player levels** (1-50) with unlock progression

## Feature Metadata

**Feature Type:** New Capability
**Estimated Complexity:** High (3 sprints = ~4 weeks)
**Primary Systems Affected:** Single Player, Database, App Router
**Dependencies:** Supabase, Framer Motion (existing), Tailwind CSS (existing)

---

## CONTEXT REFERENCES

### Prime Context (READ THIS FIRST!)

- `fe-next/CLAUDE.md` - Project coding standards and design system
- `.claude/rules/22-tdd-strict.md` - TDD requirements (RED-GREEN-REFACTOR)
- `.claude/rules/20-testing.md` - Given-When-Then test patterns

### Relevant Codebase Files (MUST READ BEFORE IMPLEMENTING!)

#### Single Player Architecture
- `components/singleplayer/SinglePlayerView.tsx` (lines 1-200)
  - **WHY:** Main orchestrator with phase management pattern
  - **PATTERN:** `SinglePlayerPhase = 'preset-selection' | 'lobby' | 'playing' | 'results'`
  - **EXTEND:** Add `'adventure-map'` and `'adventure-playing'` phases

- `components/singleplayer/SinglePlayerGame.tsx`
  - **WHY:** Game rendering component to potentially reuse
  - **PATTERN:** Receives game state, renders grid and UI

#### Hooks
- `hooks/useSinglePlayerGame.ts` (lines 1-100)
  - **WHY:** Core game loop logic to extend
  - **PATTERN:** Returns `{ grid, score, foundWords, timer, combo, ... }`

- `hooks/useComboSystem.ts`
  - **WHY:** Existing combo tracking - extend for cascades

#### Contexts
- `contexts/LanguageContext.tsx`
  - **WHY:** Translation pattern with `t()` function
  - **PATTERN:** `useLanguage()` returns `{ t, language, dir }`

- `contexts/GameStateContext.tsx`
  - **WHY:** Global state provider pattern
  - **PATTERN:** Context + Provider + custom hook

#### Database Patterns
- `supabase/migrations/001_initial_schema.sql` (lines 1-150)
  - **WHY:** Migration structure and RLS patterns
  - **PATTERN:** Tables + indexes + triggers

- `supabase/migrations/002_row_level_security.sql`
  - **WHY:** RLS policy patterns
  - **PATTERN:** `auth.uid() = user_id` checks

#### Design System
- `tailwind.config.js` (lines 49-93)
  - **WHY:** Neo-brutalist design tokens
  - **PATTERN:** `neo-*` colors, `shadow-hard-*`, `border-neo`

#### Motion Patterns
- `components/motion/AdaptiveMotion.tsx`
  - **WHY:** Performance-aware Framer Motion wrapper
  - **PATTERN:** `<AdaptiveMotion.div>` for animations

### New Files to Create

#### Sprint 1: Foundation & Database
```
supabase/migrations/049_adventure_mode.sql
types/adventure.ts
app/api/adventure/progress/route.ts
app/api/adventure/complete/route.ts
app/api/adventure/levels/route.ts
lib/adventure/levelConfig.ts
lib/adventure/constants.ts
```

#### Sprint 2: World Map UI
```
app/[locale]/adventure/page.tsx
app/[locale]/adventure/layout.tsx
components/adventure/WorldMap/WorldMap.tsx
components/adventure/WorldMap/LevelNode.tsx
components/adventure/WorldMap/WorldPath.tsx
components/adventure/WorldMap/StarRating.tsx
components/adventure/WorldMap/WorldProgress.tsx
contexts/ProgressionContext.tsx
hooks/useProgression.ts
translations/en/adventure.js (+ he, sv, ja, es)
```

#### Sprint 3: Adventure Gameplay
```
app/[locale]/adventure/[world]/[level]/page.tsx
components/adventure/GameBoard/AdventureGame.tsx
components/adventure/GameBoard/AdventureBoard.tsx
components/adventure/GameBoard/SpecialTile.tsx
components/adventure/GameBoard/ObjectiveTracker.tsx
components/adventure/GameBoard/CascadeAnimation.tsx
components/adventure/GameBoard/ComboOverlay.tsx
components/adventure/GameBoard/LevelHeader.tsx
components/adventure/GameBoard/MascotCorner.tsx
components/adventure/Results/LevelResults.tsx
components/adventure/Results/StarAnimation.tsx
components/adventure/Results/XPProgress.tsx
hooks/useAdventure.ts
hooks/useSpecialTiles.ts
hooks/useCascade.ts
lib/adventure/objectiveChecker.ts
lib/adventure/xpCalculator.ts
lib/adventure/starCalculator.ts
lib/adventure/tileEffects.ts
```

### Patterns to Follow

**Database Migration Pattern:**
```sql
-- GOOD: Table with proper structure
CREATE TABLE IF NOT EXISTS table_name (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    -- columns
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own data"
    ON table_name FOR SELECT
    USING (auth.uid() = user_id);
```

**API Route Pattern:**
```typescript
// GOOD: Next.js 16 API route
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ... logic

    return NextResponse.json({ data });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Context Provider Pattern:**
```typescript
// GOOD: Context with proper typing
interface ProgressionContextType {
  playerLevel: number;
  xp: number;
  worldProgress: Map<number, LevelCompletion[]>;
  completeLevel: (world: number, level: number, result: LevelResult) => Promise<void>;
  refresh: () => Promise<void>;
}

const ProgressionContext = createContext<ProgressionContextType | null>(null);

export function useProgression() {
  const context = useContext(ProgressionContext);
  if (!context) {
    throw new Error('useProgression must be used within ProgressionProvider');
  }
  return context;
}
```

**Component Pattern (Neo-Brutalist):**
```tsx
// GOOD: Component with neo-brutalist styling
export function LevelNode({ level, stars, isUnlocked, onClick }: LevelNodeProps) {
  return (
    <AdaptiveMotion.button
      className={cn(
        'relative w-20 h-20 rounded-neo',
        'border-neo border-black',
        isUnlocked ? 'bg-neo-yellow' : 'bg-gray-600',
        'shadow-hard hover:shadow-hard-pressed',
        'hover:translate-x-[2px] hover:translate-y-[2px]',
        'transition-all duration-100'
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={!isUnlocked}
    >
      <span className="text-2xl font-neo-display font-bold">{level}</span>
      <StarRating stars={stars} />
    </AdaptiveMotion.button>
  );
}
```

**Hook Pattern:**
```typescript
// GOOD: Hook extending existing functionality
export function useAdventure(levelConfig: LevelConfig) {
  const core = useSinglePlayerGame({
    mode: 'practice',
    difficulty: levelConfig.difficulty,
    language: levelConfig.language,
    grid: levelConfig.grid,
    timerSeconds: levelConfig.timerSeconds,
  });

  const tiles = useSpecialTiles(levelConfig.specialTiles);
  const objectives = useObjectiveTracker(levelConfig.objectives);

  return {
    ...core,
    ...tiles,
    objectives,
    isLevelComplete: objectives.allComplete,
  };
}
```

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation & Database (Sprint 1)

Set up data layer, TypeScript types, and API infrastructure.

**Tasks:**
1. Create Supabase migration for adventure tables
2. Define TypeScript types for Adventure mode
3. Create API routes for progress, completion, and level config
4. Create level configuration data for Worlds 1-3

**Order:** These tasks must be completed first before Phases 2-3.

### Phase 2: World Map UI (Sprint 2)

Build navigable world map screen with level nodes and progression display.

**Tasks:**
1. Create app routes and layout for Adventure mode
2. Build WorldMap component with floating islands style
3. Build LevelNode component (3D letter blocks)
4. Build StarRating and WorldProgress components
5. Create ProgressionContext and useProgression hook
6. Add translations for all 4 languages + RTL
7. Add "Adventure" entry point to SinglePlayerView

**Order:** Depends on Phase 1 completion.

### Phase 3: Adventure Gameplay (Sprint 3)

Implement adventure-specific gameplay with special tiles, objectives, and cascades.

**Tasks:**
1. Create level gameplay page route
2. Build AdventureGame container and AdventureBoard grid
3. Implement SpecialTile variants (Gold, Ice, Bomb)
4. Build ObjectiveTracker and LevelHeader components
5. Implement cascade/chain reaction system
6. Build ComboOverlay for feedback
7. Create LevelResults with stars and XP
8. Create useAdventure, useSpecialTiles, useCascade hooks
9. Implement objective checking and scoring utilities

**Order:** Depends on Phase 2 completion.

---

## STEP-BY-STEP TASKS

**IMPORTANT:** Execute every task in order, top to bottom. Each task follows TDD: write test FIRST (RED), then implement (GREEN), then refactor.

---

### SPRINT 1: FOUNDATION & DATABASE

---

#### Task 1.1: CREATE types/adventure.ts

**IMPLEMENT:** TypeScript interfaces for Adventure mode entities

**TDD - RED Phase (Write test first):**
```typescript
// __tests__/types/adventure.test.ts
import type {
  TileType,
  TileState,
  SpecialTile,
  LevelObjective,
  LevelConfig,
  LevelCompletion,
  PlayerProgression,
  AdventureGameState,
} from '@/types/adventure';

describe('Adventure Types', () => {
  describe('TileType', () => {
    it('should have valid tile type values', () => {
      const validTypes: TileType[] = ['standard', 'gold', 'ice', 'bomb', 'rainbow'];
      expect(validTypes).toHaveLength(5);
    });
  });

  describe('LevelConfig', () => {
    it('should require all mandatory fields', () => {
      const config: LevelConfig = {
        world: 1,
        level: 1,
        gridSize: 5,
        timerSeconds: 90,
        objectives: [{ type: 'wordCount', target: 10 }],
        specialTiles: [],
        difficulty: 'MEDIUM',
      };
      expect(config.world).toBe(1);
      expect(config.objectives).toHaveLength(1);
    });
  });

  describe('LevelCompletion', () => {
    it('should track completion data', () => {
      const completion: LevelCompletion = {
        world: 1,
        level: 1,
        stars: 2,
        bestScore: 450,
        bestWords: 15,
        completedAt: new Date().toISOString(),
      };
      expect(completion.stars).toBeGreaterThanOrEqual(0);
      expect(completion.stars).toBeLessThanOrEqual(3);
    });
  });
});
```

**Run test → FAILS (types don't exist)**

**GREEN Phase - Implement types:**
```typescript
// types/adventure.ts
export type TileType = 'standard' | 'gold' | 'ice' | 'bomb' | 'rainbow';

export interface TileState {
  letter: string;
  type: TileType;
  isCleared: boolean;
  cascadeDelay?: number;
  isFrozen?: boolean; // For ice tiles
}

export interface SpecialTile {
  row: number;
  col: number;
  type: TileType;
}

export type ObjectiveType =
  | 'wordCount'
  | 'scoreTarget'
  | 'clearIce'
  | 'longWords'
  | 'timeBonus'
  | 'collectGems';

export interface LevelObjective {
  type: ObjectiveType;
  target: number;
  current?: number;
  isComplete?: boolean;
  isPrimary?: boolean;
}

export interface LevelConfig {
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

export interface LevelCompletion {
  world: number;
  level: number;
  stars: 0 | 1 | 2 | 3;
  bestScore: number;
  bestWords: number;
  completedAt: string;
}

export interface PlayerProgression {
  userId: string;
  playerLevel: number;
  xp: number;
  currentWorld: number;
  currentLevel: number;
  totalStars: number;
  completions: LevelCompletion[];
  createdAt: string;
  updatedAt: string;
}

export interface AdventureGameState {
  levelConfig: LevelConfig;
  tiles: TileState[][];
  score: number;
  wordsFound: string[];
  objectives: LevelObjective[];
  comboCount: number;
  cascadeActive: boolean;
  isComplete: boolean;
  stars: 0 | 1 | 2 | 3;
}

// World names for i18n
export const WORLD_NAMES = [
  'alphabetMeadows',
  'synonymSprings',
  'rootCaverns',
  'idiomArchipelago',
  'compoundCanyon',
  'anagramLabyrinth',
  'mirrorPalace',
  'neologismNebula',
  'polyglotPeaks',
  'lexiconThrone',
] as const;

export type WorldName = typeof WORLD_NAMES[number];
```

**VALIDATE:** `npm run test -- --testPathPattern="adventure.test"`

---

#### Task 1.2: CREATE supabase/migrations/049_adventure_mode.sql

**IMPLEMENT:** Database tables for adventure progression

**TDD - RED Phase:**
```typescript
// __tests__/migrations/adventure-mode.test.ts
import { createClient } from '@supabase/supabase-js';

// Integration test - run against local Supabase
describe('Adventure Mode Migration', () => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  it('should create player_progression table', async () => {
    const { data, error } = await supabase
      .from('player_progression')
      .select('*')
      .limit(1);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it('should create level_completions table', async () => {
    const { data, error } = await supabase
      .from('level_completions')
      .select('*')
      .limit(1);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it('should enforce unique constraint on level_completions', async () => {
    // This test validates the unique(user_id, world, level) constraint
    // Will be tested with actual insert attempts
  });
});
```

**GREEN Phase - Create migration:**
```sql
-- supabase/migrations/049_adventure_mode.sql
-- =============================================
-- ADVENTURE MODE TABLES
-- Migration: 049_adventure_mode
-- =============================================

-- =============================================
-- PLAYER PROGRESSION TABLE
-- Stores player's adventure progress and XP
-- =============================================
CREATE TABLE IF NOT EXISTS player_progression (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    player_level INT DEFAULT 1 CHECK (player_level >= 1 AND player_level <= 50),
    xp INT DEFAULT 0 CHECK (xp >= 0),
    current_world INT DEFAULT 1 CHECK (current_world >= 1 AND current_world <= 10),
    current_level INT DEFAULT 1 CHECK (current_level >= 1 AND current_level <= 10),
    total_stars INT DEFAULT 0 CHECK (total_stars >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- LEVEL COMPLETIONS TABLE
-- Tracks individual level completions and best scores
-- =============================================
CREATE TABLE IF NOT EXISTS level_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    world INT NOT NULL CHECK (world >= 1 AND world <= 10),
    level INT NOT NULL CHECK (level >= 1 AND level <= 10),
    stars INT DEFAULT 0 CHECK (stars >= 0 AND stars <= 3),
    best_score INT DEFAULT 0 CHECK (best_score >= 0),
    best_words INT DEFAULT 0 CHECK (best_words >= 0),
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, world, level)
);

-- =============================================
-- PERFORMANCE INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_player_progression_level ON player_progression(player_level DESC);
CREATE INDEX IF NOT EXISTS idx_player_progression_xp ON player_progression(xp DESC);
CREATE INDEX IF NOT EXISTS idx_player_progression_stars ON player_progression(total_stars DESC);

CREATE INDEX IF NOT EXISTS idx_level_completions_user ON level_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_level_completions_world_level ON level_completions(world, level);
CREATE INDEX IF NOT EXISTS idx_level_completions_stars ON level_completions(stars DESC);

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================
CREATE TRIGGER update_player_progression_updated_at
    BEFORE UPDATE ON player_progression
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE player_progression ENABLE ROW LEVEL SECURITY;
ALTER TABLE level_completions ENABLE ROW LEVEL SECURITY;

-- Player progression policies
DROP POLICY IF EXISTS "Users can view own progression" ON player_progression;
CREATE POLICY "Users can view own progression"
    ON player_progression FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own progression" ON player_progression;
CREATE POLICY "Users can insert own progression"
    ON player_progression FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own progression" ON player_progression;
CREATE POLICY "Users can update own progression"
    ON player_progression FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Level completions policies
DROP POLICY IF EXISTS "Users can view own completions" ON level_completions;
CREATE POLICY "Users can view own completions"
    ON level_completions FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own completions" ON level_completions;
CREATE POLICY "Users can insert own completions"
    ON level_completions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own completions" ON level_completions;
CREATE POLICY "Users can update own completions"
    ON level_completions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to calculate player level from XP
CREATE OR REPLACE FUNCTION calculate_player_level(total_xp INT)
RETURNS INT AS $$
DECLARE
    level INT := 1;
    xp_required INT := 500;
    cumulative_xp INT := 0;
BEGIN
    WHILE level < 50 AND cumulative_xp + xp_required <= total_xp LOOP
        cumulative_xp := cumulative_xp + xp_required;
        level := level + 1;
        -- XP required increases by 100 per level
        xp_required := 500 + (level - 1) * 100;
    END LOOP;
    RETURN level;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to upsert level completion
CREATE OR REPLACE FUNCTION upsert_level_completion(
    p_user_id UUID,
    p_world INT,
    p_level INT,
    p_stars INT,
    p_score INT,
    p_words INT
)
RETURNS level_completions AS $$
DECLARE
    result level_completions;
BEGIN
    INSERT INTO level_completions (user_id, world, level, stars, best_score, best_words)
    VALUES (p_user_id, p_world, p_level, p_stars, p_score, p_words)
    ON CONFLICT (user_id, world, level)
    DO UPDATE SET
        stars = GREATEST(level_completions.stars, EXCLUDED.stars),
        best_score = GREATEST(level_completions.best_score, EXCLUDED.best_score),
        best_words = GREATEST(level_completions.best_words, EXCLUDED.best_words),
        completed_at = CASE
            WHEN EXCLUDED.stars > level_completions.stars
            OR EXCLUDED.best_score > level_completions.best_score
            THEN NOW()
            ELSE level_completions.completed_at
        END
    RETURNING * INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**VALIDATE:** `npm run db:migrate` then run integration tests

---

#### Task 1.3: CREATE lib/adventure/constants.ts

**IMPLEMENT:** Adventure mode constants and configuration

**TDD - RED Phase:**
```typescript
// __tests__/lib/adventure/constants.test.ts
import {
  WORLDS_COUNT,
  LEVELS_PER_WORLD,
  MAX_PLAYER_LEVEL,
  STARS_TO_UNLOCK_WORLD,
  XP_PER_LEVEL,
  getXpForLevel,
  getWorldUnlockRequirement,
} from '@/lib/adventure/constants';

describe('Adventure Constants', () => {
  it('should have correct world and level counts', () => {
    expect(WORLDS_COUNT).toBe(10);
    expect(LEVELS_PER_WORLD).toBe(10);
    expect(MAX_PLAYER_LEVEL).toBe(50);
  });

  it('should calculate XP requirements correctly', () => {
    expect(getXpForLevel(1)).toBe(0);
    expect(getXpForLevel(2)).toBe(500);
    expect(getXpForLevel(3)).toBe(1100); // 500 + 600
    expect(getXpForLevel(4)).toBe(1800); // 1100 + 700
  });

  it('should calculate world unlock requirements', () => {
    expect(getWorldUnlockRequirement(1)).toBe(0); // World 1 always unlocked
    expect(getWorldUnlockRequirement(2)).toBe(15); // 15 stars in world 1
    expect(getWorldUnlockRequirement(10)).toBe(80); // 80 total stars
  });
});
```

**GREEN Phase:**
```typescript
// lib/adventure/constants.ts
export const WORLDS_COUNT = 10;
export const LEVELS_PER_WORLD = 10;
export const MAX_PLAYER_LEVEL = 50;
export const STARS_TO_UNLOCK_WORLD = 15; // Stars needed in previous world
export const TOTAL_STARS_FOR_FINAL_WORLD = 80;

// XP progression: 500 base + 100 per level
export const BASE_XP_PER_LEVEL = 500;
export const XP_INCREMENT_PER_LEVEL = 100;

// Special tile types
export const TILE_TYPES = {
  STANDARD: 'standard',
  GOLD: 'gold',
  ICE: 'ice',
  BOMB: 'bomb',
  RAINBOW: 'rainbow',
} as const;

// Objective types
export const OBJECTIVE_TYPES = {
  WORD_COUNT: 'wordCount',
  SCORE_TARGET: 'scoreTarget',
  CLEAR_ICE: 'clearIce',
  LONG_WORDS: 'longWords',
  TIME_BONUS: 'timeBonus',
} as const;

// Grid sizes per world
export const GRID_SIZES: Record<number, 4 | 5 | 6 | 7> = {
  1: 4, 2: 5, 3: 5, 4: 5, 5: 5,
  6: 6, 7: 6, 8: 6, 9: 7, 10: 7,
};

// Timer durations per world (seconds)
export const TIMER_DURATIONS: Record<number, number> = {
  1: 90, 2: 90, 3: 75, 4: 75, 5: 60,
  6: 60, 7: 60, 8: 45, 9: 45, 10: 30,
};

/**
 * Calculate cumulative XP required to reach a level
 */
export function getXpForLevel(level: number): number {
  if (level <= 1) return 0;

  let total = 0;
  for (let i = 1; i < level; i++) {
    total += BASE_XP_PER_LEVEL + (i - 1) * XP_INCREMENT_PER_LEVEL;
  }
  return total;
}

/**
 * Calculate player level from total XP
 */
export function getLevelFromXp(xp: number): number {
  let level = 1;
  let cumulative = 0;

  while (level < MAX_PLAYER_LEVEL) {
    const required = BASE_XP_PER_LEVEL + (level - 1) * XP_INCREMENT_PER_LEVEL;
    if (cumulative + required > xp) break;
    cumulative += required;
    level++;
  }

  return level;
}

/**
 * Get stars required to unlock a world
 */
export function getWorldUnlockRequirement(world: number): number {
  if (world === 1) return 0;
  if (world === 10) return TOTAL_STARS_FOR_FINAL_WORLD;
  return STARS_TO_UNLOCK_WORLD * (world - 1);
}

/**
 * Check if a world is unlocked based on total stars
 */
export function isWorldUnlocked(world: number, totalStars: number): boolean {
  return totalStars >= getWorldUnlockRequirement(world);
}

/**
 * Check if a level is unlocked
 */
export function isLevelUnlocked(
  world: number,
  level: number,
  completions: Array<{ world: number; level: number; stars: number }>
): boolean {
  // Level 1 of any unlocked world is always available
  if (level === 1) return true;

  // Need at least 1 star on previous level
  const prevCompletion = completions.find(
    (c) => c.world === world && c.level === level - 1
  );

  return prevCompletion !== undefined && prevCompletion.stars >= 1;
}
```

**VALIDATE:** `npm run test -- --testPathPattern="constants.test"`

---

#### Task 1.4: CREATE lib/adventure/levelConfig.ts

**IMPLEMENT:** Level configuration data for Worlds 1-3 (30 levels)

**TDD - RED Phase:**
```typescript
// __tests__/lib/adventure/levelConfig.test.ts
import {
  getLevelConfig,
  getWorldConfig,
  generateLevelGrid,
  WORLD_CONFIGS,
} from '@/lib/adventure/levelConfig';
import type { LevelConfig } from '@/types/adventure';

describe('Level Configuration', () => {
  describe('getLevelConfig', () => {
    it('should return valid config for world 1, level 1', () => {
      const config = getLevelConfig(1, 1);

      expect(config.world).toBe(1);
      expect(config.level).toBe(1);
      expect(config.gridSize).toBe(4);
      expect(config.timerSeconds).toBe(90);
      expect(config.objectives.length).toBeGreaterThan(0);
      expect(config.difficulty).toBe('EASY');
    });

    it('should increase difficulty for higher levels', () => {
      const level1 = getLevelConfig(1, 1);
      const level5 = getLevelConfig(1, 5);

      expect(level5.objectives.length).toBeGreaterThanOrEqual(level1.objectives.length);
    });

    it('should include special tiles from level 11+', () => {
      const level10 = getLevelConfig(1, 10);
      const level11 = getLevelConfig(2, 1);

      // World 2 introduces special mechanics
      expect(level11.worldMechanic).toBe('synonymPairs');
    });
  });

  describe('getWorldConfig', () => {
    it('should return world metadata', () => {
      const world1 = getWorldConfig(1);

      expect(world1.name).toBe('alphabetMeadows');
      expect(world1.theme).toBeDefined();
      expect(world1.mechanic).toBeNull(); // Tutorial world has no special mechanic
    });

    it('should have unique mechanics per world', () => {
      const mechanics = WORLD_CONFIGS.map((w) => w.mechanic).filter(Boolean);
      const uniqueMechanics = new Set(mechanics);

      expect(uniqueMechanics.size).toBe(mechanics.length);
    });
  });
});
```

**GREEN Phase:**
```typescript
// lib/adventure/levelConfig.ts
import type { LevelConfig, LevelObjective, SpecialTile, TileType } from '@/types/adventure';
import { GRID_SIZES, TIMER_DURATIONS, OBJECTIVE_TYPES } from './constants';

export interface WorldConfig {
  id: number;
  name: string;
  theme: string;
  mechanic: string | null;
  bossName: string;
  colorPrimary: string;
  colorSecondary: string;
}

export const WORLD_CONFIGS: WorldConfig[] = [
  {
    id: 1,
    name: 'alphabetMeadows',
    theme: 'sunny-pastoral',
    mechanic: null, // Tutorial
    bossName: 'msGrammar',
    colorPrimary: 'neo-lime',
    colorSecondary: 'neo-lime-light',
  },
  {
    id: 2,
    name: 'synonymSprings',
    theme: 'waterfalls',
    mechanic: 'synonymPairs',
    bossName: 'spellingBee',
    colorPrimary: 'neo-cyan',
    colorSecondary: 'neo-cyan-light',
  },
  {
    id: 3,
    name: 'rootCaverns',
    theme: 'crystal-caves',
    mechanic: 'etymologyRoots',
    bossName: 'professorThesaurus',
    colorPrimary: 'neo-purple',
    colorSecondary: 'neo-purple-light',
  },
  // ... Add remaining worlds
];

export function getWorldConfig(world: number): WorldConfig {
  const config = WORLD_CONFIGS[world - 1];
  if (!config) {
    throw new Error(`Invalid world: ${world}`);
  }
  return config;
}

/**
 * Generate level configuration based on world and level number
 */
export function getLevelConfig(world: number, level: number): LevelConfig {
  const worldConfig = getWorldConfig(world);
  const globalLevel = (world - 1) * 10 + level;

  // Base configuration
  const config: LevelConfig = {
    world,
    level,
    gridSize: GRID_SIZES[world] || 5,
    timerSeconds: TIMER_DURATIONS[world] || 60,
    objectives: generateObjectives(world, level),
    specialTiles: generateSpecialTiles(world, level),
    difficulty: getDifficulty(world, level),
    worldMechanic: worldConfig.mechanic || undefined,
  };

  // Add hidden word for bonus stars on some levels
  if (level === 5 || level === 10) {
    config.hiddenWord = getHiddenWordForLevel(world, level);
  }

  return config;
}

function generateObjectives(world: number, level: number): LevelObjective[] {
  const objectives: LevelObjective[] = [];
  const globalLevel = (world - 1) * 10 + level;

  // Primary objective: Always word count or score
  if (level % 2 === 1) {
    // Odd levels: word count
    const target = Math.min(8 + Math.floor(globalLevel / 5) * 2, 25);
    objectives.push({
      type: OBJECTIVE_TYPES.WORD_COUNT,
      target,
      isPrimary: true,
    });
  } else {
    // Even levels: score target
    const target = Math.min(200 + globalLevel * 30, 1000);
    objectives.push({
      type: OBJECTIVE_TYPES.SCORE_TARGET,
      target,
      isPrimary: true,
    });
  }

  // Secondary objectives (increase with level)
  if (level >= 3) {
    objectives.push({
      type: OBJECTIVE_TYPES.LONG_WORDS,
      target: Math.min(1 + Math.floor(level / 3), 5),
      isPrimary: false,
    });
  }

  if (level >= 5 && world >= 2) {
    objectives.push({
      type: OBJECTIVE_TYPES.CLEAR_ICE,
      target: Math.min(2 + Math.floor(level / 2), 10),
      isPrimary: false,
    });
  }

  return objectives;
}

function generateSpecialTiles(world: number, level: number): SpecialTile[] {
  const tiles: SpecialTile[] = [];
  const gridSize = GRID_SIZES[world] || 5;

  // World 1: No special tiles (tutorial)
  if (world === 1 && level < 8) {
    return tiles;
  }

  // Gold tiles appear from world 1, level 8+
  if (world >= 1 && level >= 8) {
    const goldCount = Math.min(1 + Math.floor(level / 5), 3);
    for (let i = 0; i < goldCount; i++) {
      tiles.push({
        row: Math.floor(Math.random() * gridSize),
        col: Math.floor(Math.random() * gridSize),
        type: 'gold',
      });
    }
  }

  // Ice tiles appear from world 2+
  if (world >= 2) {
    const iceCount = Math.min(2 + Math.floor(level / 3), 8);
    for (let i = 0; i < iceCount; i++) {
      tiles.push({
        row: Math.floor(Math.random() * gridSize),
        col: Math.floor(Math.random() * gridSize),
        type: 'ice',
      });
    }
  }

  // Bomb tiles appear from world 3+
  if (world >= 3 && level >= 3) {
    tiles.push({
      row: Math.floor(Math.random() * gridSize),
      col: Math.floor(Math.random() * gridSize),
      type: 'bomb',
    });
  }

  return tiles;
}

function getDifficulty(world: number, level: number): 'EASY' | 'MEDIUM' | 'HARD' {
  if (world <= 2) return 'EASY';
  if (world <= 5) return 'MEDIUM';
  return 'HARD';
}

function getHiddenWordForLevel(world: number, level: number): string {
  // Predefined hidden words for bonus stars
  const hiddenWords: Record<string, string> = {
    '1-5': 'MAGIC',
    '1-10': 'ADVENTURE',
    '2-5': 'CRYSTAL',
    '2-10': 'LANGUAGE',
    '3-5': 'ANCIENT',
    '3-10': 'KNOWLEDGE',
  };
  return hiddenWords[`${world}-${level}`] || 'SECRET';
}

/**
 * Get all level configs for a world
 */
export function getWorldLevels(world: number): LevelConfig[] {
  return Array.from({ length: 10 }, (_, i) => getLevelConfig(world, i + 1));
}
```

**VALIDATE:** `npm run test -- --testPathPattern="levelConfig.test"`

---

#### Task 1.5: CREATE app/api/adventure/progress/route.ts

**IMPLEMENT:** API route to fetch player progression

**TDD - RED Phase:**
```typescript
// __tests__/app/api/adventure/progress.test.ts
import { GET } from '@/app/api/adventure/progress/route';
import { NextRequest } from 'next/server';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: {
              user_id: 'test-user-id',
              player_level: 5,
              xp: 2500,
              current_world: 2,
              current_level: 3,
              total_stars: 25,
            },
            error: null,
          })),
        })),
      })),
    })),
  })),
}));

describe('GET /api/adventure/progress', () => {
  it('should return 401 without auth', async () => {
    const request = new NextRequest('http://localhost:3000/api/adventure/progress');
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('should return progression data for authenticated user', async () => {
    const request = new NextRequest('http://localhost:3000/api/adventure/progress', {
      headers: {
        Authorization: 'Bearer test-token',
      },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.progression).toBeDefined();
    expect(data.progression.playerLevel).toBe(5);
    expect(data.completions).toBeDefined();
  });
});
```

**GREEN Phase:**
```typescript
// app/api/adventure/progress/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { PlayerProgression, LevelCompletion } from '@/types/adventure';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get user ID from auth header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);

    // Verify token and get user
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData.user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = userData.user.id;

    // Fetch or create progression
    let { data: progression, error: progressError } = await supabase
      .from('player_progression')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (progressError?.code === 'PGRST116') {
      // No progression found, create new one
      const { data: newProgression, error: insertError } = await supabase
        .from('player_progression')
        .insert({ user_id: userId })
        .select()
        .single();

      if (insertError) {
        console.error('Failed to create progression:', insertError);
        return NextResponse.json({ error: 'Failed to create progression' }, { status: 500 });
      }
      progression = newProgression;
    } else if (progressError) {
      console.error('Failed to fetch progression:', progressError);
      return NextResponse.json({ error: 'Failed to fetch progression' }, { status: 500 });
    }

    // Fetch level completions
    const { data: completions, error: completionsError } = await supabase
      .from('level_completions')
      .select('*')
      .eq('user_id', userId)
      .order('world', { ascending: true })
      .order('level', { ascending: true });

    if (completionsError) {
      console.error('Failed to fetch completions:', completionsError);
      return NextResponse.json({ error: 'Failed to fetch completions' }, { status: 500 });
    }

    // Transform to camelCase
    const response = {
      progression: {
        userId: progression.user_id,
        playerLevel: progression.player_level,
        xp: progression.xp,
        currentWorld: progression.current_world,
        currentLevel: progression.current_level,
        totalStars: progression.total_stars,
        createdAt: progression.created_at,
        updatedAt: progression.updated_at,
      },
      completions: completions.map((c: Record<string, unknown>) => ({
        world: c.world,
        level: c.level,
        stars: c.stars,
        bestScore: c.best_score,
        bestWords: c.best_words,
        completedAt: c.completed_at,
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Adventure progress API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**VALIDATE:** `npm run test -- --testPathPattern="progress.test"`

---

#### Task 1.6: CREATE app/api/adventure/complete/route.ts

**IMPLEMENT:** API route to submit level completion

**TDD - RED Phase:**
```typescript
// __tests__/app/api/adventure/complete.test.ts
import { POST } from '@/app/api/adventure/complete/route';
import { NextRequest } from 'next/server';

describe('POST /api/adventure/complete', () => {
  it('should update progression and completions', async () => {
    const request = new NextRequest('http://localhost:3000/api/adventure/complete', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        world: 1,
        level: 1,
        stars: 2,
        score: 450,
        wordsFound: 15,
        xpEarned: 125,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.completion).toBeDefined();
    expect(data.progression).toBeDefined();
    expect(data.leveledUp).toBeDefined();
  });

  it('should reject invalid data', async () => {
    const request = new NextRequest('http://localhost:3000/api/adventure/complete', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        world: 1,
        level: 1,
        stars: 5, // Invalid: max is 3
        score: -100, // Invalid: negative
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
```

**GREEN Phase:**
```typescript
// app/api/adventure/complete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { getLevelFromXp } from '@/lib/adventure/constants';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CompleteRequestSchema = z.object({
  world: z.number().int().min(1).max(10),
  level: z.number().int().min(1).max(10),
  stars: z.number().int().min(0).max(3),
  score: z.number().int().min(0),
  wordsFound: z.number().int().min(0),
  xpEarned: z.number().int().min(0),
});

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData.user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = userData.user.id;

    // Validate request body
    const body = await request.json();
    const validation = CompleteRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { world, level, stars, score, wordsFound, xpEarned } = validation.data;

    // Upsert level completion
    const { data: completion, error: completionError } = await supabase.rpc(
      'upsert_level_completion',
      {
        p_user_id: userId,
        p_world: world,
        p_level: level,
        p_stars: stars,
        p_score: score,
        p_words: wordsFound,
      }
    );

    if (completionError) {
      console.error('Failed to upsert completion:', completionError);
      return NextResponse.json({ error: 'Failed to save completion' }, { status: 500 });
    }

    // Update progression
    const { data: currentProgression } = await supabase
      .from('player_progression')
      .select('*')
      .eq('user_id', userId)
      .single();

    const newXp = (currentProgression?.xp || 0) + xpEarned;
    const newLevel = getLevelFromXp(newXp);
    const leveledUp = newLevel > (currentProgression?.player_level || 1);

    // Calculate new total stars
    const { data: allCompletions } = await supabase
      .from('level_completions')
      .select('stars')
      .eq('user_id', userId);

    const totalStars = allCompletions?.reduce((sum, c) => sum + c.stars, 0) || 0;

    // Determine new current position
    let newCurrentWorld = world;
    let newCurrentLevel = level + 1;

    if (newCurrentLevel > 10) {
      newCurrentWorld = world + 1;
      newCurrentLevel = 1;
    }

    // Clamp to max values
    if (newCurrentWorld > 10) {
      newCurrentWorld = 10;
      newCurrentLevel = 10;
    }

    // Update progression
    const { data: progression, error: progressionError } = await supabase
      .from('player_progression')
      .upsert({
        user_id: userId,
        player_level: newLevel,
        xp: newXp,
        current_world: Math.max(currentProgression?.current_world || 1, newCurrentWorld),
        current_level: newCurrentLevel,
        total_stars: totalStars,
      })
      .select()
      .single();

    if (progressionError) {
      console.error('Failed to update progression:', progressionError);
      return NextResponse.json({ error: 'Failed to update progression' }, { status: 500 });
    }

    return NextResponse.json({
      completion: {
        world: completion.world,
        level: completion.level,
        stars: completion.stars,
        bestScore: completion.best_score,
        bestWords: completion.best_words,
      },
      progression: {
        playerLevel: progression.player_level,
        xp: progression.xp,
        currentWorld: progression.current_world,
        currentLevel: progression.current_level,
        totalStars: progression.total_stars,
      },
      leveledUp,
      xpEarned,
    });
  } catch (error) {
    console.error('Adventure complete API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**VALIDATE:** `npm run test -- --testPathPattern="complete.test"`

---

### SPRINT 2: WORLD MAP UI

---

#### Task 2.1: CREATE app/[locale]/adventure/layout.tsx

**IMPLEMENT:** Adventure mode layout with header

**TDD - RED Phase:**
```typescript
// __tests__/app/adventure/layout.test.tsx
import { render, screen } from '@testing-library/react';
import AdventureLayout from '@/app/[locale]/adventure/layout';

// Mock providers
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

describe('AdventureLayout', () => {
  it('should render children', () => {
    render(
      <AdventureLayout>
        <div data-testid="child">Child content</div>
      </AdventureLayout>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('should have adventure-specific styling', () => {
    const { container } = render(
      <AdventureLayout>
        <div>Content</div>
      </AdventureLayout>
    );

    expect(container.firstChild).toHaveClass('min-h-screen');
  });
});
```

**GREEN Phase:**
```tsx
// app/[locale]/adventure/layout.tsx
import { ReactNode } from 'react';
import { ProgressionProvider } from '@/contexts/ProgressionContext';

interface AdventureLayoutProps {
  children: ReactNode;
}

export default function AdventureLayout({ children }: AdventureLayoutProps) {
  return (
    <ProgressionProvider>
      <div className="min-h-screen bg-neo-navy">
        {children}
      </div>
    </ProgressionProvider>
  );
}
```

**VALIDATE:** `npm run test -- --testPathPattern="layout.test"`

---

#### Task 2.2: CREATE contexts/ProgressionContext.tsx

**IMPLEMENT:** Context provider for adventure progression state

**TDD - RED Phase:**
```typescript
// __tests__/contexts/ProgressionContext.test.tsx
import { render, screen, waitFor, act } from '@testing-library/react';
import { ProgressionProvider, useProgression } from '@/contexts/ProgressionContext';

// Test component
function TestComponent() {
  const { playerLevel, xp, totalStars, isLoading } = useProgression();
  return (
    <div>
      <span data-testid="level">{playerLevel}</span>
      <span data-testid="xp">{xp}</span>
      <span data-testid="stars">{totalStars}</span>
      <span data-testid="loading">{isLoading ? 'loading' : 'ready'}</span>
    </div>
  );
}

describe('ProgressionContext', () => {
  it('should provide default values', async () => {
    render(
      <ProgressionProvider>
        <TestComponent />
      </ProgressionProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    });

    expect(screen.getByTestId('level')).toHaveTextContent('1');
  });

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() => render(<TestComponent />)).toThrow(
      'useProgression must be used within ProgressionProvider'
    );

    consoleSpy.mockRestore();
  });
});
```

**GREEN Phase:**
```tsx
// contexts/ProgressionContext.tsx
'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import type { PlayerProgression, LevelCompletion } from '@/types/adventure';
import { useAuth } from '@/contexts/AuthContext';

interface ProgressionContextType {
  // State
  playerLevel: number;
  xp: number;
  currentWorld: number;
  currentLevel: number;
  totalStars: number;
  completions: LevelCompletion[];
  isLoading: boolean;
  error: string | null;

  // Actions
  completeLevel: (
    world: number,
    level: number,
    stars: number,
    score: number,
    wordsFound: number,
    xpEarned: number
  ) => Promise<{ leveledUp: boolean; newLevel: number }>;
  refresh: () => Promise<void>;
  getCompletionForLevel: (world: number, level: number) => LevelCompletion | null;
  getStarsForWorld: (world: number) => number;
}

const ProgressionContext = createContext<ProgressionContextType | null>(null);

export function useProgression() {
  const context = useContext(ProgressionContext);
  if (!context) {
    throw new Error('useProgression must be used within ProgressionProvider');
  }
  return context;
}

interface ProgressionProviderProps {
  children: ReactNode;
}

export function ProgressionProvider({ children }: ProgressionProviderProps) {
  const { user, session } = useAuth();

  const [playerLevel, setPlayerLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [currentWorld, setCurrentWorld] = useState(1);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [totalStars, setTotalStars] = useState(0);
  const [completions, setCompletions] = useState<LevelCompletion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProgression = useCallback(async () => {
    if (!session?.access_token) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/adventure/progress', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch progression');
      }

      const data = await response.json();

      setPlayerLevel(data.progression.playerLevel);
      setXp(data.progression.xp);
      setCurrentWorld(data.progression.currentWorld);
      setCurrentLevel(data.progression.currentLevel);
      setTotalStars(data.progression.totalStars);
      setCompletions(data.completions);
    } catch (err) {
      console.error('Failed to fetch progression:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    fetchProgression();
  }, [fetchProgression]);

  const completeLevel = useCallback(
    async (
      world: number,
      level: number,
      stars: number,
      score: number,
      wordsFound: number,
      xpEarned: number
    ) => {
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/adventure/complete', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          world,
          level,
          stars,
          score,
          wordsFound,
          xpEarned,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete level');
      }

      const data = await response.json();

      // Update local state
      setPlayerLevel(data.progression.playerLevel);
      setXp(data.progression.xp);
      setCurrentWorld(data.progression.currentWorld);
      setCurrentLevel(data.progression.currentLevel);
      setTotalStars(data.progression.totalStars);

      // Update completions
      const existingIndex = completions.findIndex(
        (c) => c.world === world && c.level === level
      );

      if (existingIndex >= 0) {
        const newCompletions = [...completions];
        newCompletions[existingIndex] = data.completion;
        setCompletions(newCompletions);
      } else {
        setCompletions([...completions, data.completion]);
      }

      return {
        leveledUp: data.leveledUp,
        newLevel: data.progression.playerLevel,
      };
    },
    [session?.access_token, completions]
  );

  const getCompletionForLevel = useCallback(
    (world: number, level: number): LevelCompletion | null => {
      return completions.find((c) => c.world === world && c.level === level) || null;
    },
    [completions]
  );

  const getStarsForWorld = useCallback(
    (world: number): number => {
      return completions
        .filter((c) => c.world === world)
        .reduce((sum, c) => sum + c.stars, 0);
    },
    [completions]
  );

  const value: ProgressionContextType = {
    playerLevel,
    xp,
    currentWorld,
    currentLevel,
    totalStars,
    completions,
    isLoading,
    error,
    completeLevel,
    refresh: fetchProgression,
    getCompletionForLevel,
    getStarsForWorld,
  };

  return (
    <ProgressionContext.Provider value={value}>
      {children}
    </ProgressionContext.Provider>
  );
}
```

**VALIDATE:** `npm run test -- --testPathPattern="ProgressionContext.test"`

---

#### Task 2.3: CREATE components/adventure/WorldMap/WorldMap.tsx

**IMPLEMENT:** Main world map component with floating islands style

**TDD - RED Phase:**
```typescript
// __tests__/components/adventure/WorldMap/WorldMap.test.tsx
import { render, screen } from '@testing-library/react';
import { WorldMap } from '@/components/adventure/WorldMap/WorldMap';

// Mock dependencies
jest.mock('@/contexts/ProgressionContext', () => ({
  useProgression: () => ({
    totalStars: 25,
    currentWorld: 2,
    currentLevel: 5,
    completions: [
      { world: 1, level: 1, stars: 3 },
      { world: 1, level: 2, stars: 2 },
    ],
    getStarsForWorld: (w: number) => (w === 1 ? 5 : 0),
    getCompletionForLevel: () => null,
  }),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

describe('WorldMap', () => {
  it('should render world title', () => {
    render(<WorldMap />);
    expect(screen.getByText('adventure.title')).toBeInTheDocument();
  });

  it('should display total stars', () => {
    render(<WorldMap />);
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('should render all 10 worlds', () => {
    render(<WorldMap />);
    // Each world has a name
    expect(screen.getAllByRole('button')).toHaveLength(10);
  });

  it('should show current world as highlighted', () => {
    render(<WorldMap />);
    // World 2 should have current indicator
    const currentWorld = screen.getByTestId('world-2');
    expect(currentWorld).toHaveAttribute('data-current', 'true');
  });
});
```

**GREEN Phase:**
```tsx
// components/adventure/WorldMap/WorldMap.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { useProgression } from '@/contexts/ProgressionContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LevelNode } from './LevelNode';
import { StarRating } from './StarRating';
import { WorldProgress } from './WorldProgress';
import { WORLD_CONFIGS, getWorldConfig } from '@/lib/adventure/levelConfig';
import { isWorldUnlocked, isLevelUnlocked, LEVELS_PER_WORLD } from '@/lib/adventure/constants';
import { cn } from '@/lib/utils';

export function WorldMap() {
  const router = useRouter();
  const { t, language, dir } = useLanguage();
  const {
    totalStars,
    currentWorld,
    currentLevel,
    completions,
    getStarsForWorld,
    getCompletionForLevel,
  } = useProgression();

  const [selectedWorld, setSelectedWorld] = useState(currentWorld);

  const handleLevelClick = (world: number, level: number) => {
    router.push(`/${language}/adventure/${world}/${level}`);
  };

  const worldConfig = getWorldConfig(selectedWorld);
  const worldStars = getStarsForWorld(selectedWorld);
  const isCurrentWorldUnlocked = isWorldUnlocked(selectedWorld, totalStars);

  return (
    <div className="min-h-screen bg-neo-navy p-4">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <AdaptiveMotion.h1
          className="text-3xl font-neo-display font-bold text-neo-white"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {t('adventure.title')}
        </AdaptiveMotion.h1>

        <div className="flex items-center gap-2 bg-neo-navy-light px-4 py-2 rounded-neo border-neo border-black shadow-hard">
          <span className="text-neo-yellow text-xl">⭐</span>
          <span className="text-neo-white font-bold text-xl">{totalStars}</span>
        </div>
      </header>

      {/* World Selector - Floating Islands */}
      <div className="relative mb-8 overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {WORLD_CONFIGS.map((world, index) => {
            const worldNum = index + 1;
            const unlocked = isWorldUnlocked(worldNum, totalStars);
            const isCurrent = worldNum === currentWorld;
            const stars = getStarsForWorld(worldNum);

            return (
              <AdaptiveMotion.button
                key={world.id}
                data-testid={`world-${worldNum}`}
                data-current={isCurrent}
                className={cn(
                  'relative flex flex-col items-center p-4 rounded-neo border-neo border-black',
                  'min-w-[120px] transition-all duration-200',
                  unlocked
                    ? `bg-${world.colorPrimary} shadow-hard hover:shadow-hard-pressed hover:translate-x-[2px] hover:translate-y-[2px]`
                    : 'bg-gray-700 opacity-60 cursor-not-allowed',
                  isCurrent && 'ring-4 ring-neo-yellow',
                  selectedWorld === worldNum && 'scale-105'
                )}
                onClick={() => unlocked && setSelectedWorld(worldNum)}
                disabled={!unlocked}
                whileHover={unlocked ? { scale: 1.05 } : undefined}
                whileTap={unlocked ? { scale: 0.95 } : undefined}
              >
                {!unlocked && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl">🔒</span>
                  </div>
                )}

                <span className="text-lg font-bold text-neo-black mb-1">
                  {worldNum}
                </span>
                <span className="text-xs text-neo-black text-center truncate max-w-full">
                  {t(`adventure.worlds.${world.name}`)}
                </span>

                {unlocked && (
                  <div className="flex gap-0.5 mt-2">
                    <StarRating stars={Math.min(stars, 30)} maxStars={30} size="xs" />
                  </div>
                )}
              </AdaptiveMotion.button>
            );
          })}
        </div>
      </div>

      {/* Selected World Details */}
      <AdaptiveMotion.div
        key={selectedWorld}
        className="bg-neo-navy-light p-6 rounded-neo border-neo border-black shadow-hard-lg"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-neo-display font-bold text-neo-white">
            {t(`adventure.worlds.${worldConfig.name}`)}
          </h2>
          <span className="text-neo-yellow">
            ⭐ {worldStars}/30
          </span>
        </div>

        {worldConfig.mechanic && (
          <p className="text-neo-gray mb-4">
            {t(`adventure.mechanics.${worldConfig.mechanic}`)}
          </p>
        )}

        {/* Level Grid */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          {Array.from({ length: LEVELS_PER_WORLD }, (_, i) => {
            const levelNum = i + 1;
            const completion = getCompletionForLevel(selectedWorld, levelNum);
            const unlocked = isCurrentWorldUnlocked && isLevelUnlocked(
              selectedWorld,
              levelNum,
              completions.map((c) => ({ world: c.world, level: c.level, stars: c.stars }))
            );
            const isCurrent = selectedWorld === currentWorld && levelNum === currentLevel;

            return (
              <LevelNode
                key={levelNum}
                world={selectedWorld}
                level={levelNum}
                stars={completion?.stars || 0}
                isUnlocked={unlocked}
                isCurrent={isCurrent}
                onClick={() => handleLevelClick(selectedWorld, levelNum)}
              />
            );
          })}
        </div>

        {/* Play Button */}
        {isCurrentWorldUnlocked && (
          <AdaptiveMotion.button
            className={cn(
              'w-full py-4 rounded-neo border-neo border-black',
              'bg-neo-lime text-neo-black font-bold text-lg',
              'shadow-hard hover:shadow-hard-pressed',
              'hover:translate-x-[2px] hover:translate-y-[2px]',
              'transition-all duration-100'
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleLevelClick(selectedWorld, currentLevel)}
          >
            {t('adventure.play')} - {t(`adventure.worlds.${worldConfig.name}`)} {currentLevel}
          </AdaptiveMotion.button>
        )}
      </AdaptiveMotion.div>

      {/* Progress Bar */}
      <WorldProgress
        currentWorld={currentWorld}
        currentLevel={currentLevel}
        totalStars={totalStars}
      />
    </div>
  );
}
```

**VALIDATE:** `npm run test -- --testPathPattern="WorldMap.test"`

---

*[Additional tasks for Sprint 2 and Sprint 3 continue in the same pattern...]*

---

## TESTING STRATEGY

### Unit Tests

**Scope and Requirements:**
- Test all utility functions (xpCalculator, starCalculator, objectiveChecker)
- Test all hooks (useProgression, useAdventure, useSpecialTiles)
- Test React components with React Testing Library
- Mock Supabase and API calls

**Pattern (Given-When-Then):**
```typescript
describe('calculateXpEarned', () => {
  it('should calculate base XP from words and score', () => {
    // GIVEN
    const wordsFound = 15;
    const score = 420;
    const stars = 2;
    const world = 1;
    const isFirstCompletion = true;

    // WHEN
    const result = calculateXpEarned({
      wordsFound,
      score,
      stars,
      world,
      isFirstCompletion,
    });

    // THEN
    expect(result).toBeGreaterThan(0);
    expect(result).toBe(expectedValue); // Calculate expected
  });
});
```

### Integration Tests

**Scope:**
- API routes with mocked Supabase
- Context providers with mocked API
- Full page renders with all providers

### E2E Tests (Sprint 6)

**Scope:**
- Complete user flow: Map → Level → Play → Results → Next Level
- Progression persistence
- Special tile interactions

---

## VALIDATION COMMANDS

### Level 1: TypeScript Compilation
```bash
cd fe-next && npm run build
```
**Expected:** Build succeeds with no TypeScript errors

### Level 2: Unit Tests
```bash
cd fe-next && npm run test -- --testPathPattern="adventure"
```
**Expected:** All adventure-related tests pass

### Level 3: Lint Check
```bash
cd fe-next && npm run lint
```
**Expected:** No linting errors

### Level 4: Database Migration
```bash
cd fe-next && npm run db:migrate
```
**Expected:** Migration applies successfully

### Level 5: Manual Testing
```bash
# Start dev server
cd fe-next && npm run dev

# Navigate to /en/adventure
# Verify world map loads
# Click level 1
# Play through level
# Verify results and XP
```

---

## ACCEPTANCE CRITERIA

- [ ] Database tables created with proper RLS policies
- [ ] TypeScript types defined for all adventure entities
- [ ] API routes functional for progress and completion
- [ ] World map renders with all 10 worlds
- [ ] Level nodes display stars and lock states correctly
- [ ] Clicking unlocked level navigates to gameplay
- [ ] Adventure gameplay works with special tiles
- [ ] Objectives track and display correctly
- [ ] Level results show stars, XP, and progression
- [ ] All 4 languages have translations (EN, HE, SV, JA)
- [ ] RTL (Hebrew) displays correctly
- [ ] Unit test coverage >= 80%
- [ ] All validation commands pass

---

## COMPLETION CHECKLIST

- [ ] All Sprint 1 tasks completed and tests passing
- [ ] All Sprint 2 tasks completed and tests passing
- [ ] All Sprint 3 tasks completed and tests passing
- [ ] Database migration applied to local and staging
- [ ] Full test suite passes (`npm run test`)
- [ ] Lint check passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual testing completed on web and mobile
- [ ] RTL testing completed for Hebrew
- [ ] Code reviewed for quality and patterns

---

## NOTES

### Design Rationale

**Why Hybrid A+B (Word Realms + Guild)?**
- Levels provide clear goals (Wordscapes model)
- XP/unlocks add personalization depth (RPG engagement)
- Proven to increase LTV in mobile games

**Why Special Tiles?**
- Candy Crush cascade mechanic is extremely satisfying
- Creates strategic depth beyond word finding
- Visual variety keeps gameplay fresh

**Why 3 Sprints Before Bosses?**
- Reduces MVP scope to ~4 weeks
- Core loop (map → play → progress) is testable earlier
- Bosses can be added in Sprint 4 without blocking

### Future Considerations

**Sprint 4: Boss Battles**
- HP-based combat with word damage
- Unique boss mechanics per world
- Special rewards (Lexicon fragments)

**Sprint 5: Progression System**
- Class selection (Lexicographer, Speed Scribe, etc.)
- Skill trees (deferred to Phase 2)
- Prestige system

**Sprint 6: Polish & Beta**
- Animations and haptics
- Sound effects
- Beta feature flag
- E2E testing

### Known Limitations

- No offline play in MVP (requires internet for API)
- No social features (leaderboards, sharing)
- Limited to Worlds 1-3 in MVP (30 levels)
- No boss battles until Sprint 4
