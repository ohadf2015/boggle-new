# Feature: Adventure Mode Sprint 2 - State Management & Data Integration

**IMPORTANT:** Before implementing, validate documentation and codebase patterns. Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

Implement the global state management layer for Adventure Mode. This includes a ProgressionContext for managing player progression state, custom hooks for data fetching and level management, and connecting existing UI components (WorldMap, LevelGrid) to real API data instead of mock data.

## User Story

As a **player**
I want to **have my adventure progress saved and loaded automatically**
So that **I can continue from where I left off and see my stars and XP reflected in the UI**

## Problem Statement

Currently, the Adventure Mode has:
- Complete types (`types/adventure.ts`)
- Complete constants and level configs (`lib/adventure/`)
- Working API routes (`/api/adventure/progress` and `/api/adventure/complete`)
- UI components (`WorldMap`, `LevelGrid`) that use MOCK DATA

What's MISSING:
- ProgressionContext for global state management
- Custom hooks to fetch and manage progression data
- Integration between UI components and real API
- Loading states and error handling for data fetching

## Solution Statement

Create a comprehensive state management layer:
1. `contexts/ProgressionContext.tsx` - Global state provider for adventure progression
2. `hooks/useAdventureProgress.ts` - Hook for fetching/updating progression
3. `hooks/useAdventureLevel.ts` - Hook for level configuration and completion
4. Update `WorldMap` and `LevelGrid` to use real data via context

## Feature Metadata

**Feature Type:** Enhancement (State Management)
**Estimated Complexity:** Medium-High
**Primary Systems Affected:** Contexts, Hooks, Adventure Components
**Dependencies:**
- `types/adventure.ts` (COMPLETE)
- `lib/adventure/constants.ts` (COMPLETE)
- `lib/adventure/levelConfig.ts` (COMPLETE)
- `app/api/adventure/*` (COMPLETE)

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
  - **KEY TYPES:** `PlayerProgression`, `LevelCompletion`, `LevelConfig`, `AdventureGameState`

#### Adventure Constants & Level Config
- `lib/adventure/constants.ts`
  - **WHY:** XP calculations, unlock functions, star requirements
  - **KEY EXPORTS:** `getXpForLevel`, `getLevelFromXp`, `isWorldUnlocked`, `isLevelUnlocked`
- `lib/adventure/levelConfig.ts`
  - **WHY:** Level configuration generators
  - **KEY EXPORTS:** `getLevelConfig`, `getWorldConfig`, `WORLD_CONFIGS`

#### Existing API Routes
- `app/api/adventure/progress/route.ts` (lines 1-191)
  - **WHY:** GET/POST endpoints for progression data
  - **PATTERN:** Returns `PlayerProgression` type with completions
- `app/api/adventure/complete/route.ts`
  - **WHY:** POST endpoint for level completion
  - **PATTERN:** Returns updated progression with XP and stars

#### Existing Context Patterns
- `contexts/AuthContext.tsx`
  - **WHY:** Reference for context structure pattern in this project
  - **PATTERN:** Provider + useContext hook + state management
- `contexts/CoinContext.tsx`
  - **WHY:** Example of data-fetching context pattern
  - **PATTERN:** Fetch on mount + loading state + error handling

#### Existing Adventure Components (Need Real Data)
- `components/adventure/WorldMap.tsx` (lines 405-713)
  - **WHY:** Currently takes `totalStars`, `completions`, `onWorldSelect` as props
  - **INTEGRATION:** Will get data from ProgressionContext
- `components/adventure/LevelGrid.tsx`
  - **WHY:** Shows levels within a world
  - **INTEGRATION:** Will get level unlock status from context

### New Files to Create

```
contexts/ProgressionContext.tsx           # Global progression state provider
hooks/useAdventureProgress.ts            # Progression data hook
hooks/useAdventureLevel.ts               # Level config & completion hook
contexts/__tests__/ProgressionContext.test.tsx
hooks/__tests__/useAdventureProgress.test.ts
hooks/__tests__/useAdventureLevel.test.ts
```

### Patterns to Follow

