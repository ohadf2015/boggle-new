/**
 * useBlastGame - Core blast mode hook tests
 *
 * Tests tile state management, special tile effects, word clearing,
 * win detection, and dead-end detection.
 */

import { renderHook, act } from '@testing-library/react';

// Mock dependencies before importing the hook
jest.mock('@/utils/clientWordValidator', () => ({
  validateWordLocally: jest.fn(() => ({ isValid: true })),
  isWordOnBoard: jest.fn(() => true),
}));

jest.mock('@/hooks/useDictionaryCache', () => ({
  useDictionaryCache: () => ({
    checkWord: jest.fn(() => true),
    isLoaded: true,
  }),
}));

jest.mock('@/hooks/usePrevalidation', () => ({
  usePrevalidation: () => ({
    prefetch: jest.fn(),
    getCached: jest.fn(() => null),
    clearCache: jest.fn(),
  }),
}));

jest.mock('@/utils/haptics', () => ({
  hapticForWordScore: jest.fn(),
  hapticError: jest.fn(),
}));

jest.mock('@/utils/invalidWordTracker', () => ({
  recordNotOnBoard: jest.fn(),
  recordNotInDictionary: jest.fn(),
}));

jest.mock('@/shared/utils/scoring', () => ({
  getComboBonus: jest.fn(() => 0),
}));

import { useBlastGame } from '../hooks/useBlastGame';
import {
  GOLD_MULTIPLIER,
  BOMB_RADIUS,
  RAINBOW_BONUS,
  type BlastGameConfig,
} from '../types';

const defaultConfig: BlastGameConfig = {
  gridSize: 4,
  specialTileChance: 0,
  language: 'en',
};

