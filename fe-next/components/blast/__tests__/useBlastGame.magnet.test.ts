/**
 * useBlastGame — Vortex (Magnet) tile tests.
 *
 * Vortex redesign: tile type key remains 'magnet' in code.
 * New behavior: pulls tiles within radius 2 toward center, then explodes radius 1.
 * Old behavior (attract wildcards only) removed.
 *
 * Awards VORTEX_PULL_BONUS per tile pulled + VORTEX_EXPLODE_BONUS per tile exploded.
 */

import { renderHook, act } from '@testing-library/react';

// Mock dependencies before importing the hook
vi.mock('@/utils/clientWordValidator', () => ({
  validateWordLocally: vi.fn(() => ({ isValid: true })),
  isWordOnBoard: vi.fn(() => true),
}));

vi.mock('@/hooks/useDictionaryCache', () => ({
  useDictionaryCache: () => ({
    checkWord: vi.fn(() => true),
    isLoaded: true,
  }),
}));

vi.mock('@/hooks/usePrevalidation', () => ({
  usePrevalidation: () => ({
    prefetch: vi.fn(),
    getCached: vi.fn(() => null),
    clearCache: vi.fn(),
  }),
}));

vi.mock('@/utils/haptics', () => ({
  hapticForWordScore: vi.fn(),
  hapticError: vi.fn(),
}));

vi.mock('@/utils/invalidWordTracker', () => ({
  recordNotOnBoard: vi.fn(),
  recordNotInDictionary: vi.fn(),
}));

vi.mock('@/shared/utils/scoring', () => ({
  getComboBonus: vi.fn(() => 0),
}));

import { useBlastGame } from '../hooks/useBlastGame';
import {
  VORTEX_PULL_BONUS,
  VORTEX_EXPLODE_BONUS,
  VORTEX_PULL_RADIUS,
  VORTEX_EXPLODE_RADIUS,
} from '../types';

/** Distribution with only magnet (Vortex) tiles */
const MAGNET_ONLY_DIST = { magnet: 1.0 };

describe('useBlastGame — Vortex (Magnet) tile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn()
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
    vi.restoreAllMocks();
  });

  it('should award score above base when vortex activates (pull + explode bonuses)', () => {
    const { result } = renderHook(() => useBlastGame({
      gridSize: 4,
      specialTileChance: 1,
      language: 'en',
      customDistribution: MAGNET_ONLY_DIST,
    }));

    const baseScore = 5;
    act(() => {
      result.current.clearTilesForWord(
        [{ row: 1, col: 1 }],
        'm', baseScore
      );
    });

    // Vortex awards VORTEX_PULL_BONUS and VORTEX_EXPLODE_BONUS for nearby tiles
    // On a 4x4 all-magnet grid, radius-1 tiles exist and will be exploded.
    expect(result.current.gameState.score).toBeGreaterThan(baseScore);
  });

  it('should create magnet explosion event', () => {
    const { result } = renderHook(() => useBlastGame({
      gridSize: 4,
      specialTileChance: 1,
      language: 'en',
      customDistribution: MAGNET_ONLY_DIST,
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

  it('should explode radius-1 tiles after pull phase', () => {
    const { result } = renderHook(() => useBlastGame({
      gridSize: 5,
      specialTileChance: 1,
      language: 'en',
      customDistribution: MAGNET_ONLY_DIST,
    }));

    // Vortex at center (2,2) — radius-1 tiles should be cleared by explosion
    act(() => {
      result.current.clearTilesForWord(
        [{ row: 2, col: 2 }],
        'm', 5
      );
    });

    // Radius 1 cardinal neighbors should be cleared by vortex explosion
    const radius1Positions = [
      { row: 1, col: 2 },
      { row: 3, col: 2 },
      { row: 2, col: 1 },
      { row: 2, col: 3 },
    ];
    const clearedCount = radius1Positions.filter(
      p => result.current.tileStates[p.row][p.col].isCleared
    ).length;
    expect(clearedCount).toBeGreaterThan(0);
  });

  it('should award VORTEX_PULL_RADIUS constant is 2', () => {
    expect(VORTEX_PULL_RADIUS).toBe(2);
  });

  it('should award VORTEX_EXPLODE_RADIUS constant is 1', () => {
    expect(VORTEX_EXPLODE_RADIUS).toBe(1);
  });

  it('VORTEX_PULL_BONUS and VORTEX_EXPLODE_BONUS are positive', () => {
    expect(VORTEX_PULL_BONUS).toBeGreaterThan(0);
    expect(VORTEX_EXPLODE_BONUS).toBeGreaterThan(0);
  });
});