**Context Pattern (from existing codebase):**
```typescript
// ✅ GOOD: Context with separate hook export
interface ProgressionContextType {
  progression: PlayerProgression | null;
  isLoading: boolean;
  error: Error | null;
  refreshProgression: () => Promise<void>;
  completeLevel: (world: number, level: number, stars: 0|1|2|3, score: number, words: number) => Promise<void>;
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

**Hook Pattern (from existing codebase):**
```typescript
// ✅ GOOD: Custom hook with loading/error states
export function useAdventureProgress(userId: string | null) {
  const [data, setData] = useState<PlayerProgression | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    // Fetch logic...
  }, [userId]);

  return { data, isLoading, error, refetch };
}
```

**Test Pattern (Given-When-Then):**
```typescript
describe('ProgressionContext', () => {
  it('should load progression on mount', async () => {
    // GIVEN
    const mockProgression = createMockProgression();
    mockFetch(mockProgression);

    // WHEN
    const { result } = renderHook(() => useProgression(), {
      wrapper: ProgressionProvider,
    });

    // THEN
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.progression).toEqual(mockProgression);
    });
  });
});
```

---

## IMPLEMENTATION PLAN

### Phase 1: ProgressionContext Foundation

Create the global context for adventure progression state management.

**Tasks:**
1. Create test file with context tests (RED)
2. Create ProgressionContext with provider (GREEN)
3. Implement loading states and error handling
4. Add level completion function

### Phase 2: Custom Hooks

Create reusable hooks for adventure functionality.

**Tasks:**
1. Create useAdventureProgress hook with tests
2. Create useAdventureLevel hook with tests
3. Ensure proper memoization and optimization

### Phase 3: Component Integration

Connect existing components to real data.

**Tasks:**
1. Update AdventureView to use ProgressionContext
2. Ensure WorldMap receives real data
3. Update LevelGrid for proper unlock status

---

## STEP-BY-STEP TASKS

**IMPORTANT:** Execute every task in order, top to bottom. Each task follows TDD: write test FIRST (RED), then implement (GREEN), then refactor.

---

### Task 1: CREATE contexts/__tests__/ProgressionContext.test.tsx

- **IMPLEMENT:** Test suite for ProgressionContext
- **PATTERN:** Given-When-Then structure from `.claude/rules/20-testing.md`
- **TDD:** RED phase - tests MUST fail before implementation

```typescript
/**
 * ProgressionContext Tests
 *
 * Tests for adventure progression global state management
 * Following TDD: Write tests FIRST, then implement
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import {
  ProgressionProvider,
  useProgression,
} from '../ProgressionContext';
import type { PlayerProgression, LevelCompletion } from '@/types/adventure';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-123' },
    isLoading: false,
  }),
}));

// Test data factory
function createMockProgression(overrides?: Partial<PlayerProgression>): PlayerProgression {
  return {
    userId: 'test-user-123',
    playerLevel: 5,
    xp: 2500,
    currentWorld: 2,
    currentLevel: 3,
    totalStars: 25,
    completions: [
      { world: 1, level: 1, stars: 3, bestScore: 450, bestWords: 15, completedAt: '2025-01-20T12:00:00Z' },
      { world: 1, level: 2, stars: 2, bestScore: 380, bestWords: 12, completedAt: '2025-01-20T12:30:00Z' },
    ],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-20T12:30:00Z',
    ...overrides,
  };
}

// Helper to wrap component with provider
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ProgressionProvider>{children}</ProgressionProvider>
);

describe('ProgressionContext', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('Initial Loading', () => {
    it('should show loading state initially', async () => {
      // GIVEN
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      // WHEN
      const { result } = renderHook(() => useProgression(), { wrapper });

      // THEN
      expect(result.current.isLoading).toBe(true);
      expect(result.current.progression).toBeNull();
    });

    it('should load progression on mount', async () => {
      // GIVEN
      const mockProgression = createMockProgression();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProgression,
      });

      // WHEN
      const { result } = renderHook(() => useProgression(), { wrapper });

      // THEN
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.progression).toEqual(mockProgression);
      expect(result.current.error).toBeNull();
    });

    it('should set error on fetch failure', async () => {
      // GIVEN
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      });

      // WHEN
      const { result } = renderHook(() => useProgression(), { wrapper });

      // THEN
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.error).toBeTruthy();
      expect(result.current.progression).toBeNull();
    });
  });

  describe('Progression Data Access', () => {
    it('should provide total stars', async () => {
      // GIVEN
      const mockProgression = createMockProgression({ totalStars: 42 });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProgression,
      });

      // WHEN
      const { result } = renderHook(() => useProgression(), { wrapper });

      // THEN
      await waitFor(() => {
        expect(result.current.progression?.totalStars).toBe(42);
      });
    });

    it('should provide completions array', async () => {
      // GIVEN
      const completions: LevelCompletion[] = [
        { world: 1, level: 1, stars: 3, bestScore: 500, bestWords: 20, completedAt: '2025-01-20T12:00:00Z' },
        { world: 1, level: 2, stars: 2, bestScore: 400, bestWords: 15, completedAt: '2025-01-20T12:30:00Z' },
        { world: 1, level: 3, stars: 1, bestScore: 300, bestWords: 10, completedAt: '2025-01-20T13:00:00Z' },
      ];
      const mockProgression = createMockProgression({ completions });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProgression,
      });

      // WHEN
      const { result } = renderHook(() => useProgression(), { wrapper });

      // THEN
      await waitFor(() => {
        expect(result.current.progression?.completions).toHaveLength(3);
      });
    });

    it('should provide player level and XP', async () => {
      // GIVEN
      const mockProgression = createMockProgression({ playerLevel: 10, xp: 5000 });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProgression,
      });

      // WHEN
      const { result } = renderHook(() => useProgression(), { wrapper });

      // THEN
      await waitFor(() => {
        expect(result.current.progression?.playerLevel).toBe(10);
        expect(result.current.progression?.xp).toBe(5000);
      });
    });
  });

  describe('Level Completion', () => {
    it('should update progression after completing level', async () => {
      // GIVEN - Initial load
      const initialProgression = createMockProgression({ totalStars: 5 });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => initialProgression,
      });

      const { result } = renderHook(() => useProgression(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // GIVEN - Completion response
      const updatedProgression = createMockProgression({ totalStars: 8 });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, progression: updatedProgression }),
      });

      // WHEN
      await act(async () => {
        await result.current.completeLevel(1, 3, 3, 500, 20);
      });

      // THEN
      expect(result.current.progression?.totalStars).toBe(8);
    });

    it('should call API with correct parameters', async () => {
      // GIVEN
      const mockProgression = createMockProgression();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProgression,
      });

      const { result } = renderHook(() => useProgression(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, progression: mockProgression }),
      });

      // WHEN
      await act(async () => {
        await result.current.completeLevel(2, 5, 2, 350, 12);
      });

      // THEN
      expect(mockFetch).toHaveBeenLastCalledWith(
        '/api/adventure/complete',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            world: 2,
            level: 5,
            stars: 2,
            score: 350,
            words: 12,
          }),
        })
      );
    });
  });

  describe('Refresh Functionality', () => {
    it('should refresh progression data', async () => {
      // GIVEN - Initial load
      const initialProgression = createMockProgression({ xp: 1000 });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => initialProgression,
      });

      const { result } = renderHook(() => useProgression(), { wrapper });

      await waitFor(() => {
        expect(result.current.progression?.xp).toBe(1000);
      });

      // GIVEN - Refresh response with updated data
      const refreshedProgression = createMockProgression({ xp: 1500 });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => refreshedProgression,
      });

      // WHEN
      await act(async () => {
        await result.current.refreshProgression();
      });

      // THEN
      expect(result.current.progression?.xp).toBe(1500);
    });
  });

  describe('Helper Functions', () => {
    it('should provide isWorldUnlocked helper', async () => {
      // GIVEN
      const mockProgression = createMockProgression({ totalStars: 20 });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProgression,
      });

      const { result } = renderHook(() => useProgression(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // THEN
      // World 1 always unlocked
      expect(result.current.isWorldUnlocked(1)).toBe(true);
      // World 2 requires 15 stars (we have 20)
      expect(result.current.isWorldUnlocked(2)).toBe(true);
      // World 3 requires 30 stars (we have 20)
      expect(result.current.isWorldUnlocked(3)).toBe(false);
    });

    it('should provide isLevelUnlocked helper', async () => {
      // GIVEN
      const completions: LevelCompletion[] = [
        { world: 1, level: 1, stars: 2, bestScore: 300, bestWords: 10, completedAt: '2025-01-20T12:00:00Z' },
        { world: 1, level: 2, stars: 1, bestScore: 200, bestWords: 8, completedAt: '2025-01-20T12:30:00Z' },
      ];
      const mockProgression = createMockProgression({ completions });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProgression,
      });

      const { result } = renderHook(() => useProgression(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // THEN
      // Level 1 always unlocked
      expect(result.current.isLevelUnlocked(1, 1)).toBe(true);
      // Level 2 unlocked (level 1 completed)
      expect(result.current.isLevelUnlocked(1, 2)).toBe(true);
      // Level 3 unlocked (level 2 completed with 1 star)
      expect(result.current.isLevelUnlocked(1, 3)).toBe(true);
      // Level 4 NOT unlocked (level 3 not completed)
      expect(result.current.isLevelUnlocked(1, 4)).toBe(false);
    });

    it('should provide getWorldStars helper', async () => {
      // GIVEN
      const completions: LevelCompletion[] = [
        { world: 1, level: 1, stars: 3, bestScore: 500, bestWords: 20, completedAt: '2025-01-20T12:00:00Z' },
        { world: 1, level: 2, stars: 2, bestScore: 400, bestWords: 15, completedAt: '2025-01-20T12:30:00Z' },
        { world: 2, level: 1, stars: 1, bestScore: 300, bestWords: 10, completedAt: '2025-01-20T13:00:00Z' },
      ];
      const mockProgression = createMockProgression({ completions });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProgression,
      });

      const { result } = renderHook(() => useProgression(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // THEN
      expect(result.current.getWorldStars(1)).toBe(5); // 3 + 2
      expect(result.current.getWorldStars(2)).toBe(1);
      expect(result.current.getWorldStars(3)).toBe(0); // No completions
    });
  });

  describe('Error Handling', () => {
    it('should throw error when used outside provider', () => {
      // WHEN/THEN
      expect(() => {
        renderHook(() => useProgression());
      }).toThrow('useProgression must be used within ProgressionProvider');
    });
  });
});
```

- **VALIDATE:** `npm run test -- --testPathPattern="ProgressionContext.test"`

---

### Task 2: CREATE contexts/ProgressionContext.tsx

- **IMPLEMENT:** Global state provider for adventure progression
- **PATTERN:** Follow AuthContext pattern from existing codebase
- **TDD:** GREEN phase - make all tests pass

```typescript
/**
 * ProgressionContext
 *
 * Global state management for Adventure Mode progression.
 * Provides player progression data, level completion tracking,
 * and helper functions for unlock status.
 */

