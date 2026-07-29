/**
 * AdventureGame Level Completion Tests
 *
 * Levels should NOT auto-complete when primary objectives are met.
 * They run until timer expires, giving players time to earn secondary
 * objectives for 2-3 stars.
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

describe('AdventureGame - Level does NOT auto-complete', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Game continues after primary objectives met', () => {
    it('should NOT set isComplete when primary objectives are met', () => {
      const levelConfig = createMockLevelConfig({
        objectives: [{ type: 'wordCount', target: 2, isPrimary: true }],
      });

      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: mockGrid })
      );

      act(() => result.current.startGame());
      act(() => result.current.submitWord('CAT', 30));
      act(() => result.current.submitWord('DOG', 30));

      // canComplete is true but game keeps running
      expect(result.current.canComplete).toBe(true);
      expect(result.current.gameState.isComplete).toBe(false);
    });

    it('should NOT auto-complete if only secondary objectives are met', () => {
      const levelConfig = createMockLevelConfig({
        objectives: [
          { type: 'wordCount', target: 5, isPrimary: true },
          { type: 'scoreTarget', target: 50, isPrimary: false },
        ],
      });

      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: mockGrid })
      );

      act(() => result.current.startGame());
      act(() => result.current.submitWord('CAT', 60));

      expect(result.current.canComplete).toBe(false);
      expect(result.current.gameState.isComplete).toBe(false);
    });

    it('should allow earning more objectives after primary is met', () => {
      const levelConfig = createMockLevelConfig({
        timerSeconds: 10,
        objectives: [
          { type: 'wordCount', target: 1, isPrimary: true },
          { type: 'scoreTarget', target: 100, isPrimary: false },
        ],
      });

      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: mockGrid })
      );

      act(() => result.current.startGame());

      // Meet primary with low score
      act(() => result.current.submitWord('CAT', 30));
      expect(result.current.gameState.isComplete).toBe(false);

      // Keep playing — earn more score toward secondary
      act(() => result.current.submitWord('DOG', 80));
      expect(result.current.gameState.isComplete).toBe(false);

      // Timer expires — now complete with correct stars
      act(() => vi.advanceTimersByTime(10000));
      expect(result.current.gameState.isComplete).toBe(true);
      // Primary met + scoreTarget met (30+80=110 >= 100) = 2 stars
      expect(result.current.gameState.stars).toBe(2);
    });
  });

  describe('Stars calculated at timer expiry', () => {
    it('should get 1 star when only primary met at timer expiry', () => {
      const levelConfig = createMockLevelConfig({
        timerSeconds: 5,
        objectives: [
          { type: 'wordCount', target: 1, isPrimary: true },
          { type: 'scoreTarget', target: 500, isPrimary: false },
          { type: 'longWords', target: 2, isPrimary: false },
        ],
      });

      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: mockGrid })
      );

      act(() => result.current.startGame());
      act(() => result.current.submitWord('CAT', 30));
      act(() => vi.advanceTimersByTime(5000));

      expect(result.current.gameState.isComplete).toBe(true);
      expect(result.current.gameState.stars).toBe(1);
    });

    it('should get 3 stars when all objectives met at timer expiry', () => {
      const levelConfig = createMockLevelConfig({
        timerSeconds: 5,
        objectives: [
          { type: 'wordCount', target: 1, isPrimary: true },
          { type: 'scoreTarget', target: 20, isPrimary: false },
          { type: 'longWords', target: 1, isPrimary: false },
        ],
      });

      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: mockGrid })
      );

      act(() => result.current.startGame());
      act(() => result.current.submitWord('CLASH', 30));
      act(() => vi.advanceTimersByTime(5000));

      expect(result.current.gameState.isComplete).toBe(true);
      expect(result.current.gameState.stars).toBe(3);
    });
  });
});
