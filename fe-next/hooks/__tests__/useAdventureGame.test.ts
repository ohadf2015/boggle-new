/**
 * useAdventureGame Tests
 *
 * Tests for the adventure game state management hook
 * Following TDD: Write tests FIRST, then implement
 */

import { vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAdventureGame } from '../useAdventureGame';
import type { LevelConfig, TileState, LevelObjective } from '@/types/adventure';

// ==============================================
// TEST FIXTURES
// ==============================================

/**
 * Creates a mock level config for testing
 */
function createMockLevelConfig(overrides?: Partial<LevelConfig>): LevelConfig {
  return {
    world: 1,
    level: 1,
    gridSize: 4,
    timerSeconds: 120,
    objectives: [
      { type: 'wordCount', target: 5, isPrimary: true },
      { type: 'scoreTarget', target: 200, isPrimary: false },
    ],
    specialTiles: [],
    difficulty: 'EASY',
    chapterNumber: 1,
    levelInChapter: 1,
    isBossLevel: false,
    ...overrides,
  };
}

/**
 * Creates a mock grid of letters
 */
function createMockGrid(size: number = 4): string[][] {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const grid: string[][] = [];

  for (let i = 0; i < size; i++) {
    const row: string[] = [];
    for (let j = 0; j < size; j++) {
      row.push(letters[(i * size + j) % letters.length]);
    }
    grid.push(row);
  }

  return grid;
}

// ==============================================
// TESTS
// ==============================================

