/**
 * useBlastHotTiles - Tests for hot tile time-pressure mechanic.
 * TDD: written before implementation (RED phase).
 */
import { renderHook, act } from '@testing-library/react';
import type { BlastTileState, BlastTileType } from '../../types';

// ==================== Helpers ====================

function makeTileStates(
  gridSize: number,
  overrides: Array<{ row: number; col: number; type?: BlastTileType; isCleared?: boolean }> = [],
): BlastTileState[][] {
  const grid: BlastTileState[][] = [];
  for (let r = 0; r < gridSize; r++) {
    grid[r] = [];
    for (let c = 0; c < gridSize; c++) {
      grid[r][c] = {
        row: r,
        col: c,
        type: 'standard',
        isCleared: false,
        activationEffect: null,
        hitsRemaining: 0,
      };
    }
  }
  for (const o of overrides) {
    if (o.type) grid[o.row][o.col].type = o.type;
    if (o.isCleared) grid[o.row][o.col].isCleared = true;
  }
  return grid;
}

// Import after helpers defined
import { useBlastHotTiles, HOT_TILE_MULTIPLIER } from '../useBlastHotTiles';

// ==================== Tests ====================

describe('useBlastHotTiles', () => {
  const defaultOptions = {
    gridSize: 6,
    roundDuration: 60000,
    tileStates: makeTileStates(6),
    enabled: true,
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should have no hot tiles before activation threshold', () => {
    const { result } = renderHook(() => useBlastHotTiles(defaultOptions));

    // At 50% elapsed (before default 75% threshold)
    act(() => {
      result.current.onTimerUpdate(30000);
    });

    expect(result.current.isHotPhase).toBe(false);
    expect(result.current.hotTiles).toHaveLength(0);
  });

  it('should activate hot tiles after threshold', () => {
    const { result } = renderHook(() => useBlastHotTiles(defaultOptions));

    // At 76% elapsed (past default 75% threshold)
    act(() => {
      result.current.onTimerUpdate(45600);
    });

    expect(result.current.isHotPhase).toBe(true);
    expect(result.current.hotTiles.length).toBeGreaterThan(0);
  });

  it('should only place hot tiles on non-cleared standard tiles', () => {
    const tileStates = makeTileStates(6, [
      { row: 0, col: 0, type: 'gold' },
      { row: 0, col: 1, type: 'bomb' },
      { row: 1, col: 0, isCleared: true },
    ]);

    const { result } = renderHook(() =>
      useBlastHotTiles({ ...defaultOptions, tileStates }),
    );

    act(() => {
      result.current.onTimerUpdate(46000);
    });

    for (const ht of result.current.hotTiles) {
      const tile = tileStates[ht.row][ht.col];
      expect(tile.type).toBe('standard');
      expect(tile.isCleared).toBe(false);
    }
  });

  it('should remove hot tile when onHotTileUsed is called', () => {
    const { result } = renderHook(() => useBlastHotTiles(defaultOptions));

    act(() => {
      result.current.onTimerUpdate(46000);
    });

    const firstHot = result.current.hotTiles[0];
    expect(firstHot).toBeDefined();

    act(() => {
      result.current.onHotTileUsed(firstHot.row, firstHot.col);
    });

    expect(result.current.isHotTile(firstHot.row, firstHot.col)).toBe(false);
  });

  it('should return correct multiplier for hot vs non-hot tiles', () => {
    const { result } = renderHook(() => useBlastHotTiles(defaultOptions));

    act(() => {
      result.current.onTimerUpdate(46000);
    });

    const firstHot = result.current.hotTiles[0];
    expect(result.current.getHotMultiplier(firstHot.row, firstHot.col)).toBe(HOT_TILE_MULTIPLIER);
    // Non-hot tile
    expect(result.current.getHotMultiplier(5, 5)).toBe(1);
  });

  it('should refresh hot tiles after interval', () => {
    const { result } = renderHook(() =>
      useBlastHotTiles({ ...defaultOptions, refreshInterval: 8000 }),
    );

    act(() => {
      result.current.onTimerUpdate(46000);
    });

    const initialTiles = result.current.hotTiles.map(t => `${t.row}-${t.col}`);

    // Advance past refresh interval
    act(() => {
      jest.advanceTimersByTime(8100);
    });

    // After refresh, tiles should have been regenerated
    // (they may or may not be the same positions due to randomness,
    // but the createdAt should differ)
    const refreshedTiles = result.current.hotTiles;
    expect(refreshedTiles.length).toBeGreaterThan(0);
    // Verify they have newer timestamps
    for (const tile of refreshedTiles) {
      expect(tile.createdAt).toBeGreaterThanOrEqual(Date.now() - 100);
    }
  });

  it('should respect the count limit', () => {
    const { result } = renderHook(() =>
      useBlastHotTiles({ ...defaultOptions, count: 3 }),
    );

    act(() => {
      result.current.onTimerUpdate(46000);
    });

    expect(result.current.hotTiles.length).toBeLessThanOrEqual(3);
  });

  it('should respect count=2 default', () => {
    const { result } = renderHook(() => useBlastHotTiles(defaultOptions));

    act(() => {
      result.current.onTimerUpdate(46000);
    });

    expect(result.current.hotTiles.length).toBeLessThanOrEqual(2);
  });

  it('should not activate when enabled=false', () => {
    const { result } = renderHook(() =>
      useBlastHotTiles({ ...defaultOptions, enabled: false }),
    );

    act(() => {
      result.current.onTimerUpdate(46000);
    });

    expect(result.current.isHotPhase).toBe(false);
    expect(result.current.hotTiles).toHaveLength(0);
  });
});
