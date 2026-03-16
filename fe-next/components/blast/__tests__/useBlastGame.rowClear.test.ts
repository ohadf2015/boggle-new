/**
 * useBlastGame — Row-clear on 7+ letter words.
 *
 * When a player submits a word with 7+ letters, all standard tiles
 * in the row of the path's middle tile are cleared as a bonus.
 * Special tiles are preserved to prevent accidental destruction.
 */

import { renderHook, act } from '@testing-library/react';

// Mock dependencies
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
import type { BlastGameConfig } from '../types';

const config: BlastGameConfig = {
  gridSize: 6,
  specialTileChance: 0, // all standard tiles for predictable testing
  language: 'en',
};

describe('useBlastGame — row-clear on 7+ letter words', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ words: ['testing', 'example', 'castles'] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          words: { easy: ['at'], medium: ['test'], hard: ['castles'] },
        }),
      }) as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('clears standard tiles in the row of the middle path cell on 7+ letter word', () => {
    const { result } = renderHook(() => useBlastGame(config));

    // Create a 7-cell path spanning row 2 (middle cell will be path[3] = row 2)
    const path = [
      { row: 2, col: 0 },
      { row: 2, col: 1 },
      { row: 2, col: 2 },
      { row: 2, col: 3 }, // middle cell
      { row: 2, col: 4 },
      { row: 3, col: 4 },
      { row: 3, col: 5 },
    ];

    act(() => {
      result.current.clearTilesForWord(path, 'EXAMPLE', 10);
    });

    // Row 2: all standard tiles should be cleared (path tiles + row-clear bonus)
    for (let c = 0; c < 6; c++) {
      expect(result.current.tileStates[2][c].isCleared).toBe(true);
    }
  });

  it('does NOT trigger row-clear for 6-letter words', () => {
    const { result } = renderHook(() => useBlastGame(config));

    // 6-cell path in row 1
    const path = [
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 1, col: 2 },
      { row: 1, col: 3 },
      { row: 1, col: 4 },
      { row: 1, col: 5 },
    ];

    act(() => {
      result.current.clearTilesForWord(path, 'CASTLE', 8);
    });

    // Only the 6 path tiles should be cleared — no row bonus
    const clearedInRow1 = result.current.tileStates[1].filter(t => t.isCleared).length;
    expect(clearedInRow1).toBe(6); // exactly the path tiles
  });

  it('preserves special tiles during row-clear', () => {
    // Use a config that forces all tiles to be gold
    const goldConfig: BlastGameConfig = {
      gridSize: 6,
      specialTileChance: 1,
      language: 'en',
      customDistribution: { gold: 1.0 },
    };

    const { result } = renderHook(() => useBlastGame(goldConfig));

    // Verify tiles are gold
    expect(result.current.tileStates[2][5].type).toBe('gold');

    // 7-cell path through row 2
    const path = [
      { row: 0, col: 0 },
      { row: 1, col: 0 },
      { row: 2, col: 0 },
      { row: 2, col: 1 }, // middle
      { row: 2, col: 2 },
      { row: 2, col: 3 },
      { row: 2, col: 4 },
    ];

    act(() => {
      result.current.clearTilesForWord(path, 'DRAGONS', 12);
    });

    // Gold tiles NOT in the path should NOT be row-cleared (only standard tiles are)
    // col 5 in row 2 is gold and not in path — should survive
    expect(result.current.tileStates[2][5].isCleared).toBe(false);
  });

  it('creates explosion events for row-cleared tiles', () => {
    const { result } = renderHook(() => useBlastGame(config));

    const path = [
      { row: 3, col: 0 },
      { row: 3, col: 1 },
      { row: 3, col: 2 },
      { row: 3, col: 3 },
      { row: 3, col: 4 },
      { row: 4, col: 4 },
      { row: 4, col: 5 },
    ];

    act(() => {
      result.current.clearTilesForWord(path, 'CASTLES', 12);
    });

    // Should have row-clear explosions for standard tiles in row 3 that weren't in the path
    // Row 3 col 5 is NOT in the path, so it should get a row-clear explosion
    const rowClearExplosions = result.current.explosions.filter(e => e.id.startsWith('row-clear'));
    expect(rowClearExplosions.length).toBeGreaterThan(0);
    expect(rowClearExplosions.every(e => e.type === 'clear')).toBe(true);
  });

  it('increases tilesCleared count for row-cleared tiles', () => {
    const { result } = renderHook(() => useBlastGame(config));

    const path = [
      { row: 2, col: 0 },
      { row: 2, col: 1 },
      { row: 2, col: 2 },
      { row: 2, col: 3 },
      { row: 2, col: 4 },
      { row: 3, col: 4 },
      { row: 3, col: 5 },
    ];

    act(() => {
      result.current.clearTilesForWord(path, 'EXAMPLE', 10);
    });

    // 7 path tiles + 1 row-clear tile (col 5 in row 2) = 8 total
    // The middle cell is path[3] = (2,3), so row 2 gets cleared.
    // Path already covers cols 0-4 in row 2, so only col 5 is the bonus.
    expect(result.current.gameState.tilesCleared).toBe(8);
  });
});