describe('useAdventureGame', () => {
  // Use fake timers for timer tests
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize game state from level config', () => {
      // GIVEN
      const levelConfig = createMockLevelConfig();
      const grid = createMockGrid();

      // WHEN
      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: grid })
      );

      // THEN
      expect(result.current.gameState).toBeDefined();
      expect(result.current.gameState.score).toBe(0);
      expect(result.current.gameState.wordsFound).toHaveLength(0);
      expect(result.current.gameState.isComplete).toBe(false);
      expect(result.current.gameState.stars).toBe(0);
    });

    it('should initialize tiles with special tile types from config', () => {
      // GIVEN
      const levelConfig = createMockLevelConfig({
        gridSize: 4,
        specialTiles: [
          { row: 0, col: 0, type: 'gold' },
          { row: 1, col: 1, type: 'ice' },
          { row: 2, col: 2, type: 'bomb' },
        ],
      });
      const grid = createMockGrid(4);

      // WHEN
      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: grid })
      );

      // THEN
      expect(result.current.tiles[0][0].type).toBe('gold');
      expect(result.current.tiles[1][1].type).toBe('ice');
      expect(result.current.tiles[2][2].type).toBe('bomb');
      expect(result.current.tiles[3][3].type).toBe('standard');
    });

    it('should initialize objectives from level config', () => {
      // GIVEN
      const levelConfig = createMockLevelConfig({
        objectives: [
          { type: 'wordCount', target: 10, isPrimary: true },
          { type: 'longWords', target: 3, isPrimary: false },
        ],
      });
      const grid = createMockGrid();

      // WHEN
      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: grid })
      );

      // THEN
      expect(result.current.objectives).toHaveLength(2);
      expect(result.current.objectives[0].type).toBe('wordCount');
      expect(result.current.objectives[0].current).toBe(0);
      expect(result.current.objectives[1].type).toBe('longWords');
    });

    it('should initialize timer with level duration', () => {
      // GIVEN
      const levelConfig = createMockLevelConfig({ timerSeconds: 90 });
      const grid = createMockGrid();

      // WHEN
      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: grid })
      );

      // THEN
      expect(result.current.timeRemaining).toBe(90);
    });
  });

  describe('Word Submission', () => {
    it('should add valid word to wordsFound', () => {
      // GIVEN
      const levelConfig = createMockLevelConfig();
      const grid = createMockGrid();
      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: grid })
      );

      // WHEN
      act(() => {
        result.current.submitWord('TEST', 100);
      });

      // THEN
      expect(result.current.gameState.wordsFound).toContain('TEST');
    });

    it('should update score on word submission', () => {
      // GIVEN
      const levelConfig = createMockLevelConfig();
      const grid = createMockGrid();
      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: grid })
      );

      // WHEN
      act(() => {
        result.current.submitWord('TEST', 100);
      });

      // THEN
      expect(result.current.gameState.score).toBe(100);
    });

    it('should increment word count objective on valid word', () => {
      // GIVEN
      const levelConfig = createMockLevelConfig({
        objectives: [{ type: 'wordCount', target: 5, isPrimary: true }],
      });
      const grid = createMockGrid();
      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: grid })
      );

      // WHEN
      act(() => {
        result.current.submitWord('TEST', 100);
      });

      // THEN
      const wordCountObjective = result.current.objectives.find(
        (o) => o.type === 'wordCount'
      );
      expect(wordCountObjective?.current).toBe(1);
    });

    it('should increment long words objective for 5+ letter words', () => {
      // GIVEN
      const levelConfig = createMockLevelConfig({
        objectives: [
          { type: 'wordCount', target: 5, isPrimary: true },
          { type: 'longWords', target: 2, isPrimary: false },
        ],
      });
      const grid = createMockGrid();
      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: grid })
      );

      // WHEN
      act(() => {
        result.current.submitWord('TESTS', 150); // 5 letters - should count
      });

      // THEN
      const longWordsObjective = result.current.objectives.find(
        (o) => o.type === 'longWords'
      );
      expect(longWordsObjective?.current).toBe(1);
    });

    it('should NOT increment long words objective for <5 letter words', () => {
      // GIVEN
      const levelConfig = createMockLevelConfig({
        objectives: [
          { type: 'wordCount', target: 5, isPrimary: true },
          { type: 'longWords', target: 2, isPrimary: false },
        ],
      });
      const grid = createMockGrid();
      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: grid })
      );

      // WHEN
      act(() => {
        result.current.submitWord('TEST', 100); // 4 letters - should NOT count
      });

      // THEN
      const longWordsObjective = result.current.objectives.find(
        (o) => o.type === 'longWords'
      );
      expect(longWordsObjective?.current).toBe(0);
    });

    it('should update score target objective progress', () => {
      // GIVEN
      const levelConfig = createMockLevelConfig({
        objectives: [
          { type: 'wordCount', target: 5, isPrimary: true },
          { type: 'scoreTarget', target: 500, isPrimary: false },
        ],
      });
      const grid = createMockGrid();
      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: grid })
      );

      // WHEN
      act(() => {
        result.current.submitWord('TEST', 200);
      });

      // THEN
      const scoreObjective = result.current.objectives.find(
        (o) => o.type === 'scoreTarget'
      );
      expect(scoreObjective?.current).toBe(200);
    });

    it('should NOT allow duplicate words', () => {
      // GIVEN
      const levelConfig = createMockLevelConfig();
      const grid = createMockGrid();
      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: grid })
      );

      // WHEN
      act(() => {
        result.current.submitWord('TEST', 100);
        result.current.submitWord('TEST', 100); // Duplicate
      });

      // THEN
      expect(result.current.gameState.wordsFound).toHaveLength(1);
      expect(result.current.gameState.score).toBe(100); // Only counted once
    });
  });

  describe('Tile Reusability', () => {
    it('should NOT mark standard tiles as cleared after word submission', () => {
      // GIVEN - A grid with no special tiles
      const levelConfig = createMockLevelConfig({
        specialTiles: [], // No special tiles
      });
      const grid = createMockGrid();
      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: grid })
      );

      // Verify tiles are not cleared initially
      expect(result.current.tiles[0][0].isCleared).toBe(false);
      expect(result.current.tiles[0][1].isCleared).toBe(false);

      // WHEN - Submit a word using those tiles
      act(() => {
        result.current.submitWordWithPath('TEST', 100, [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 0, col: 2 },
          { row: 0, col: 3 },
        ]);
      });

      // THEN - Standard tiles should NOT be marked as cleared
      // (They should remain usable for subsequent words)
      expect(result.current.tiles[0][0].isCleared).toBe(false);
      expect(result.current.tiles[0][1].isCleared).toBe(false);
      expect(result.current.tiles[0][2].isCleared).toBe(false);
      expect(result.current.tiles[0][3].isCleared).toBe(false);
    });

    it('should allow gold tile to be used in multiple words', () => {
      // GIVEN - A grid with a gold tile
      const levelConfig = createMockLevelConfig({
        specialTiles: [{ row: 0, col: 0, type: 'gold' }],
      });
      const grid = createMockGrid();
      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: grid })
      );

      // WHEN - Submit first word using gold tile
      act(() => {
        result.current.submitWordWithPath('FIRST', 100, [
          { row: 0, col: 0 }, // Gold tile
          { row: 0, col: 1 },
          { row: 0, col: 2 },
          { row: 0, col: 3 },
          { row: 1, col: 3 },
        ]);
      });

      // THEN - Gold tile should NOT be marked as cleared
      expect(result.current.tiles[0][0].isCleared).toBe(false);
      expect(result.current.tiles[0][0].type).toBe('gold');

      // AND - Submit second word using the same gold tile
      act(() => {
        result.current.submitWordWithPath('SECOND', 100, [
          { row: 0, col: 0 }, // Same gold tile
          { row: 1, col: 0 },
          { row: 2, col: 0 },
          { row: 3, col: 0 },
          { row: 3, col: 1 },
          { row: 3, col: 2 },
        ]);
      });

      // THEN - Score should include gold multiplier for both words
      // First word: 100 * 3 = 300
      // Second word: 100 * 3 = 300
      // Total: 600
      expect(result.current.gameState.score).toBe(600);
    });
  });

  describe('Special Tile Effects', () => {
    it('should apply 3x multiplier for gold tiles', () => {
      // GIVEN
      const levelConfig = createMockLevelConfig({
        specialTiles: [{ row: 0, col: 0, type: 'gold' }],
      });
      const grid = createMockGrid();
      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: grid })
      );

      // WHEN - Submit word using gold tile
      act(() => {
        result.current.submitWordWithPath('TEST', 100, [
          { row: 0, col: 0 }, // Gold tile
          { row: 0, col: 1 },
          { row: 0, col: 2 },
          { row: 0, col: 3 },
        ]);
      });

      // THEN - Score should be 3x
      expect(result.current.gameState.score).toBe(300);
    });

    it('should clear ice tiles when adjacent tile is used', () => {
      // GIVEN
      const levelConfig = createMockLevelConfig({
        specialTiles: [{ row: 0, col: 1, type: 'ice' }],
        objectives: [
          { type: 'wordCount', target: 5, isPrimary: true },
          { type: 'clearIce', target: 1, isPrimary: false },
        ],
      });
      const grid = createMockGrid();
      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: grid })
      );

      // WHEN - Submit word using tile adjacent to ice
      act(() => {
        result.current.submitWordWithPath('TEST', 100, [
          { row: 0, col: 0 }, // Adjacent to ice at 0,1
          { row: 1, col: 0 },
          { row: 2, col: 0 },
          { row: 3, col: 0 },
        ]);
      });

      // THEN - Ice should become standard (melted and selectable)
      expect(result.current.tiles[0][1].type).toBe('standard');
      expect(result.current.tiles[0][1].isCleared).toBe(false); // NOT cleared - selectable
      const clearIceObjective = result.current.objectives.find(
        (o) => o.type === 'clearIce'
      );
      expect(clearIceObjective?.current).toBe(1);
    });

    it('should mark ice tile as frozen initially', () => {
      // GIVEN
      const levelConfig = createMockLevelConfig({
        specialTiles: [{ row: 0, col: 0, type: 'ice' }],
      });
      const grid = createMockGrid();

      // WHEN
      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: grid })
      );

      // THEN
      expect(result.current.tiles[0][0].isFrozen).toBe(true);
    });

    it('should clear entire row when bomb tile is used', () => {
      // GIVEN
      const levelConfig = createMockLevelConfig({
        gridSize: 4,
        specialTiles: [{ row: 1, col: 1, type: 'bomb' }],
      });
      const grid = createMockGrid(4);
      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: grid })
      );

      // WHEN - Submit word using bomb tile
      const scoreBefore = result.current.gameState.score;
      act(() => {
        result.current.submitWordWithPath('TEST', 100, [
          { row: 1, col: 0 },
          { row: 1, col: 1 }, // Bomb tile
          { row: 1, col: 2 },
          { row: 1, col: 3 },
        ]);
      });

      // THEN - Bomb doubles score (100 * 2 = 200), bomb tile cleared
      expect(result.current.gameState.score).toBe(scoreBefore + 200);
      expect(result.current.tiles[1][1].isCleared).toBe(true);
      // Other rows unaffected
      expect(result.current.tiles[0][0].isCleared).toBe(false);
    });

  });

  describe('Timer', () => {
    it('should countdown timer when game is active', async () => {
      // GIVEN
      const levelConfig = createMockLevelConfig({ timerSeconds: 120 });
      const grid = createMockGrid();
      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: grid })
      );

      // Start the game
      act(() => {
        result.current.startGame();
      });

      // WHEN - Advance timer by 5 seconds
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // THEN
      expect(result.current.timeRemaining).toBe(115);
    });

    it('should stop timer when game is paused', () => {
      // GIVEN
      const levelConfig = createMockLevelConfig({ timerSeconds: 120 });
      const grid = createMockGrid();
      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: grid })
      );

      // Start and then pause
      act(() => {
        result.current.startGame();
      });
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      act(() => {
        result.current.pauseGame();
      });

      // WHEN - Advance timer while paused
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      // THEN - Timer should still be at 115 (not 105)
      expect(result.current.timeRemaining).toBe(115);
    });

    it('should end game when timer reaches zero', () => {
      // GIVEN
      const levelConfig = createMockLevelConfig({ timerSeconds: 5 });
      const grid = createMockGrid();
      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: grid })
      );

      act(() => {
        result.current.startGame();
      });

      // WHEN - Let timer run out
      act(() => {
        vi.advanceTimersByTime(6000);
      });

      // THEN
      expect(result.current.timeRemaining).toBe(0);
      expect(result.current.gameState.isComplete).toBe(true);
    });

    it('should track time bonus objective', () => {
      // GIVEN
      const levelConfig = createMockLevelConfig({
        timerSeconds: 60,
        objectives: [
          { type: 'wordCount', target: 1, isPrimary: true },
          { type: 'timeBonus', target: 30, isPrimary: false },
        ],
      });
      const grid = createMockGrid();
      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: grid })
      );

      act(() => {
        result.current.startGame();
      });

      // Submit word to complete primary objective with 40 seconds remaining
      act(() => {
        vi.advanceTimersByTime(20000);
        result.current.submitWord('TEST', 100);
      });

      // Complete the game
      act(() => {
        result.current.completeLevel();
      });

      // THEN - Time bonus should be achieved (40 >= 30)
      const timeBonusObjective = result.current.objectives.find(
        (o) => o.type === 'timeBonus'
      );
      expect(timeBonusObjective?.isComplete).toBe(true);
    });
  });

  describe('Level Completion', () => {
    it('should detect level completion when primary objective is met', () => {
      // GIVEN
      const levelConfig = createMockLevelConfig({
        objectives: [{ type: 'wordCount', target: 2, isPrimary: true }],
      });
      const grid = createMockGrid();
      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: grid })
      );

      // WHEN - Submit enough words to meet objective
      act(() => {
        result.current.submitWord('TEST', 100);
        result.current.submitWord('WORD', 100);
      });

      // THEN
      expect(result.current.canComplete).toBe(true);
    });

    it('should NOT allow completion if primary objective not met', () => {
      // GIVEN
      const levelConfig = createMockLevelConfig({
        objectives: [{ type: 'wordCount', target: 5, isPrimary: true }],
      });
      const grid = createMockGrid();
      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: grid })
      );

      // WHEN - Submit fewer words than target
      act(() => {
        result.current.submitWord('TEST', 100);
      });

      // THEN
      expect(result.current.canComplete).toBe(false);
    });

    it('should calculate 1 star for meeting only primary objective', () => {
      // GIVEN
      const levelConfig = createMockLevelConfig({
        objectives: [
          { type: 'wordCount', target: 1, isPrimary: true },
          { type: 'scoreTarget', target: 500, isPrimary: false },
          { type: 'longWords', target: 2, isPrimary: false },
        ],
      });
      const grid = createMockGrid();
      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: grid })
      );

      // Submit just enough to meet primary
      act(() => {
        result.current.submitWord('TEST', 100);
        result.current.completeLevel();
      });

      // THEN
      expect(result.current.gameState.stars).toBe(1);
    });

    it('should calculate 2 stars for meeting primary + some secondary objectives', () => {
      // GIVEN
      const levelConfig = createMockLevelConfig({
        objectives: [
          { type: 'wordCount', target: 1, isPrimary: true },
          { type: 'scoreTarget', target: 200, isPrimary: false },
          { type: 'longWords', target: 2, isPrimary: false },
        ],
      });
      const grid = createMockGrid();
      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: grid })
      );

      // Submit to meet primary + score objective
      act(() => {
        result.current.submitWord('TEST', 250); // Meets wordCount (1) and scoreTarget (250 >= 200)
        result.current.completeLevel();
      });

      // THEN
      expect(result.current.gameState.stars).toBe(2);
    });

    it('should calculate 3 stars for meeting all objectives', () => {
      // GIVEN
      const levelConfig = createMockLevelConfig({
        objectives: [
          { type: 'wordCount', target: 2, isPrimary: true },
          { type: 'scoreTarget', target: 200, isPrimary: false },
          { type: 'longWords', target: 1, isPrimary: false },
        ],
      });
      const grid = createMockGrid();
      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: grid })
      );

      // Submit to meet all objectives
      act(() => {
        result.current.submitWord('TESTS', 150); // 5 letters, counts as long word
        result.current.submitWord('WORD', 100);
        result.current.completeLevel();
      });

      // THEN
      expect(result.current.gameState.stars).toBe(3);
    });
  });

  describe('Combo System', () => {
    it('should track combo count for consecutive words', () => {
      // GIVEN
      const levelConfig = createMockLevelConfig();
      const grid = createMockGrid();
      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: grid })
      );

      // WHEN - Submit multiple words quickly
      act(() => {
        result.current.submitWord('ONE', 50);
      });
      act(() => {
        result.current.submitWord('TWO', 60);
      });
      act(() => {
        result.current.submitWord('THREE', 70);
      });

      // THEN
      expect(result.current.gameState.comboCount).toBe(3);
    });

    it('should reset combo after timeout', () => {
      // GIVEN
      const levelConfig = createMockLevelConfig();
      const grid = createMockGrid();
      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: grid })
      );

      act(() => {
        result.current.startGame();
      });

      // Submit word
      act(() => {
        result.current.submitWord('TEST', 100);
      });

      expect(result.current.gameState.comboCount).toBe(1);

      // WHEN - Wait for combo timeout (3 seconds)
      act(() => {
        vi.advanceTimersByTime(4000);
      });

      // THEN
      expect(result.current.gameState.comboCount).toBe(0);
    });
  });

  describe('Reset', () => {
    it('should reset game state to initial values', () => {
      // GIVEN
      const levelConfig = createMockLevelConfig();
      const grid = createMockGrid();
      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: grid })
      );

      // Make some progress
      act(() => {
        result.current.submitWord('TEST', 100);
        result.current.submitWord('WORD', 100);
      });

      expect(result.current.gameState.score).toBe(200);
      expect(result.current.gameState.wordsFound).toHaveLength(2);

      // WHEN
      act(() => {
        result.current.resetGame();
      });

      // THEN
      expect(result.current.gameState.score).toBe(0);
      expect(result.current.gameState.wordsFound).toHaveLength(0);
      expect(result.current.timeRemaining).toBe(120);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for invalid level config', () => {
      // GIVEN
      const invalidConfig = {
        world: -1, // Invalid (0 is valid for weekly challenges)
        level: 1,
        gridSize: 4,
        timerSeconds: 120,
        objectives: [],
        specialTiles: [],
        difficulty: 'EASY',
        chapterNumber: 1,
        levelInChapter: 1,
        isBossLevel: false,
      } as LevelConfig;
      const grid = createMockGrid();

      // WHEN/THEN
      expect(() => {
        renderHook(() =>
          useAdventureGame({ levelConfig: invalidConfig, initialGrid: grid })
        );
      }).toThrow();
    });
  });
});
