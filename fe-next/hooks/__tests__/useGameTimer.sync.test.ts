/**
 * useGameTimer synchronization test
 * Tests multiplayer timer synchronization scenarios
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameTimer } from '../useGameTimer';

describe('useGameTimer - Multiplayer Synchronization', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('should continue counting down smoothly after server sync', async () => {
    // Setup: Start with 60 seconds
    const { result } = renderHook(() =>
      useGameTimer({
        initialTime: 60,
        autoStart: true,
      })
    );

    // Initial state
    expect(result.current.remainingTime).toBe(60);
    expect(result.current.isRunning).toBe(true);

    // Advance time by 5 seconds - timer should count down
    act(() => {
      vi.advanceTimersByTime(5100); // Extra 100ms to ensure second ticks
    });

    expect(result.current.remainingTime).toBe(55);

    // Simulate server broadcast at 54 seconds (sync event)
    // This mimics the server's smart broadcasting every 10 seconds
    act(() => {
      result.current.setTime(54); // Server says 54 seconds remaining
    });

    // BUG REPRODUCTION: Timer should continue counting down smoothly
    // After setTime(), the timer gets stuck because startTimestampRef was set to null

    // Advance time by 4 seconds (needs buffer for 1s interval alignment after setTime)
    act(() => {
      vi.advanceTimersByTime(4100);
    });

    // Timer should continue counting down after server sync
    // ACTUAL (before fix): Timer remains stuck at 54
    expect(result.current.remainingTime).toBeLessThanOrEqual(51);
    expect(result.current.remainingTime).toBeGreaterThanOrEqual(49);

    // Verify timer is still running
    expect(result.current.isRunning).toBe(true);
  });

  it('should handle multiple server syncs without breaking animation loop', async () => {
    const { result } = renderHook(() =>
      useGameTimer({
        initialTime: 100,
        autoStart: true,
      })
    );

    expect(result.current.remainingTime).toBe(100);

    // First sync at 95 seconds
    act(() => {
      vi.advanceTimersByTime(5100);
      result.current.setTime(95);
    });

    // Timer should continue after first sync
    act(() => {
      vi.advanceTimersByTime(2100);
    });

    expect(result.current.remainingTime).toBe(93);

    // Second sync at 85 seconds (10 seconds later)
    act(() => {
      vi.advanceTimersByTime(8100);
      result.current.setTime(85);
    });

    // Timer should still continue after second sync
    act(() => {
      vi.advanceTimersByTime(2100);
    });

    expect(result.current.remainingTime).toBe(83);
    expect(result.current.isRunning).toBe(true);
  });

  it('should handle sync during active gameplay without freezing', async () => {
    const onTick = vi.fn();

    const { result } = renderHook(() =>
      useGameTimer({
        initialTime: 30,
        autoStart: true,
        onTick,
      })
    );

    // Simulate active gameplay with frequent updates
    for (let i = 1; i <= 5; i++) {
      act(() => {
        vi.advanceTimersByTime(1100);
      });

      expect(result.current.remainingTime).toBe(30 - i);
    }

    // Server sync at 25 seconds
    act(() => {
      result.current.setTime(25);
    });

    expect(result.current.remainingTime).toBe(25);

    // Timer should keep ticking after sync
    act(() => {
      vi.advanceTimersByTime(2100);
    });

    expect(result.current.remainingTime).toBe(23);

    // Verify onTick was called after sync
    const tickCallsBefore = onTick.mock.calls.length;

    act(() => {
      vi.advanceTimersByTime(1100);
    });

    expect(onTick.mock.calls.length).toBeGreaterThan(tickCallsBefore);
  });

  it('should not unpause a paused timer when syncing', async () => {
    const { result } = renderHook(() =>
      useGameTimer({
        initialTime: 60,
        autoStart: false, // Start paused
      })
    );

    expect(result.current.isRunning).toBe(false);
    expect(result.current.remainingTime).toBe(60);

    // Server sync while paused
    act(() => {
      result.current.setTime(55);
    });

    // Timer should remain paused
    expect(result.current.isRunning).toBe(false);
    expect(result.current.remainingTime).toBe(55);

    // Advance time
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Timer should still be paused, not counting down
    expect(result.current.remainingTime).toBe(55);
    expect(result.current.isRunning).toBe(false);
  });

  it('should resume correctly after pause → setTime → unpause sequence', async () => {
    /**
     * BUG REPRODUCTION SCENARIO (GitHub issue: timer stuck for players)
     *
     * 1. Timer is running (gameActive = true)
     * 2. Brief pause (gameActive flickers to false due to state update race)
     * 3. Server sends timeUpdate, setTime() is called while paused
     * 4. Game unpauses (gameActive = true again)
     * 5. BUG: Timer remains stuck because setTime() didn't restart animation loop
     *
     * Root cause: setTime() only resets startTimestampRef if it's not null,
     * but pausing sets it to null. The effect should restart the loop on unpause,
     * but accumulated time calculation may be incorrect.
     */
    const { result, rerender } = renderHook(
      ({ isPaused }) =>
        useGameTimer({
          initialTime: 120,
          isPaused,
          autoStart: true,
        }),
      { initialProps: { isPaused: false } }
    );

    // Step 1: Timer is running
    expect(result.current.isRunning).toBe(true);
    expect(result.current.remainingTime).toBe(120);

    // Let it count down to 115
    act(() => {
      vi.advanceTimersByTime(5100);
    });
    expect(result.current.remainingTime).toBe(115);

    // Step 2: Brief pause (simulates gameActive flicker)
    rerender({ isPaused: true });
    expect(result.current.isRunning).toBe(false);

    // Step 3: Server sends timeUpdate while paused
    act(() => {
      result.current.setTime(110); // Server says 110 seconds
    });
    expect(result.current.remainingTime).toBe(110);

    // Step 4: Game unpauses
    rerender({ isPaused: false });
    expect(result.current.isRunning).toBe(true);

    // Step 5: Timer should continue counting down from 110
    act(() => {
      vi.advanceTimersByTime(3100);
    });

    // EXPECTED: 110 - 3 = 107
    // BUG (before fix): Timer remains stuck at 110
    expect(result.current.remainingTime).toBe(107);
    expect(result.current.isRunning).toBe(true);
  });

  it('fires onTimeUp when setTime(0) is called from a non-zero state', () => {
    const onTimeUp = vi.fn();

    const { result } = renderHook(() =>
      useGameTimer({
        initialTime: 60,
        autoStart: true,
        onTimeUp,
      })
    );

    expect(onTimeUp).not.toHaveBeenCalled();

    act(() => {
      result.current.setTime(0);
    });

    expect(onTimeUp).toHaveBeenCalledTimes(1);
  });

  it('does NOT re-fire onTimeUp on subsequent setTime(0) calls (idempotent)', () => {
    const onTimeUp = vi.fn();

    const { result } = renderHook(() =>
      useGameTimer({
        initialTime: 60,
        autoStart: true,
        onTimeUp,
      })
    );

    act(() => { result.current.setTime(0); });
    act(() => { result.current.setTime(0); });
    act(() => { result.current.setTime(0); });

    expect(onTimeUp).toHaveBeenCalledTimes(1);
  });

  it('does NOT fire onTimeUp when setTime is called with a non-zero value', () => {
    const onTimeUp = vi.fn();

    const { result } = renderHook(() =>
      useGameTimer({
        initialTime: 60,
        autoStart: true,
        onTimeUp,
      })
    );

    act(() => { result.current.setTime(30); });

    expect(onTimeUp).not.toHaveBeenCalled();
  });

  it('should handle rapid pause/unpause cycles with server syncs', async () => {
    /**
     * Tests network jitter scenario where game state flickers rapidly
     * while server continues sending timeUpdate events
     */
    const { result, rerender } = renderHook(
      ({ isPaused }) =>
        useGameTimer({
          initialTime: 180,
          isPaused,
          autoStart: true,
        }),
      { initialProps: { isPaused: false } }
    );

    expect(result.current.remainingTime).toBe(180);

    // Run for 10 seconds
    act(() => {
      vi.advanceTimersByTime(10100);
    });
    expect(result.current.remainingTime).toBe(170);

    // First flicker: pause → sync → unpause
    rerender({ isPaused: true });
    act(() => {
      result.current.setTime(168);
    });
    rerender({ isPaused: false });

    act(() => {
      vi.advanceTimersByTime(2100);
    });
    expect(result.current.remainingTime).toBe(166);

    // Second flicker: pause → sync → unpause
    rerender({ isPaused: true });
    act(() => {
      result.current.setTime(160);
    });
    rerender({ isPaused: false });

    act(() => {
      vi.advanceTimersByTime(5100);
    });
    expect(result.current.remainingTime).toBe(155);

    // Third flicker: rapid double-pause
    rerender({ isPaused: true });
    rerender({ isPaused: false });
    rerender({ isPaused: true });
    act(() => {
      result.current.setTime(150);
    });
    rerender({ isPaused: false });

    act(() => {
      vi.advanceTimersByTime(3100);
    });
    expect(result.current.remainingTime).toBe(147);
    expect(result.current.isRunning).toBe(true);
  });
});