'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { PlayerProgression, LevelCompletion } from '@/types/adventure';
import {
  isWorldUnlocked as checkWorldUnlocked,
  isLevelUnlocked as checkLevelUnlocked,
} from '@/lib/adventure';

// ==============================================
// TYPES
// ==============================================

interface ProgressionContextType {
  /** Current player progression data */
  progression: PlayerProgression | null;
  /** Loading state for initial fetch */
  isLoading: boolean;
  /** Error from fetch or update operations */
  error: Error | null;
  /** Refresh progression data from API */
  refreshProgression: () => Promise<void>;
  /** Complete a level and update progression */
  completeLevel: (
    world: number,
    level: number,
    stars: 0 | 1 | 2 | 3,
    score: number,
    words: number
  ) => Promise<void>;
  /** Check if a world is unlocked */
  isWorldUnlocked: (worldId: number) => boolean;
  /** Check if a level is unlocked */
  isLevelUnlocked: (worldId: number, levelId: number) => boolean;
  /** Get total stars for a specific world */
  getWorldStars: (worldId: number) => number;
  /** Get completion data for a specific level */
  getLevelCompletion: (worldId: number, levelId: number) => LevelCompletion | undefined;
}

// ==============================================
// CONTEXT
// ==============================================

const ProgressionContext = createContext<ProgressionContextType | null>(null);

