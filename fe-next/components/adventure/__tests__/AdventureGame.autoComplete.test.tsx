/**
 * AdventureGame Auto-Complete Tests
 *
 * Tests for the bug: Level should auto-complete when player achieves
 * all primary objectives (e.g., finds required number of words).
 *
 * Following TDD: These tests should FAIL initially, then we fix the implementation.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useAdventureGame } from '@/hooks/useAdventureGame';
import type { LevelConfig } from '@/types/adventure';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestQueryWrapper';
  return Wrapper;
};

// ==============================================
// TEST FIXTURES
// ==============================================

function createMockLevelConfig(overrides?: Partial<LevelConfig>): LevelConfig {
  return {
    world: 1,
    level: 1,
    gridSize: 4,
    timerSeconds: 120,
    objectives: [
      { type: 'wordCount', target: 3, isPrimary: true },
      { type: 'scoreTarget', target: 100, isPrimary: false },
    ],
    specialTiles: [],
    difficulty: 'EASY',
    chapterNumber: 1,
    levelInChapter: 1,
    isBossLevel: false,
    ...overrides,
  };
}

const mockGrid = [
  ['C', 'A', 'T', 'S'],
  ['D', 'O', 'G', 'E'],
  ['B', 'I', 'R', 'D'],
  ['F', 'I', 'S', 'H'],
];

// ==============================================
// TESTS
// ==============================================

describe('AdventureGame - Auto-Completion Bug', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Bug #1: Level should auto-complete when primary objectives are met', () => {
    it('should set isComplete=true when canComplete becomes true', () => {
      // GIVEN - Level requires 2 words to complete
      const levelConfig = createMockLevelConfig({
        objectives: [{ type: 'wordCount', target: 2, isPrimary: true }],
      });

      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: mockGrid })
      );

      // Start game
      act(() => {
        result.current.startGame();
      });

      // WHEN - Submit 2 words (meeting the primary objective)
      act(() => {
        result.current.submitWord('CAT', 30);
      });
      act(() => {
        result.current.submitWord('DOG', 30);
      });

      // THEN - canComplete should be true (this works)
      expect(result.current.canComplete).toBe(true);

      // AND - game should auto-complete (THIS IS THE BUG - currently fails!)
      // The game should detect that canComplete is true and set isComplete=true
      expect(result.current.gameState.isComplete).toBe(true);
    });

    it('should calculate stars correctly when auto-completing', () => {
      // GIVEN - Level with primary (2 words) + 2 secondary objectives (need 3 completed for 3 stars)
      const levelConfig = createMockLevelConfig({
        objectives: [
          { type: 'wordCount', target: 2, isPrimary: true },
          { type: 'scoreTarget', target: 100, isPrimary: false },
          { type: 'longWords', target: 0, isPrimary: false },
        ],
      });

      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: mockGrid })
      );

      act(() => {
        result.current.startGame();
      });

      // WHEN - Submit 2 words with total score >= 100
      act(() => {
        result.current.submitWord('CAT', 60);
      });
      act(() => {
        result.current.submitWord('DOG', 60); // Total: 120 >= 100
      });

      // THEN - Should have 3 stars (primary + all secondary met)
      expect(result.current.canComplete).toBe(true);
      // This will fail until auto-complete is fixed
      expect(result.current.gameState.isComplete).toBe(true);
      expect(result.current.gameState.stars).toBe(3);
    });

    it('should NOT auto-complete if only secondary objectives are met', () => {
      // GIVEN - Level with primary (5 words) + secondary (score >= 50)
      const levelConfig = createMockLevelConfig({
        objectives: [
          { type: 'wordCount', target: 5, isPrimary: true },
          { type: 'scoreTarget', target: 50, isPrimary: false },
        ],
      });

      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: mockGrid })
      );

      act(() => {
        result.current.startGame();
      });

      // WHEN - Submit 1 word with score >= 50 (secondary met, but not primary)
      act(() => {
        result.current.submitWord('CAT', 60);
      });

      // THEN - canComplete should be false, game should NOT auto-complete
      expect(result.current.canComplete).toBe(false);
      expect(result.current.gameState.isComplete).toBe(false);
    });

    it('should preserve time remaining when auto-completing', () => {
      // GIVEN - Level with 120 second timer
      const levelConfig = createMockLevelConfig({
        timerSeconds: 120,
        objectives: [{ type: 'wordCount', target: 1, isPrimary: true }],
      });

      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: mockGrid })
      );

      act(() => {
        result.current.startGame();
      });

      // Let 10 seconds pass
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(result.current.timeRemaining).toBe(110);

      // WHEN - Complete primary objective
      act(() => {
        result.current.submitWord('CAT', 30);
      });

      // THEN - Should auto-complete with time remaining > 0
      expect(result.current.gameState.isComplete).toBe(true);
      expect(result.current.timeRemaining).toBeGreaterThan(0);
      // Should still have ~110 seconds (not 0)
      expect(result.current.timeRemaining).toBeGreaterThanOrEqual(109);
    });
  });

  describe('Bug #2: Stars should be calculated at completion time', () => {
    it('should have correct stars accessible after auto-complete', () => {
      // GIVEN - Level with primary + 2 secondary objectives
      // When only primary is met, should get 1 star
      const levelConfig = createMockLevelConfig({
        objectives: [
          { type: 'wordCount', target: 1, isPrimary: true },
          { type: 'scoreTarget', target: 500, isPrimary: false }, // Won't be met with 30 points
          { type: 'longWords', target: 2, isPrimary: false }, // Won't be met with 3-letter word
        ],
      });

      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: mockGrid })
      );

      act(() => {
        result.current.startGame();
      });

      // WHEN - Meet only primary objective (1 word, low score, short word)
      act(() => {
        result.current.submitWord('CAT', 30);
      });

      // THEN - Stars should be 1 (only primary met, no secondary objectives met)
      // This tests that stars are calculated at auto-complete time
      expect(result.current.gameState.isComplete).toBe(true);
      expect(result.current.gameState.stars).toBe(1);
    });

    it('should get 3 stars when all objectives met at auto-complete', () => {
      // GIVEN - Level with primary + 2 secondary objectives, all achievable
      const levelConfig = createMockLevelConfig({
        objectives: [
          { type: 'wordCount', target: 1, isPrimary: true },
          { type: 'scoreTarget', target: 20, isPrimary: false },
          { type: 'longWords', target: 1, isPrimary: false },
        ],
      });

      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: mockGrid })
      );

      act(() => {
        result.current.startGame();
      });

      // WHEN - Meet all objectives (5+ letter word for longWords, score >= 20)
      act(() => {
        result.current.submitWord('CLASH', 30);
      });

      // THEN - Stars should be 3 (all 3 objectives met)
      expect(result.current.gameState.isComplete).toBe(true);
      expect(result.current.gameState.stars).toBe(3);
    });
  });
});
