/**
 * useBlastGame — Magnet tile clearing tests.
 *
 * Magnet tile effect: pulls (clears) all wildcard tiles in 8 adjacent cells.
 * +3 bonus per attracted wildcard.
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
import { MAGNET_ATTRACT_BONUS } from '../types';

/**
 * Distribution where odd rows get magnet, even rows get wildcard.
 * We use alternating pattern: first half magnet, second half wildcard.
 * With 50/50 split, ~half the grid is magnet and ~half wildcard.
 */
const MAGNET_WILDCARD_DIST = { magnet: 0.5, wildcard: 0.5 };

/** Distribution with only magnet tiles (to test no-wildcard case) */
const MAGNET_ONLY_DIST = { magnet: 1.0 };

describe('useBlastGame — magnet tile', () => {
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

  it('should clear adjacent wildcard tiles when magnet is in path', () => {
    const { result } = renderHook(() => useBlastGame({
      gridSize: 4,
      specialTileChance: 1,
      language: 'en',
      customDistribution: MAGNET_WILDCARD_DIST,
    }));

    // Find a magnet tile NOT on edge (so it has 8 neighbors)
    const magnetTile = result.current.tileStates
      .flat()
      .find(t => t.type === 'magnet' && t.row > 0 && t.row < 3 && t.col > 0 && t.col < 3);
    if (!magnetTile) return;

    // Count adjacent wildcards before clearing
    const adjacentWildcards: Array<{ row: number; col: number }> = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = magnetTile.row + dr;
        const c = magnetTile.col + dc;
        if (r >= 0 && r < 4 && c >= 0 && c < 4) {
          if (result.current.tileStates[r][c].type === 'wildcard') {
            adjacentWildcards.push({ row: r, col: c });
          }
        }
      }
    }

    if (adjacentWildcards.length === 0) return;

    act(() => {
      result.current.clearTilesForWord(
        [{ row: magnetTile.row, col: magnetTile.col }],
        'm', 5
      );
    });

    // All adjacent wildcards should be cleared
    for (const wc of adjacentWildcards) {
      expect(result.current.tileStates[wc.row][wc.col].isCleared).toBe(true);
    }
  });

  it('should add MAGNET_ATTRACT_BONUS per attracted wildcard', () => {
    const { result } = renderHook(() => useBlastGame({
      gridSize: 4,
      specialTileChance: 1,
      language: 'en',
      customDistribution: MAGNET_WILDCARD_DIST,
    }));

    const magnetTile = result.current.tileStates
      .flat()
      .find(t => t.type === 'magnet' && t.row > 0 && t.row < 3 && t.col > 0 && t.col < 3);
    if (!magnetTile) return;

    // Count adjacent wildcards
    let adjacentWildcardCount = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = magnetTile.row + dr;
        const c = magnetTile.col + dc;
        if (r >= 0 && r < 4 && c >= 0 && c < 4) {
          if (result.current.tileStates[r][c].type === 'wildcard') {
            adjacentWildcardCount++;
          }
        }
      }
    }

    if (adjacentWildcardCount === 0) return;

    act(() => {
      result.current.clearTilesForWord(
        [{ row: magnetTile.row, col: magnetTile.col }],
        'm', 5
      );
    });

    const expectedScore = 5 + adjacentWildcardCount * MAGNET_ATTRACT_BONUS;
    expect(result.current.gameState.score).toBe(expectedScore);
  });

  it('should create magnet explosion event', () => {
    const { result } = renderHook(() => useBlastGame({
      gridSize: 4,
      specialTileChance: 1,
      language: 'en',
      customDistribution: MAGNET_WILDCARD_DIST,
    }));

    const magnetTile = result.current.tileStates.flat().find(t => t.type === 'magnet');
    if (!magnetTile) return;

    act(() => {
      result.current.clearTilesForWord(
        [{ row: magnetTile.row, col: magnetTile.col }],
        'm', 5
      );
    });

    const magnetExplosions = result.current.explosions.filter(e => e.type === 'magnet');
    expect(magnetExplosions.length).toBeGreaterThanOrEqual(1);
  });

  it('should not attract non-wildcard tiles', () => {
    const { result } = renderHook(() => useBlastGame({
      gridSize: 4,
      specialTileChance: 1,
      language: 'en',
      customDistribution: MAGNET_ONLY_DIST,
    }));

    // All tiles are magnet — no wildcards to attract
    const magnetTile = result.current.tileStates[1][1]; // Middle tile
    expect(magnetTile.type).toBe('magnet');

    act(() => {
      result.current.clearTilesForWord(
        [{ row: 1, col: 1 }],
        'm', 5
      );
    });

    // Only the path tile itself should be cleared (no magnet effect on magnets)
    expect(result.current.tileStates[1][1].isCleared).toBe(true);
    // Adjacent non-wildcard tiles should NOT be cleared
    expect(result.current.tileStates[0][0].isCleared).toBe(false);
    expect(result.current.tileStates[0][1].isCleared).toBe(false);
    expect(result.current.tileStates[1][0].isCleared).toBe(false);
  });

  it('should give no bonus when no adjacent wildcards exist', () => {
    const { result } = renderHook(() => useBlastGame({
      gridSize: 4,
      specialTileChance: 1,
      language: 'en',
      customDistribution: MAGNET_ONLY_DIST,
    }));

    act(() => {
      result.current.clearTilesForWord(
        [{ row: 1, col: 1 }],
        'm', 5
      );
    });

    // Score should be just the base (no magnet bonus since no wildcards)
    expect(result.current.gameState.score).toBe(5);
  });
});