// ==============================================
// PROVIDER
// ==============================================

interface ProgressionProviderProps {
  children: ReactNode;
}

export function ProgressionProvider({ children }: ProgressionProviderProps) {
  const { user, isLoading: authLoading } = useAuth();
  const [progression, setProgression] = useState<PlayerProgression | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch progression from API
  const fetchProgression = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await fetch('/api/adventure/progress', {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch progression: ${response.status}`);
      }

      const data = await response.json();
      setProgression(data);
    } catch (err) {
      console.error('[ProgressionContext] Fetch error:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch progression'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Refresh progression (exposed to consumers)
  const refreshProgression = useCallback(async () => {
    setIsLoading(true);
    await fetchProgression();
  }, [fetchProgression]);

  // Complete a level
  const completeLevel = useCallback(
    async (
      world: number,
      level: number,
      stars: 0 | 1 | 2 | 3,
      score: number,
      words: number
    ) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      try {
        const response = await fetch('/api/adventure/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            world,
            level,
            stars,
            score,
            words,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to complete level: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.progression) {
          setProgression(data.progression);
        }
      } catch (err) {
        console.error('[ProgressionContext] Complete level error:', err);
        throw err;
      }
    },
    [user?.id]
  );

  // Helper: Check if world is unlocked
  const isWorldUnlocked = useCallback(
    (worldId: number): boolean => {
      if (!progression) return worldId === 1;
      return checkWorldUnlocked(worldId, progression.totalStars);
    },
    [progression]
  );

  // Helper: Check if level is unlocked
  const isLevelUnlocked = useCallback(
    (worldId: number, levelId: number): boolean => {
      if (!progression) return worldId === 1 && levelId === 1;
      return checkLevelUnlocked(worldId, levelId, progression.completions);
    },
    [progression]
  );

  // Helper: Get total stars for a world
  const getWorldStars = useCallback(
    (worldId: number): number => {
      if (!progression) return 0;
      return progression.completions
        .filter((c) => c.world === worldId)
        .reduce((sum, c) => sum + c.stars, 0);
    },
    [progression]
  );

  // Helper: Get completion for a specific level
  const getLevelCompletion = useCallback(
    (worldId: number, levelId: number): LevelCompletion | undefined => {
      if (!progression) return undefined;
      return progression.completions.find(
        (c) => c.world === worldId && c.level === levelId
      );
    },
    [progression]
  );

  // Initial fetch on mount (when auth is ready)
  useEffect(() => {
    if (!authLoading) {
      fetchProgression();
    }
  }, [authLoading, fetchProgression]);

  // Memoize context value
  const contextValue = useMemo<ProgressionContextType>(
    () => ({
      progression,
      isLoading,
      error,
      refreshProgression,
      completeLevel,
      isWorldUnlocked,
      isLevelUnlocked,
      getWorldStars,
      getLevelCompletion,
    }),
    [
      progression,
      isLoading,
      error,
      refreshProgression,
      completeLevel,
      isWorldUnlocked,
      isLevelUnlocked,
      getWorldStars,
      getLevelCompletion,
    ]
  );

  return (
    <ProgressionContext.Provider value={contextValue}>
      {children}
    </ProgressionContext.Provider>
  );
}

// ==============================================
// HOOK
// ==============================================

/**
 * Hook to access adventure progression context
 * Must be used within ProgressionProvider
 */
export function useProgression(): ProgressionContextType {
  const context = useContext(ProgressionContext);
  if (!context) {
    throw new Error('useProgression must be used within ProgressionProvider');
  }
  return context;
}

// ==============================================
// EXPORTS
// ==============================================

export { ProgressionContext };
export type { ProgressionContextType };
```

- **VALIDATE:** `npm run test -- --testPathPattern="ProgressionContext.test"` → All tests pass

---

### Task 3: CREATE hooks/__tests__/useAdventureLevel.test.ts

- **IMPLEMENT:** Test suite for level configuration hook
- **PATTERN:** Given-When-Then structure
- **TDD:** RED phase - tests MUST fail before implementation

```typescript
/**
 * useAdventureLevel Tests
 *
 * Tests for the adventure level configuration hook
 * Following TDD: Write tests FIRST, then implement
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAdventureLevel } from '../useAdventureLevel';
import type { LevelConfig } from '@/types/adventure';

// Mock the levelConfig module
jest.mock('@/lib/adventure', () => ({
  getLevelConfig: jest.fn((world: number, level: number): LevelConfig => ({
    world,
    level,
    gridSize: world <= 2 ? 4 : world <= 5 ? 5 : world <= 8 ? 6 : 7,
    timerSeconds: 120 - (world - 1) * 8,
    objectives: [{ type: 'wordCount', target: 10, isPrimary: true }],
    specialTiles: [],
    difficulty: world <= 3 ? 'EASY' : world <= 6 ? 'MEDIUM' : 'HARD',
    worldMechanic: world > 1 ? 'synonymPairs' : undefined,
  })),
  getWorldConfig: jest.fn((world: number) => ({
    id: world,
    name: `world${world}`,
    theme: 'test-theme',
    mechanic: world > 1 ? 'synonymPairs' : null,
    bossName: `boss${world}`,
    colorPrimary: 'neo-yellow',
    colorSecondary: 'neo-orange',
    description: `desc${world}`,
  })),
}));

describe('useAdventureLevel', () => {
  describe('Level Configuration', () => {
    it('should return level config for valid world and level', () => {
      // GIVEN
      const world = 1;
      const level = 1;

      // WHEN
      const { result } = renderHook(() => useAdventureLevel(world, level));

      // THEN
      expect(result.current.levelConfig).toBeDefined();
      expect(result.current.levelConfig?.world).toBe(1);
      expect(result.current.levelConfig?.level).toBe(1);
    });

    it('should return correct grid size for world', () => {
      // GIVEN - World 1 (tutorial) should have 4x4 grid
      const { result: result1 } = renderHook(() => useAdventureLevel(1, 1));
      expect(result1.current.levelConfig?.gridSize).toBe(4);

      // GIVEN - World 5 should have 5x5 grid
      const { result: result5 } = renderHook(() => useAdventureLevel(5, 1));
      expect(result5.current.levelConfig?.gridSize).toBe(5);

      // GIVEN - World 9 should have 7x7 grid
      const { result: result9 } = renderHook(() => useAdventureLevel(9, 1));
      expect(result9.current.levelConfig?.gridSize).toBe(7);
    });

    it('should return objectives for level', () => {
      // GIVEN
      const world = 3;
      const level = 5;

      // WHEN
      const { result } = renderHook(() => useAdventureLevel(world, level));

      // THEN
      expect(result.current.levelConfig?.objectives).toBeDefined();
      expect(result.current.levelConfig?.objectives.length).toBeGreaterThan(0);
    });

    it('should return null for invalid world/level', () => {
      // GIVEN
      const world = 0;
      const level = 1;

      // WHEN
      const { result } = renderHook(() => useAdventureLevel(world, level));

      // THEN
      expect(result.current.levelConfig).toBeNull();
      expect(result.current.error).toBeTruthy();
    });
  });

  describe('World Configuration', () => {
    it('should return world config', () => {
      // GIVEN
      const world = 2;
      const level = 1;

      // WHEN
      const { result } = renderHook(() => useAdventureLevel(world, level));

      // THEN
      expect(result.current.worldConfig).toBeDefined();
      expect(result.current.worldConfig?.id).toBe(2);
    });

    it('should include world mechanic for non-tutorial worlds', () => {
      // GIVEN - World 2 has synonym mechanic
      const { result } = renderHook(() => useAdventureLevel(2, 1));

      // THEN
      expect(result.current.levelConfig?.worldMechanic).toBe('synonymPairs');
    });

    it('should not include mechanic for tutorial world', () => {
      // GIVEN - World 1 is tutorial
      const { result } = renderHook(() => useAdventureLevel(1, 1));

      // THEN
      expect(result.current.levelConfig?.worldMechanic).toBeUndefined();
    });
  });

  describe('Level Metadata', () => {
    it('should provide isBossLevel for level 10', () => {
      // GIVEN
      const { result: boss } = renderHook(() => useAdventureLevel(1, 10));
      const { result: normal } = renderHook(() => useAdventureLevel(1, 5));

      // THEN
      expect(boss.current.isBossLevel).toBe(true);
      expect(normal.current.isBossLevel).toBe(false);
    });

    it('should provide difficulty string', () => {
      // GIVEN
      const { result: easy } = renderHook(() => useAdventureLevel(1, 1));
      const { result: medium } = renderHook(() => useAdventureLevel(5, 1));
      const { result: hard } = renderHook(() => useAdventureLevel(10, 1));

      // THEN
      expect(easy.current.levelConfig?.difficulty).toBe('EASY');
      expect(medium.current.levelConfig?.difficulty).toBe('MEDIUM');
      expect(hard.current.levelConfig?.difficulty).toBe('HARD');
    });

    it('should provide globalLevelNumber', () => {
      // GIVEN
      const { result: w1l1 } = renderHook(() => useAdventureLevel(1, 1));
      const { result: w2l5 } = renderHook(() => useAdventureLevel(2, 5));
      const { result: w10l10 } = renderHook(() => useAdventureLevel(10, 10));

      // THEN
      expect(w1l1.current.globalLevelNumber).toBe(1);
      expect(w2l5.current.globalLevelNumber).toBe(15); // (2-1)*10 + 5
      expect(w10l10.current.globalLevelNumber).toBe(100);
    });
  });

  describe('Update on Props Change', () => {
    it('should update config when world changes', () => {
      // GIVEN
      const { result, rerender } = renderHook(
        ({ world, level }) => useAdventureLevel(world, level),
        { initialProps: { world: 1, level: 1 } }
      );

      expect(result.current.levelConfig?.world).toBe(1);

      // WHEN
      rerender({ world: 3, level: 1 });

      // THEN
      expect(result.current.levelConfig?.world).toBe(3);
    });

    it('should update config when level changes', () => {
      // GIVEN
      const { result, rerender } = renderHook(
        ({ world, level }) => useAdventureLevel(world, level),
        { initialProps: { world: 1, level: 1 } }
      );

      expect(result.current.levelConfig?.level).toBe(1);

      // WHEN
      rerender({ world: 1, level: 5 });

      // THEN
      expect(result.current.levelConfig?.level).toBe(5);
    });
  });
});
```

- **VALIDATE:** `npm run test -- --testPathPattern="useAdventureLevel.test"` → Tests fail (RED)

---

### Task 4: CREATE hooks/useAdventureLevel.ts

- **IMPLEMENT:** Hook for level configuration
- **PATTERN:** Use useMemo for expensive computations
- **TDD:** GREEN phase - make all tests pass

```typescript
/**
 * useAdventureLevel Hook
 *
 * Provides level configuration and world metadata for adventure gameplay.
 * Handles level config retrieval, boss level detection, and global level numbering.
 */

import { useMemo, useState } from 'react';
import type { LevelConfig } from '@/types/adventure';
import {
  getLevelConfig,
  getWorldConfig,
  type WorldConfig,
  WORLDS_COUNT,
  LEVELS_PER_WORLD,
} from '@/lib/adventure';

// ==============================================
// TYPES
// ==============================================

interface UseAdventureLevelReturn {
  /** Level configuration */
  levelConfig: LevelConfig | null;
  /** World configuration */
  worldConfig: WorldConfig | null;
  /** Whether this is a boss level (level 10) */
  isBossLevel: boolean;
  /** Global level number (1-100) */
  globalLevelNumber: number;
  /** Error if invalid world/level */
  error: Error | null;
}

// ==============================================
// HOOK
// ==============================================

/**
 * Hook to get adventure level configuration
 *
 * @param world - World number (1-10)
 * @param level - Level number within world (1-10)
 * @returns Level config, world config, and metadata
 */
export function useAdventureLevel(
  world: number,
  level: number
): UseAdventureLevelReturn {
  // Validate inputs and get configs
  const { levelConfig, worldConfig, error } = useMemo(() => {
    // Validate world
    if (world < 1 || world > WORLDS_COUNT) {
      return {
        levelConfig: null,
        worldConfig: null,
        error: new Error(`Invalid world: ${world}. Must be between 1 and ${WORLDS_COUNT}.`),
      };
    }

    // Validate level
    if (level < 1 || level > LEVELS_PER_WORLD) {
      return {
        levelConfig: null,
        worldConfig: null,
        error: new Error(`Invalid level: ${level}. Must be between 1 and ${LEVELS_PER_WORLD}.`),
      };
    }

    try {
      const levelCfg = getLevelConfig(world, level);
      const worldCfg = getWorldConfig(world);
      return {
        levelConfig: levelCfg,
        worldConfig: worldCfg,
        error: null,
      };
    } catch (err) {
      return {
        levelConfig: null,
        worldConfig: null,
        error: err instanceof Error ? err : new Error('Failed to get level config'),
      };
    }
  }, [world, level]);

  // Compute derived values
  const isBossLevel = useMemo(() => {
    return level === LEVELS_PER_WORLD; // Level 10 is boss level
  }, [level]);

  const globalLevelNumber = useMemo(() => {
    return (world - 1) * LEVELS_PER_WORLD + level;
  }, [world, level]);

  return {
    levelConfig,
    worldConfig,
    isBossLevel,
    globalLevelNumber,
    error,
  };
}

// ==============================================
// EXPORTS
// ==============================================

export type { UseAdventureLevelReturn };
```

- **VALIDATE:** `npm run test -- --testPathPattern="useAdventureLevel.test"` → All tests pass

---

### Task 5: UPDATE components/adventure/AdventureView.tsx

- **IMPLEMENT:** Integrate ProgressionContext with AdventureView
- **PATTERN:** Replace mock data with context data
- **IMPORTANT:** Read current implementation first

```typescript
// Read current file first, then update to use ProgressionContext
// Key changes:
// 1. Import and use useProgression hook
// 2. Replace hardcoded mock data with progression data
// 3. Add loading state handling
// 4. Connect completeLevel callback to context
```

Before implementing, read the current AdventureView.tsx to understand its structure.

---

### Task 6: ADD ProgressionProvider to app layout

- **IMPLEMENT:** Wrap adventure routes with ProgressionProvider
- **PATTERN:** Follow existing context provider patterns
- **LOCATION:** `app/[locale]/adventure/layout.tsx` (create if not exists)

```typescript
/**
 * Adventure Layout
 *
 * Wraps adventure routes with ProgressionProvider for state management
 */

import { ProgressionProvider } from '@/contexts/ProgressionContext';

export default function AdventureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProgressionProvider>{children}</ProgressionProvider>;
}
```

---

## TESTING STRATEGY

### Unit Tests

**Scope and Requirements:**
- Test ProgressionContext state management
- Test useAdventureLevel hook
- Test helper functions (isWorldUnlocked, isLevelUnlocked)
- Mock API calls and auth context

**Pattern (Given-When-Then):**
```typescript
describe('ProgressionContext', () => {
  it('should load progression on mount', async () => {
    // GIVEN
    const mockProgression = createMockProgression();
    mockFetch(mockProgression);

    // WHEN
    const { result } = renderHook(() => useProgression(), { wrapper });

    // THEN
    await waitFor(() => {
      expect(result.current.progression).toEqual(mockProgression);
    });
  });
});
```

### Integration Tests

**Scope:**
- Test WorldMap with real ProgressionContext
- Test level unlock logic end-to-end
- Test completeLevel updates UI correctly

### Edge Cases

- No user logged in (should show empty state)
- API error (should show error state)
- No completions (fresh user)
- All levels complete (100% completion)
- World unlock boundary conditions

---

## VALIDATION COMMANDS

### Level 1: TypeScript Compilation
```bash
cd fe-next && npm run build
```
**Expected:** Build succeeds with no TypeScript errors

### Level 2: Unit Tests
```bash
cd fe-next && npm run test -- --testPathPattern="ProgressionContext|useAdventureLevel"
```
**Expected:** All tests pass

### Level 3: All Adventure Tests
```bash
cd fe-next && npm run test -- --testPathPattern="adventure"
```
**Expected:** All adventure-related tests pass

### Level 4: Lint Check
```bash
cd fe-next && npm run lint
```
**Expected:** No linting errors

---

## ACCEPTANCE CRITERIA

- [ ] `contexts/ProgressionContext.tsx` created with full functionality
- [ ] `hooks/useAdventureLevel.ts` created with level config retrieval
- [ ] ProgressionProvider wraps adventure routes
- [ ] WorldMap receives real data from context (not mock data)
- [ ] Loading states displayed during data fetch
- [ ] Error states handled gracefully
- [ ] isWorldUnlocked and isLevelUnlocked work correctly
- [ ] completeLevel updates progression and UI
- [ ] Unit test coverage >= 80%
- [ ] All validation commands pass

---

## COMPLETION CHECKLIST

- [ ] Task 1: ProgressionContext.test.tsx created (RED phase)
- [ ] Task 2: ProgressionContext.tsx implemented (GREEN phase)
- [ ] Task 3: useAdventureLevel.test.ts created (RED phase)
- [ ] Task 4: useAdventureLevel.ts implemented (GREEN phase)
- [ ] Task 5: AdventureView updated to use context
- [ ] Task 6: ProgressionProvider added to adventure layout
- [ ] All tests passing
- [ ] Lint check passes
- [ ] Build succeeds
- [ ] Code follows project conventions

---

## NOTES

### Design Rationale

**Why a Context instead of just hooks?**
- Progression data is needed across multiple components (WorldMap, LevelGrid, LevelComplete)
- Avoids prop drilling
- Centralized cache of progression data
- Single source of truth for unlock status

**Why separate useAdventureLevel hook?**
- Level config is computed/generated, not fetched
- Keeps context focused on progression data
- Allows level config to be used without progression context

**Why memoize context value?**
- Prevents unnecessary re-renders
- Context value changes only when state changes
- Critical for performance with many consuming components

### Future Considerations

- Optimistic updates for level completion
- Offline support with local storage cache
- Real-time sync with Supabase realtime
- Level history for replay feature
