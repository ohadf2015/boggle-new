/**
 * useBlastSugarCrush - Tests for the Sugar Crush orchestration hook.
 * Verifies timed sequence execution, cleanup, and completion callback.
 */
import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBlastSugarCrush } from '../useBlastSugarCrush';
import type { BlastTileState } from '../../types';

// ==================== Mocks ====================

vi.mock('../../utils/blastSugarCrush', () => ({
  planSugarCrush: vi.fn(),
  SUGAR_CRUSH_STAGGER_MS: 300,
}));

import { planSugarCrush } from '../../utils/blastSugarCrush';
const mockPlanSugarCrush = planSugarCrush as any;

// ==================== Helpers ====================

function makeStandardGrid(size: number): BlastTileState[][] {
  const grid: BlastTileState[][] = [];
  for (let r = 0; r < size; r++) {
    grid[r] = [];
    for (let c = 0; c < size; c++) {
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
  return grid;
}

// ==================== Tests ====================

describe('useBlastSugarCrush', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockPlanSugarCrush.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('should not be active initially', () => {
      const { result } = renderHook(() => useBlastSugarCrush());
      expect(result.current.isActive).toBe(false);
    });

    it('should expose start and cancel functions', () => {
      const { result } = renderHook(() => useBlastSugarCrush());
      expect(typeof result.current.start).toBe('function');
      expect(typeof result.current.cancel).toBe('function');
    });
  });

  describe('start()', () => {
    it('should set isActive to true immediately when sequence starts', () => {
      // GIVEN: planSugarCrush returns 2 steps
      mockPlanSugarCrush.mockReturnValue([
        { row: 0, col: 0, convertTo: 'bomb', delayMs: 300, intensity: 'low' },
        { row: 1, col: 1, convertTo: 'rainbow', delayMs: 600, intensity: 'high' },
      ]);

      const grid = makeStandardGrid(4);
      const setTileStates = vi.fn();
      const addExplosion = vi.fn();
      const addScore = vi.fn();
      const onComplete = vi.fn();

      const { result } = renderHook(() => useBlastSugarCrush());

      // WHEN
      act(() => {
        result.current.start(grid, 4, setTileStates, addExplosion, addScore, onComplete);
      });

      // THEN
      expect(result.current.isActive).toBe(true);
    });

    it('should call planSugarCrush with tileStates and gridSize', () => {
      // GIVEN
      mockPlanSugarCrush.mockReturnValue([]);

      const grid = makeStandardGrid(5);
      const setTileStates = vi.fn();
      const addExplosion = vi.fn();
      const addScore = vi.fn();
      const onComplete = vi.fn();

      const { result } = renderHook(() => useBlastSugarCrush());

      // WHEN
      act(() => {
        result.current.start(grid, 5, setTileStates, addExplosion, addScore, onComplete);
      });

      // THEN
      expect(mockPlanSugarCrush).toHaveBeenCalledWith(grid, 5);
    });

    it('should call onComplete immediately when no steps are planned', () => {
      // GIVEN: empty plan
      mockPlanSugarCrush.mockReturnValue([]);

      const grid = makeStandardGrid(4);
      const setTileStates = vi.fn();
      const addExplosion = vi.fn();
      const addScore = vi.fn();
      const onComplete = vi.fn();

      const { result } = renderHook(() => useBlastSugarCrush());

      // WHEN
      act(() => {
        result.current.start(grid, 4, setTileStates, addExplosion, addScore, onComplete);
      });

      // THEN: completes immediately, no timers needed
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledWith(0); // totalBonusScore = 0
      expect(result.current.isActive).toBe(false);
    });

    it('should set isActive back to false after all steps complete', () => {
      // GIVEN
      mockPlanSugarCrush.mockReturnValue([
        { row: 0, col: 0, convertTo: 'bomb', delayMs: 300, intensity: 'low' },
      ]);

      const grid = makeStandardGrid(4);
      const setTileStates = vi.fn();
      const addExplosion = vi.fn();
      const addScore = vi.fn();
      const onComplete = vi.fn();

      const { result } = renderHook(() => useBlastSugarCrush());

      act(() => {
        result.current.start(grid, 4, setTileStates, addExplosion, addScore, onComplete);
      });

      expect(result.current.isActive).toBe(true);

      // WHEN: advance past the last step's delay
      act(() => {
        vi.advanceTimersByTime(400);
      });

      // THEN
      expect(result.current.isActive).toBe(false);
    });
  });

  describe('step execution', () => {
    it('should call setTileStates to convert tile type at each step delay', () => {
      // GIVEN
      mockPlanSugarCrush.mockReturnValue([
        { row: 2, col: 3, convertTo: 'bomb', delayMs: 300, intensity: 'low' },
      ]);

      const grid = makeStandardGrid(6);
      const setTileStates = vi.fn();
      const addExplosion = vi.fn();
      const addScore = vi.fn();
      const onComplete = vi.fn();

      const { result } = renderHook(() => useBlastSugarCrush());

      act(() => {
        result.current.start(grid, 6, setTileStates, addExplosion, addScore, onComplete);
      });

      // Before delay: setTileStates not called yet
      expect(setTileStates).not.toHaveBeenCalled();

      // WHEN: advance to step delay
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // THEN: setTileStates called with updater function
      expect(setTileStates).toHaveBeenCalledTimes(1);
      // Verify the updater converts the correct tile
      const updater = setTileStates.mock.calls[0][0];
      const updatedGrid = updater(grid);
      expect(updatedGrid[2][3].type).toBe('bomb');
    });

    it('should call addExplosion for each step when it fires', () => {
      // GIVEN
      mockPlanSugarCrush.mockReturnValue([
        { row: 0, col: 0, convertTo: 'bomb', delayMs: 300, intensity: 'low' },
        { row: 1, col: 1, convertTo: 'rainbow', delayMs: 500, intensity: 'high' },
      ]);

      const grid = makeStandardGrid(4);
      const setTileStates = vi.fn();
      const addExplosion = vi.fn();
      const addScore = vi.fn();
      const onComplete = vi.fn();

      const { result } = renderHook(() => useBlastSugarCrush());

      act(() => {
        result.current.start(grid, 4, setTileStates, addExplosion, addScore, onComplete);
      });

      // First step fires
      act(() => vi.advanceTimersByTime(300));
      expect(addExplosion).toHaveBeenCalledTimes(1);

      // Second step fires
      act(() => vi.advanceTimersByTime(200));
      expect(addExplosion).toHaveBeenCalledTimes(2);
    });

    it('should call addScore for each step with positive bonus', () => {
      // GIVEN
      mockPlanSugarCrush.mockReturnValue([
        { row: 0, col: 0, convertTo: 'bomb', delayMs: 300, intensity: 'low' },
      ]);

      const grid = makeStandardGrid(4);
      const setTileStates = vi.fn();
      const addExplosion = vi.fn();
      const addScore = vi.fn();
      const onComplete = vi.fn();

      const { result } = renderHook(() => useBlastSugarCrush());

      act(() => {
        result.current.start(grid, 4, setTileStates, addExplosion, addScore, onComplete);
      });

      act(() => vi.advanceTimersByTime(300));

      expect(addScore).toHaveBeenCalledTimes(1);
      const scoreArg = addScore.mock.calls[0][0];
      expect(scoreArg).toBeGreaterThan(0);
    });

    it('should call onComplete with total bonus score after all steps', () => {
      // GIVEN: 2 steps
      mockPlanSugarCrush.mockReturnValue([
        { row: 0, col: 0, convertTo: 'bomb', delayMs: 300, intensity: 'low' },
        { row: 1, col: 1, convertTo: 'rainbow', delayMs: 500, intensity: 'high' },
      ]);

      const grid = makeStandardGrid(4);
      const setTileStates = vi.fn();
      const addExplosion = vi.fn();
      const addScore = vi.fn();
      const onComplete = vi.fn();

      const { result } = renderHook(() => useBlastSugarCrush());

      act(() => {
        result.current.start(grid, 4, setTileStates, addExplosion, addScore, onComplete);
      });

      // Execute both steps
      act(() => vi.advanceTimersByTime(600));

      // THEN: onComplete called once with accumulated bonus
      expect(onComplete).toHaveBeenCalledTimes(1);
      const bonusArg = onComplete.mock.calls[0][0];
      expect(typeof bonusArg).toBe('number');
      expect(bonusArg).toBeGreaterThan(0);
    });

    it('should execute steps in order (staggered, not all at once)', () => {
      // GIVEN: 2 steps with different delays
      mockPlanSugarCrush.mockReturnValue([
        { row: 0, col: 0, convertTo: 'bomb', delayMs: 300, intensity: 'low' },
        { row: 1, col: 1, convertTo: 'lightning', delayMs: 550, intensity: 'medium' },
      ]);

      const grid = makeStandardGrid(4);
      const setTileStates = vi.fn();
      const addExplosion = vi.fn();
      const addScore = vi.fn();
      const onComplete = vi.fn();

      const { result } = renderHook(() => useBlastSugarCrush());

      act(() => {
        result.current.start(grid, 4, setTileStates, addExplosion, addScore, onComplete);
      });

      // After 300ms: only first step fired
      act(() => vi.advanceTimersByTime(300));
      expect(setTileStates).toHaveBeenCalledTimes(1);
      expect(onComplete).not.toHaveBeenCalled();

      // After 550ms: both steps fired, completion triggered
      act(() => vi.advanceTimersByTime(250));
      expect(setTileStates).toHaveBeenCalledTimes(2);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('cancel()', () => {
    it('should stop sequence when cancel is called', () => {
      // GIVEN: sequence in progress
      mockPlanSugarCrush.mockReturnValue([
        { row: 0, col: 0, convertTo: 'bomb', delayMs: 300, intensity: 'low' },
        { row: 1, col: 1, convertTo: 'rainbow', delayMs: 600, intensity: 'high' },
      ]);

      const grid = makeStandardGrid(4);
      const setTileStates = vi.fn();
      const addExplosion = vi.fn();
      const addScore = vi.fn();
      const onComplete = vi.fn();

      const { result } = renderHook(() => useBlastSugarCrush());

      act(() => {
        result.current.start(grid, 4, setTileStates, addExplosion, addScore, onComplete);
      });

      // WHEN: cancel before any step fires
      act(() => {
        result.current.cancel();
      });

      // Advance timers
      act(() => vi.advanceTimersByTime(1000));

      // THEN: no steps executed, no completion
      expect(setTileStates).not.toHaveBeenCalled();
      expect(onComplete).not.toHaveBeenCalled();
      expect(result.current.isActive).toBe(false);
    });

    it('should set isActive to false when cancelled', () => {
      // GIVEN
      mockPlanSugarCrush.mockReturnValue([
        { row: 0, col: 0, convertTo: 'bomb', delayMs: 500, intensity: 'low' },
      ]);

      const grid = makeStandardGrid(4);
      const setTileStates = vi.fn();
      const addExplosion = vi.fn();
      const addScore = vi.fn();
      const onComplete = vi.fn();

      const { result } = renderHook(() => useBlastSugarCrush());

      act(() => {
        result.current.start(grid, 4, setTileStates, addExplosion, addScore, onComplete);
      });

      expect(result.current.isActive).toBe(true);

      // WHEN
      act(() => {
        result.current.cancel();
      });

      // THEN
      expect(result.current.isActive).toBe(false);
    });
  });

  describe('timer cleanup on unmount', () => {
    it('should clean up timers when component unmounts mid-sequence', () => {
      // GIVEN: long sequence
      mockPlanSugarCrush.mockReturnValue([
        { row: 0, col: 0, convertTo: 'bomb', delayMs: 1000, intensity: 'low' },
        { row: 1, col: 1, convertTo: 'rainbow', delayMs: 2000, intensity: 'high' },
      ]);

      const grid = makeStandardGrid(4);
      const setTileStates = vi.fn();
      const addExplosion = vi.fn();
      const addScore = vi.fn();
      const onComplete = vi.fn();

      const { result, unmount } = renderHook(() => useBlastSugarCrush());

      act(() => {
        result.current.start(grid, 4, setTileStates, addExplosion, addScore, onComplete);
      });

      // WHEN: unmount before sequence completes
      unmount();

      // Advance timers — no callbacks should fire
      act(() => vi.advanceTimersByTime(3000));

      // THEN: no state updates or callbacks after unmount
      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  describe('tile conversion correctness', () => {
    it('should convert tile in place preserving row/col', () => {
      // GIVEN
      mockPlanSugarCrush.mockReturnValue([
        { row: 3, col: 2, convertTo: 'lightning', delayMs: 300, intensity: 'medium' },
      ]);

      const grid = makeStandardGrid(6);
      const setTileStates = vi.fn();
      const addExplosion = vi.fn();
      const addScore = vi.fn();
      const onComplete = vi.fn();

      const { result } = renderHook(() => useBlastSugarCrush());

      act(() => {
        result.current.start(grid, 6, setTileStates, addExplosion, addScore, onComplete);
      });

      act(() => vi.advanceTimersByTime(300));

      // Verify conversion: get updater and apply it
      const updater = setTileStates.mock.calls[0][0];
      const updatedGrid = updater(grid);
      const tile = updatedGrid[3][2];
      expect(tile.type).toBe('lightning');
      expect(tile.row).toBe(3);
      expect(tile.col).toBe(2);
    });

    it('should not modify tiles at other positions', () => {
      // GIVEN: only one tile in the plan
      mockPlanSugarCrush.mockReturnValue([
        { row: 0, col: 0, convertTo: 'bomb', delayMs: 300, intensity: 'low' },
      ]);

      const grid = makeStandardGrid(4);
      const setTileStates = vi.fn();
      const addExplosion = vi.fn();
      const addScore = vi.fn();
      const onComplete = vi.fn();

      const { result } = renderHook(() => useBlastSugarCrush());

      act(() => {
        result.current.start(grid, 4, setTileStates, addExplosion, addScore, onComplete);
      });

      act(() => vi.advanceTimersByTime(300));

      // Apply updater to original grid
      const updater = setTileStates.mock.calls[0][0];
      const updatedGrid = updater(grid);

      // Other tiles should still be standard
      expect(updatedGrid[0][1].type).toBe('standard');
      expect(updatedGrid[1][0].type).toBe('standard');
      expect(updatedGrid[3][3].type).toBe('standard');
    });
  });
});
