/**
 * useBlastGame — Lightning tile clearing tests.
 *
 * Lightning tile effect: clears entire column.
 * Ice tiles in the column get hit (not bypassed).
 * +1 bonus per tile cleared by lightning.
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
import { LIGHTNING_COLUMN_CLEAR_BONUS } from '../types';

/** Distribution that produces only lightning tiles */
const LIGHTNING_ONLY_DIST = { lightning: 1.0 };

/** Distribution that produces lightning + ice (to test ice interaction) */
const LIGHTNING_ICE_DIST = { lightning: 0.5, ice: 0.5 };

describe('useBlastGame — lightning tile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('should clear entire column when lightning tile is in path', () => {
    const { result } = renderHook(() => useBlastGame({
      gridSize: 4,
      specialTileChance: 1,
      language: 'en',
      customDistribution: LIGHTNING_ONLY_DIST,
    }));

    // All tiles should be lightning
    const lightningTile = result.current.tileStates[0][0];
    expect(lightningTile.type).toBe('lightning');

    const col = lightningTile.col;
    act(() => {
      result.current.clearTilesForWord([{ row: 0, col }], 'z', 5);
    });

    // All tiles in column 0 should be cleared
    for (let r = 0; r < 4; r++) {
      expect(result.current.tileStates[r][col].isCleared).toBe(true);
    }
  });

  it('should add lightning bonus per tile cleared in column', () => {
    const { result } = renderHook(() => useBlastGame({
      gridSize: 4,
      specialTileChance: 1,
      language: 'en',
      customDistribution: LIGHTNING_ONLY_DIST,
    }));

    // Clear tile at (0,0) — lightning should clear all 4 tiles in col 0
    act(() => {
      result.current.clearTilesForWord([{ row: 0, col: 0 }], 'z', 5);
    });

    // 3 extra tiles cleared by lightning (rows 1,2,3) × LIGHTNING_COLUMN_CLEAR_BONUS
    const expectedScore = 5 + 3 * LIGHTNING_COLUMN_CLEAR_BONUS;
    expect(result.current.gameState.score).toBe(expectedScore);
  });

  it('should create a lightning explosion event', () => {
    const { result } = renderHook(() => useBlastGame({
      gridSize: 4,
      specialTileChance: 1,
      language: 'en',
      customDistribution: LIGHTNING_ONLY_DIST,
    }));

    act(() => {
      result.current.clearTilesForWord([{ row: 0, col: 0 }], 'z', 5);
    });

    const lightningExplosions = result.current.explosions.filter(e => e.type === 'lightning');
    expect(lightningExplosions.length).toBeGreaterThanOrEqual(1);
  });

  it('should hit ice tiles in column (crack, not bypass)', () => {
    const { result } = renderHook(() => useBlastGame({
      gridSize: 4,
      specialTileChance: 1,
      language: 'en',
      customDistribution: LIGHTNING_ICE_DIST,
    }));

    // Find a lightning tile
    const lightningTile = result.current.tileStates.flat().find(t => t.type === 'lightning');
    if (!lightningTile) return;

    const col = lightningTile.col;
    // Find an ice tile in same column
    const iceTileInCol = result.current.tileStates
      .flat()
      .find(t => t.type === 'ice' && t.col === col && t.row !== lightningTile.row);

    if (!iceTileInCol) return;

    act(() => {
      result.current.clearTilesForWord([{ row: lightningTile.row, col }], 'z', 5);
    });

    // Ice tile should have been hit (hitsRemaining decreased from 2 to 1)
    const iceAfter = result.current.tileStates[iceTileInCol.row][col];
    expect(iceAfter.hitsRemaining).toBeLessThan(2);
  });

  it('should count all column tiles in tilesCleared', () => {
    const { result } = renderHook(() => useBlastGame({
      gridSize: 4,
      specialTileChance: 1,
      language: 'en',
      customDistribution: LIGHTNING_ONLY_DIST,
    }));

    act(() => {
      result.current.clearTilesForWord([{ row: 0, col: 0 }], 'z', 5);
    });

    // 4 tiles cleared (the lightning tile + 3 column tiles)
    expect(result.current.gameState.tilesCleared).toBe(4);
  });
});
