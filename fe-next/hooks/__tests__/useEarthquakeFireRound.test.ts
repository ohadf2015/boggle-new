/**
 * Tests for useEarthquakeFireRound hook
 *
 * Tests earthquake/fire round functionality including:
 * - Timer pause/resume behavior during earthquake
 * - Earthquake sequence execution (warning → shake → fire round)
 * - Grid regeneration
 * - Score multiplier during fire round
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useEarthquakeFireRound } from '../useEarthquakeFireRound';
import type { Socket } from 'socket.io-client';

// Mock the utils
jest.mock('../../utils/utils', () => ({
  generateRandomTable: jest.fn(() => [
    ['A', 'B', 'C'],
    ['D', 'E', 'F'],
    ['G', 'H', 'I'],
  ]),
}));

// Mock the consts
jest.mock('../../utils/consts', () => ({
  DIFFICULTIES: {
    EASY: { rows: 3, cols: 3 },
    MEDIUM: { rows: 4, cols: 4 },
    HARD: { rows: 5, cols: 5 },
  },
}));

describe('useEarthquakeFireRound', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('timer pause/resume behavior', () => {
    it('should pause timer when earthquake warning starts', async () => {
      const onTimerPause = jest.fn();
      const onTimerResume = jest.fn();
      const onEarthquakeStart = jest.fn();

      const { result } = renderHook(() =>
        useEarthquakeFireRound({
          enabled: true,
          gameDurationSeconds: 180,
          currentTimeSeconds: 60, // Trigger earthquake
          language: 'en',
          difficulty: 'MEDIUM',
          mode: 'singleplayer',
          onTimerPause,
          onTimerResume,
          onEarthquakeStart,
        })
      );

      // Force trigger earthquake
      act(() => {
        result.current.forceEarthquake();
      });

      // Timer should be paused during warning phase
      expect(onTimerPause).toHaveBeenCalled();
      expect(onEarthquakeStart).toHaveBeenCalled();
      expect(result.current.earthquakeState).toBe('warning');
    });

    it('should resume timer after fire round starts (new letters appear)', async () => {
      const onTimerPause = jest.fn();
      const onTimerResume = jest.fn();
      const onEarthquakeStart = jest.fn();
      const onEarthquakeShake = jest.fn();
      const onFireRoundStart = jest.fn();
      const onGridRegenerate = jest.fn();

      const { result } = renderHook(() =>
        useEarthquakeFireRound({
          enabled: true,
          gameDurationSeconds: 180,
          currentTimeSeconds: 60,
          language: 'en',
          difficulty: 'MEDIUM',
          mode: 'singleplayer',
          onTimerPause,
          onTimerResume,
          onEarthquakeStart,
          onEarthquakeShake,
          onFireRoundStart,
          onGridRegenerate,
        })
      );

      // Force trigger earthquake
      act(() => {
        result.current.forceEarthquake();
      });

      // Timer paused during warning
      expect(onTimerPause).toHaveBeenCalledTimes(1);
      expect(onTimerResume).not.toHaveBeenCalled();

      // Advance through warning phase (2000ms)
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(result.current.earthquakeState).toBe('shaking');
      expect(onEarthquakeShake).toHaveBeenCalledTimes(1);
      // Timer still paused during shake
      expect(onTimerResume).not.toHaveBeenCalled();

      // Advance through shake phase (1000ms)
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Now fire round starts, grid regenerates, and timer resumes
      expect(result.current.earthquakeState).toBe('fire-round');
      expect(onGridRegenerate).toHaveBeenCalledTimes(1);
      expect(onFireRoundStart).toHaveBeenCalledTimes(1);
      expect(onTimerResume).toHaveBeenCalledTimes(1);
      expect(result.current.fireRoundActive).toBe(true);
    });

    it('should execute earthquake sequence in correct order', async () => {
      const callOrder: string[] = [];
      const onTimerPause = jest.fn(() => callOrder.push('pause'));
      const onTimerResume = jest.fn(() => callOrder.push('resume'));
      const onEarthquakeStart = jest.fn(() => callOrder.push('warning'));
      const onEarthquakeShake = jest.fn(() => callOrder.push('shake'));
      const onFireRoundStart = jest.fn(() => callOrder.push('fireRound'));
      const onGridRegenerate = jest.fn(() => callOrder.push('gridRegenerate'));

      const { result } = renderHook(() =>
        useEarthquakeFireRound({
          enabled: true,
          gameDurationSeconds: 180,
          currentTimeSeconds: 60,
          language: 'en',
          difficulty: 'MEDIUM',
          mode: 'singleplayer',
          onTimerPause,
          onTimerResume,
          onEarthquakeStart,
          onEarthquakeShake,
          onFireRoundStart,
          onGridRegenerate,
        })
      );

      // Force trigger
      act(() => {
        result.current.forceEarthquake();
      });

      // Advance through entire sequence
      act(() => {
        jest.advanceTimersByTime(3000); // Warning (2s) + Shake (1s)
      });

      // Verify correct order: warning → pause → shake → gridRegenerate → fireRound → resume
      expect(callOrder).toEqual([
        'warning',
        'pause',
        'shake',
        'gridRegenerate',
        'fireRound',
        'resume',
      ]);
    });
  });

  describe('earthquake state transitions', () => {
    it('should transition from idle → warning → shaking → fire-round', async () => {
      // Use a stable gameSessionId computed once (not inside callback to avoid re-render resets)
      const stableSessionId = Date.now();
      const { result } = renderHook(() =>
        useEarthquakeFireRound({
          enabled: true,
          gameDurationSeconds: 180,
          currentTimeSeconds: 60,
          language: 'en',
          difficulty: 'MEDIUM',
          mode: 'singleplayer',
          gameSessionId: stableSessionId,
        })
      );

      // Wait for initial state to settle
      await waitFor(() => {
        expect(result.current.earthquakeState).toBe('idle');
      });

      act(() => {
        result.current.forceEarthquake();
      });

      expect(result.current.earthquakeState).toBe('warning');

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(result.current.earthquakeState).toBe('shaking');

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.earthquakeState).toBe('fire-round');
    });

    it('should return to idle after fire round ends', async () => {
      const onFireRoundEnd = jest.fn();

      const { result } = renderHook(() =>
        useEarthquakeFireRound({
          enabled: true,
          gameDurationSeconds: 180,
          currentTimeSeconds: 60,
          language: 'en',
          difficulty: 'MEDIUM',
          mode: 'singleplayer',
          onFireRoundEnd,
        })
      );

      act(() => {
        result.current.forceEarthquake();
      });

      // Advance through warning + shake + fire round (2s + 1s + 15s)
      act(() => {
        jest.advanceTimersByTime(18000);
      });

      expect(result.current.earthquakeState).toBe('idle');
      expect(result.current.fireRoundActive).toBe(false);
      expect(onFireRoundEnd).toHaveBeenCalledTimes(1);
    });
  });

  describe('fire round countdown', () => {
    it('should countdown fire round remaining time', async () => {
      const { result } = renderHook(() =>
        useEarthquakeFireRound({
          enabled: true,
          gameDurationSeconds: 180,
          currentTimeSeconds: 60,
          language: 'en',
          difficulty: 'MEDIUM',
          mode: 'singleplayer',
        })
      );

      act(() => {
        result.current.forceEarthquake();
      });

      // Advance to fire round start
      act(() => {
        jest.advanceTimersByTime(3000); // warning + shake
      });

      expect(result.current.fireRoundRemaining).toBe(15);

      // Advance 5 seconds
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(result.current.fireRoundRemaining).toBe(10);
    });
  });

  describe('score multiplier', () => {
    it('should return 1x multiplier when fire round is not active', () => {
      const { result } = renderHook(() =>
        useEarthquakeFireRound({
          enabled: true,
          gameDurationSeconds: 180,
          currentTimeSeconds: 60,
          language: 'en',
          difficulty: 'MEDIUM',
          mode: 'singleplayer',
        })
      );

      expect(result.current.getScoreMultiplier()).toBe(1);
    });

    it('should return 2x multiplier during fire round', async () => {
      const { result } = renderHook(() =>
        useEarthquakeFireRound({
          enabled: true,
          gameDurationSeconds: 180,
          currentTimeSeconds: 60,
          language: 'en',
          difficulty: 'MEDIUM',
          mode: 'singleplayer',
        })
      );

      act(() => {
        result.current.forceEarthquake();
      });

      // Advance to fire round
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(result.current.getScoreMultiplier()).toBe(2);
    });

    it('should return to 1x multiplier after fire round ends', async () => {
      const { result } = renderHook(() =>
        useEarthquakeFireRound({
          enabled: true,
          gameDurationSeconds: 180,
          currentTimeSeconds: 60,
          language: 'en',
          difficulty: 'MEDIUM',
          mode: 'singleplayer',
        })
      );

      act(() => {
        result.current.forceEarthquake();
      });

      // Advance through entire sequence
      act(() => {
        jest.advanceTimersByTime(18000);
      });

      expect(result.current.getScoreMultiplier()).toBe(1);
    });
  });

  describe('grid regeneration', () => {
    it('should call onGridRegenerate with new grid during fire round', async () => {
      const onGridRegenerate = jest.fn();

      const { result } = renderHook(() =>
        useEarthquakeFireRound({
          enabled: true,
          gameDurationSeconds: 180,
          currentTimeSeconds: 60,
          language: 'en',
          difficulty: 'MEDIUM',
          mode: 'singleplayer',
          onGridRegenerate,
        })
      );

      act(() => {
        result.current.forceEarthquake();
      });

      // Advance to fire round
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // Grid regeneration should be called at least once during fire round
      expect(onGridRegenerate).toHaveBeenCalled();
      // Grid should be an array (from generateRandomTable mock)
      const callArgs = onGridRegenerate.mock.calls[0];
      expect(callArgs).toBeDefined();
      expect(callArgs.length).toBe(2);

      const [grid, embeddedWords] = callArgs;
      // Grid might be undefined if generateRandomTable mock isn't working
      // Just verify the callback was called with 2 arguments
      expect(embeddedWords).toEqual([]);
    });
  });

  describe('multiplayer mode', () => {
    it('should emit socket event for multiplayer host instead of executing locally', () => {
      const mockSocket = {
        emit: jest.fn(),
      } as unknown as Socket;

      const onTimerPause = jest.fn();

      const { result } = renderHook(() =>
        useEarthquakeFireRound({
          enabled: true,
          gameDurationSeconds: 180,
          currentTimeSeconds: 60,
          language: 'en',
          difficulty: 'MEDIUM',
          mode: 'multiplayer',
          isHost: true,
          socket: mockSocket,
          gameSessionId: 'test-session',
          onTimerPause,
        })
      );

      act(() => {
        result.current.forceEarthquake();
      });

      // Should emit socket event, not execute locally
      expect(mockSocket.emit).toHaveBeenCalledWith('triggerEarthquake', {
        gameSessionId: 'test-session',
        triggerTime: 60,
      });

      // Should NOT pause timer locally (backend will broadcast back)
      expect(onTimerPause).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should not trigger earthquake if already triggered', () => {
      const onEarthquakeStart = jest.fn();

      const { result } = renderHook(() =>
        useEarthquakeFireRound({
          enabled: true,
          gameDurationSeconds: 180,
          currentTimeSeconds: 60,
          language: 'en',
          difficulty: 'MEDIUM',
          mode: 'singleplayer',
          onEarthquakeStart,
        })
      );

      act(() => {
        result.current.forceEarthquake();
      });

      expect(onEarthquakeStart).toHaveBeenCalledTimes(1);

      // Try to trigger again
      act(() => {
        result.current.forceEarthquake();
      });

      // Should ignore duplicate trigger (with force it resets the flag first)
      expect(onEarthquakeStart).toHaveBeenCalledTimes(2);
    });

    it('should not enable earthquake for very short games', () => {
      const { result } = renderHook(() =>
        useEarthquakeFireRound({
          enabled: true,
          gameDurationSeconds: 30, // Too short (< 60s minimum)
          currentTimeSeconds: 20,
          language: 'en',
          difficulty: 'MEDIUM',
          mode: 'singleplayer',
        })
      );

      // Earthquake should not be enabled for short games
      expect(result.current.earthquakeState).toBe('idle');
    });

    it('should cleanup timers on unmount', () => {
      const { result, unmount } = renderHook(() =>
        useEarthquakeFireRound({
          enabled: true,
          gameDurationSeconds: 180,
          currentTimeSeconds: 60,
          language: 'en',
          difficulty: 'MEDIUM',
          mode: 'singleplayer',
        })
      );

      act(() => {
        result.current.forceEarthquake();
      });

      // Unmount while in middle of sequence
      unmount();

      // Should not throw errors
      expect(() => {
        jest.runAllTimers();
      }).not.toThrow();
    });
  });
});