describe('useBlastGame', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock fetch for grid init (themed words + solve grid)
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ words: ['test', 'word', 'game'] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          words: { easy: ['at', 'to'], medium: ['test', 'word'], hard: ['game'] },
        }),
      }) as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize tile state grid with correct dimensions', () => {
      const { result } = renderHook(() => useBlastGame(defaultConfig));

      expect(result.current.tileStates).toHaveLength(4);
      expect(result.current.tileStates[0]).toHaveLength(4);
    });

    it('should start with all tiles uncleared', () => {
      const { result } = renderHook(() => useBlastGame(defaultConfig));

      const clearedCount = result.current.tileStates
        .flat()
        .filter(t => t.isCleared).length;
      expect(clearedCount).toBe(0);
    });

    it('should set totalTiles to gridSize^2', () => {
      const { result } = renderHook(() => useBlastGame(defaultConfig));

      expect(result.current.gameState.totalTiles).toBe(16);
    });

    it('should start with score 0 and no words found', () => {
      const { result } = renderHook(() => useBlastGame(defaultConfig));

      expect(result.current.gameState.score).toBe(0);
      expect(result.current.gameState.wordsFound).toHaveLength(0);
    });
  });

  describe('special tile placement', () => {
    it('should place no special tiles when specialTileChance is 0', () => {
      const { result } = renderHook(() => useBlastGame({
        ...defaultConfig,
        specialTileChance: 0,
      }));

      const specialCount = result.current.tileStates
        .flat()
        .filter(t => t.type !== 'standard').length;
      expect(specialCount).toBe(0);
    });

    it('should place special tiles when specialTileChance is 1', () => {
      const { result } = renderHook(() => useBlastGame({
        ...defaultConfig,
        specialTileChance: 1,
      }));

      const specialCount = result.current.tileStates
        .flat()
        .filter(t => t.type !== 'standard').length;
      expect(specialCount).toBe(16);
    });
  });

  describe('tile clearing', () => {
    it('should clear tiles along a word path', () => {
      const { result } = renderHook(() => useBlastGame(defaultConfig));

      const path = [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
      ];

      act(() => {
        result.current.clearTilesForWord(path, 'test', 5);
      });

      expect(result.current.tileStates[0][0].isCleared).toBe(true);
      expect(result.current.tileStates[0][1].isCleared).toBe(true);
      expect(result.current.tileStates[0][2].isCleared).toBe(true);
      // Other tiles remain uncleared
      expect(result.current.tileStates[1][0].isCleared).toBe(false);
    });

    it('should update tilesCleared count', () => {
      const { result } = renderHook(() => useBlastGame(defaultConfig));

      act(() => {
        result.current.clearTilesForWord(
          [{ row: 0, col: 0 }, { row: 0, col: 1 }],
          'at',
          2
        );
      });

      expect(result.current.gameState.tilesCleared).toBe(2);
    });

    it('should add word to wordsFound', () => {
      const { result } = renderHook(() => useBlastGame(defaultConfig));

      act(() => {
        result.current.clearTilesForWord(
          [{ row: 0, col: 0 }, { row: 0, col: 1 }],
          'at',
          2
        );
      });

      expect(result.current.gameState.wordsFound).toContain('at');
    });

    it('should add score', () => {
      const { result } = renderHook(() => useBlastGame(defaultConfig));

      act(() => {
        result.current.clearTilesForWord(
          [{ row: 0, col: 0 }, { row: 0, col: 1 }],
          'at',
          5
        );
      });

      expect(result.current.gameState.score).toBe(5);
    });
  });

  describe('special tile effects', () => {
    it('should apply gold multiplier when clearing gold tiles', () => {
      const { result } = renderHook(() => useBlastGame({
        ...defaultConfig,
        specialTileChance: 1, // All tiles are special
      }));

      // Find a gold tile
      const goldTile = result.current.tileStates
        .flat()
        .find(t => t.type === 'gold');

      if (goldTile) {
        const path = [{ row: goldTile.row, col: goldTile.col }];
        act(() => {
          result.current.clearTilesForWord(path, 'a', 5);
        });

        // Score should be multiplied by GOLD_MULTIPLIER
        expect(result.current.gameState.score).toBe(5 * GOLD_MULTIPLIER);
      }
    });

    it('should clear adjacent tiles when clearing bomb tile', () => {
      const { result } = renderHook(() => useBlastGame({
        ...defaultConfig,
        specialTileChance: 1,
      }));

      // Find a bomb tile not on the edge (so all 8 neighbors exist)
      const bombTile = result.current.tileStates
        .flat()
        .find(t => t.type === 'bomb' && t.row > 0 && t.row < 3 && t.col > 0 && t.col < 3);

      if (bombTile) {
        const path = [{ row: bombTile.row, col: bombTile.col }];
        act(() => {
          result.current.clearTilesForWord(path, 'b', 5);
        });

        // Check the bomb tile itself is cleared
        expect(result.current.tileStates[bombTile.row][bombTile.col].isCleared).toBe(true);

        // Check adjacent tiles are cleared (bomb radius)
        for (let dr = -BOMB_RADIUS; dr <= BOMB_RADIUS; dr++) {
          for (let dc = -BOMB_RADIUS; dc <= BOMB_RADIUS; dc++) {
            const r = bombTile.row + dr;
            const c = bombTile.col + dc;
            if (r >= 0 && r < 4 && c >= 0 && c < 4) {
              expect(result.current.tileStates[r][c].isCleared).toBe(true);
            }
          }
        }
      }
    });

    it('should add rainbow bonus when clearing rainbow tile', () => {
      const { result } = renderHook(() => useBlastGame({
        ...defaultConfig,
        specialTileChance: 1,
      }));

      const rainbowTile = result.current.tileStates
        .flat()
        .find(t => t.type === 'rainbow');

      if (rainbowTile) {
        const path = [{ row: rainbowTile.row, col: rainbowTile.col }];
        act(() => {
          result.current.clearTilesForWord(path, 'r', 5);
        });

        expect(result.current.gameState.score).toBe(5 + RAINBOW_BONUS);
      }
    });
  });

  describe('game completion', () => {
    it('should not auto-complete when all tiles cleared (gravity refills board)', () => {
      const { result } = renderHook(() => useBlastGame({
        gridSize: 2,
        specialTileChance: 0,
        language: 'en',
      }));

      // Clear all 4 tiles — with gravity, cascade will refill them
      act(() => {
        result.current.clearTilesForWord(
          [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }],
          'test',
          10
        );
      });

      // Game is open-ended — never auto-completes
      expect(result.current.gameState.isComplete).toBe(false);
    });

    it('should not be complete when tiles remain', () => {
      const { result } = renderHook(() => useBlastGame(defaultConfig));

      act(() => {
        result.current.clearTilesForWord(
          [{ row: 0, col: 0 }],
          'a',
          1
        );
      });

      expect(result.current.gameState.isComplete).toBe(false);
    });
  });

  describe('modified grid for GridComponent', () => {
    it('should return grid with cleared cells as empty strings', () => {
      const { result } = renderHook(() => useBlastGame(defaultConfig));

      // Wait for grid to be generated
      if (result.current.modifiedGrid) {

        act(() => {
          result.current.clearTilesForWord(
            [{ row: 0, col: 0 }],
            'a',
            1
          );
        });

        expect(result.current.modifiedGrid![0][0]).toBe('');
        // Other cells remain
        expect(result.current.modifiedGrid![1][1]).not.toBe('');
      }
    });
  });

  describe('results generation', () => {
    it('should generate correct results data', () => {
      const { result } = renderHook(() => useBlastGame(defaultConfig));

      act(() => {
        result.current.clearTilesForWord(
          [{ row: 0, col: 0 }, { row: 0, col: 1 }],
          'at',
          5
        );
      });

      const resultsData = result.current.getResultsData(3);

      expect(resultsData.finalScore).toBe(5);
      expect(resultsData.tilesCleared).toBe(2);
      expect(resultsData.totalTiles).toBe(16);
      expect(resultsData.wordsFound).toContain('at');
    });

    it('should calculate star rating based on clear percentage', () => {
      const { result } = renderHook(() => useBlastGame({
        gridSize: 2,
        specialTileChance: 0,
        language: 'en',
      }));

      // Clear all tiles for 3 stars
      act(() => {
        result.current.clearTilesForWord(
          [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }],
          'test',
          10
        );
      });

      const results = result.current.getResultsData(5);
      expect(results.stars).toBe(3);
      expect(results.clearPercentage).toBe(100);
    });
  });

  describe('give up / end game', () => {
    it('should mark game as dead end when endGame is called', () => {
      const { result } = renderHook(() => useBlastGame(defaultConfig));

      act(() => {
        result.current.endGame();
      });

      expect(result.current.gameState.isDeadEnd).toBe(true);
    });
  });
});
