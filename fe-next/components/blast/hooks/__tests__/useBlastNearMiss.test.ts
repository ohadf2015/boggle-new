/**
 * useBlastNearMiss - Tests for near-miss shimmer state hook.
 */
import { renderHook, act } from '@testing-library/react';
import { useBlastNearMiss } from '../useBlastNearMiss';
import type { BlastTileState, BlastTileType } from '../../types';

// ==================== Helpers ====================

function makeTileStates(
  gridSize: number,
  overrides: Array<{ row: number; col: number; type: BlastTileType }> = [],
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
    grid[o.row][o.col].type = o.type;
  }
  return grid;
}

function makeGrid(gridSize: number): string[][] {
  return Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => 'A'),
  );
}

// ==================== Tests ====================

describe('useBlastNearMiss', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should initialize with empty shimmerCells', () => {
    const { result } = renderHook(() => useBlastNearMiss());

    expect(result.current.shimmerCells).toEqual([]);
  });

  it('should expose a check function', () => {
    const { result } = renderHook(() => useBlastNearMiss());

    expect(typeof result.current.check).toBe('function');
  });

  it('should set shimmerCells when near-miss is detected', () => {
    const gridSize = 6;
    const tileStates = makeTileStates(gridSize, [
      { row: 1, col: 2, type: 'bomb' },
      { row: 1, col: 3, type: 'lightning' },
    ]);
    const grid = makeGrid(gridSize);
    const path = [{ row: 2, col: 2 }, { row: 2, col: 3 }];

    const { result } = renderHook(() => useBlastNearMiss());

    act(() => {
      result.current.check(path, grid, tileStates, gridSize);
    });

    expect(result.current.shimmerCells.length).toBeGreaterThan(0);
  });

  it('should auto-clear shimmerCells after 1500ms', () => {
    const gridSize = 6;
    const tileStates = makeTileStates(gridSize, [
      { row: 1, col: 2, type: 'bomb' },
      { row: 1, col: 3, type: 'lightning' },
    ]);
    const grid = makeGrid(gridSize);
    const path = [{ row: 2, col: 2 }, { row: 2, col: 3 }];

    const { result } = renderHook(() => useBlastNearMiss());

    act(() => {
      result.current.check(path, grid, tileStates, gridSize);
    });

    expect(result.current.shimmerCells.length).toBeGreaterThan(0);

    act(() => {
      jest.advanceTimersByTime(1500);
    });

    expect(result.current.shimmerCells).toEqual([]);
  });

  it('should not set shimmerCells when no near-miss', () => {
    const gridSize = 6;
    const tileStates = makeTileStates(gridSize);
    const grid = makeGrid(gridSize);
    const path = [{ row: 2, col: 2 }, { row: 2, col: 3 }];

    const { result } = renderHook(() => useBlastNearMiss());

    act(() => {
      result.current.check(path, grid, tileStates, gridSize);
    });

    expect(result.current.shimmerCells).toEqual([]);
  });

  it('should skip detection when hadCombo is true', () => {
    const gridSize = 6;
    const tileStates = makeTileStates(gridSize, [
      { row: 1, col: 2, type: 'bomb' },
      { row: 1, col: 3, type: 'lightning' },
    ]);
    const grid = makeGrid(gridSize);
    const path = [{ row: 2, col: 2 }, { row: 2, col: 3 }];

    const { result } = renderHook(() => useBlastNearMiss());

    act(() => {
      result.current.check(path, grid, tileStates, gridSize, true);
    });

    expect(result.current.shimmerCells).toEqual([]);
  });

  it('should not clear prematurely before 1500ms', () => {
    const gridSize = 6;
    const tileStates = makeTileStates(gridSize, [
      { row: 1, col: 2, type: 'bomb' },
      { row: 1, col: 3, type: 'lightning' },
    ]);
    const grid = makeGrid(gridSize);
    const path = [{ row: 2, col: 2 }, { row: 2, col: 3 }];

    const { result } = renderHook(() => useBlastNearMiss());

    act(() => {
      result.current.check(path, grid, tileStates, gridSize);
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    // At 500ms (within 900ms window), should still be showing
    expect(result.current.shimmerCells.length).toBeGreaterThan(0);
  });

  it('should reset timer when check is called again before auto-clear', () => {
    const gridSize = 6;
    const tileStates = makeTileStates(gridSize, [
      { row: 1, col: 2, type: 'bomb' },
      { row: 1, col: 3, type: 'lightning' },
    ]);
    const grid = makeGrid(gridSize);
    const path = [{ row: 2, col: 2 }, { row: 2, col: 3 }];

    const { result } = renderHook(() => useBlastNearMiss());

    act(() => {
      result.current.check(path, grid, tileStates, gridSize);
    });

    // Advance 500ms (not yet cleared within 900ms window)
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Call check again — resets timer
    act(() => {
      result.current.check(path, grid, tileStates, gridSize);
    });

    // Advance another 500ms (only 500ms since last check, not 900ms total)
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Should still be active
    expect(result.current.shimmerCells.length).toBeGreaterThan(0);
  });

  it('should clean up timer on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const gridSize = 6;
    const tileStates = makeTileStates(gridSize, [
      { row: 1, col: 2, type: 'bomb' },
      { row: 1, col: 3, type: 'lightning' },
    ]);
    const grid = makeGrid(gridSize);
    const path = [{ row: 2, col: 2 }, { row: 2, col: 3 }];

    const { result, unmount } = renderHook(() => useBlastNearMiss());

    act(() => {
      result.current.check(path, grid, tileStates, gridSize);
    });

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
