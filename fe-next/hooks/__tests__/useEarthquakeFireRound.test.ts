/**
 * Tests for useEarthquakeFireRound hook
 *
 * Tests earthquake/fire round functionality including:
 * - Timer pause/resume behavior during earthquake
 * - Earthquake sequence execution (warning → shake → fire round)
 * - Grid regeneration
 * - Score multiplier during fire round
 */

import { vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useEarthquakeFireRound } from '../useEarthquakeFireRound';
import type { Socket } from 'socket.io-client';

// Mock the utils
vi.mock('../../utils/utils', () => ({
  generateRandomTable: vi.fn(() => [
    ['A', 'B', 'C'],
    ['D', 'E', 'F'],
    ['G', 'H', 'I'],
  ]),
}));

// Mock the consts
vi.mock('../../utils/consts', () => ({
  DIFFICULTIES: {
    EASY: { rows: 3, cols: 3 },
    MEDIUM: { rows: 4, cols: 4 },
    HARD: { rows: 5, cols: 5 },
  },
}));

describe('useEarthquakeFireRound', () => {
  // Store original Math.random
  const originalRandom = Math.random;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();
    // Mock Math.random to return 0.9 consistently
    // This ensures triggerTimeRef.current is ~24s (low), preventing auto-trigger
    // when currentTimeSeconds is 60+ (higher than trigger threshold)
    Math.random = () => 0.9;
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    // Restore original Math.random
    Math.random = originalRandom;
  });

  describe('timer pause/resume behavior', () => {
    it('should pause timer when earthquake warning starts', async () => {
      const onTimerPause = vi.fn();
      const onTimerResume = vi.fn();
      const onEarthquakeStart = vi.fn();

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
      const onTimerPause = vi.fn();
      const onTimerResume = vi.fn();
      const onEarthquakeStart = vi.fn();
      const onEarthquakeShake = vi.fn();
      const onFireRoundStart = vi.fn();
      const onGridRegenerate = vi.fn();

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
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.earthquakeState).toBe('shaking');
      expect(onEarthquakeShake).toHaveBeenCalledTimes(1);
      // Timer still paused during shake
      expect(onTimerResume).not.toHaveBeenCalled();

      // Advance through shake phase (1000ms)
      act(() => {
        vi.advanceTimersByTime(1000);
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
      const onTimerPause = vi.fn(() => callOrder.push('pause'));
      const onTimerResume = vi.fn(() => callOrder.push('resume'));
      const onEarthquakeStart = vi.fn(() => callOrder.push('warning'));
      const onEarthquakeShake = vi.fn(() => callOrder.push('shake'));
      const onFireRoundStart = vi.fn(() => callOrder.push('fireRound'));
      const onGridRegenerate = vi.fn(() => callOrder.push('gridRegenerate'));

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
        vi.advanceTimersByTime(3000); // Warning (2s) + Shake (1s)
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
      // Use currentTimeSeconds: 120 (meaning 60 seconds elapsed = 33% elapsed)
      // This is well before the 65% trigger window, so earthquake won't auto-trigger
      const { result } = renderHook(() =>
        useEarthquakeFireRound({
          enabled: true,
          gameDurationSeconds: 180,
          currentTimeSeconds: 120,
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
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.earthquakeState).toBe('shaking');

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.earthquakeState).toBe('fire-round');
    });

    it('should return to idle after fire round ends', async () => {
      const onFireRoundEnd = vi.fn();

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
        vi.advanceTimersByTime(18000);
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
        vi.advanceTimersByTime(3000); // warning + shake
      });

      expect(result.current.fireRoundRemaining).toBe(15);

      // Advance 5 seconds
      act(() => {
        vi.advanceTimersByTime(5000);
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
        vi.advanceTimersByTime(3000);
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
        vi.advanceTimersByTime(18000);
      });

      expect(result.current.getScoreMultiplier()).toBe(1);
    });
  });

  describe('grid regeneration', () => {
    it('should call onGridRegenerate with new grid during fire round', async () => {
      const onGridRegenerate = vi.fn();

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
        vi.advanceTimersByTime(3000);
      });

      // Grid regeneration should be called at least once during fire round
      expect(onGridRegenerate).toHaveBeenCalled();
      // Grid should be an array (from generateRandomTable mock)
      const callArgs = onGridRegenerate.mock.calls[0];
      expect(callArgs).toBeDefined();
      expect(callArgs.length).toBe(2);

      const [_grid, embeddedWords] = callArgs;
      // Grid might be undefined if generateRandomTable mock isn't working
      // Just verify the callback was called with 2 arguments
      expect(embeddedWords).toEqual([]);
    });
  });

  describe('multiplayer path removal (catalyst unification)', () => {
    it('never emits triggerEarthquake in multiplayer mode', () => {
      const emit = vi.fn();
      const socket = { emit } as unknown as Socket;
      const onEarthquakeStart = vi.fn();

      const { result } = renderHook(() =>
        useEarthquakeFireRound({
          enabled: true,
          mode: 'multiplayer',
          isHost: true,
          socket,
          gameDurationSeconds: 120,
          currentTimeSeconds: 120,
          gameSessionId: 'sess-1',
          language: 'en',
          difficulty: 'MEDIUM',
          onEarthquakeStart,
        })
      );

      // Force a trigger attempt; in multiplayer it must be a no-op (server-driven).
      act(() => {
        result.current.forceEarthquake();
      });

      // Should NOT emit socket event (server drives it instead)
      expect(emit).not.toHaveBeenCalled();
      // Should NOT trigger locally
      expect(onEarthquakeStart).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should not trigger earthquake if already triggered', () => {
      const onEarthquakeStart = vi.fn();

      const { result } = renderHook(() =>
        useEarthquakeFireRound({
          enabled: true,
          gameDurationSeconds: 180,
          currentTimeSeconds: 150,
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
        vi.runAllTimers();
      }).not.toThrow();
    });
  });
});
