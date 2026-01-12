/**
 * useGameTimer synchronization test
 * Tests multiplayer timer synchronization scenarios
 */

import { renderHook, act } from '@testing-library/react';
import { useGameTimer } from '../useGameTimer';

describe('useGameTimer - Multiplayer Synchronization', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
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
      jest.advanceTimersByTime(5100); // Extra 100ms to ensure second ticks
    });

    expect(result.current.remainingTime).toBe(55);

    // Simulate server broadcast at 54 seconds (sync event)
    // This mimics the server's smart broadcasting every 10 seconds
    act(() => {
      result.current.setTime(54); // Server says 54 seconds remaining
    });

    // BUG REPRODUCTION: Timer should continue counting down smoothly
    // After setTime(), the timer gets stuck because startTimestampRef was set to null

    // Advance time by 2 more seconds
    act(() => {
      jest.advanceTimersByTime(2100);
    });

    // EXPECTED: Timer should show 52 seconds (54 - 2)
    // ACTUAL (before fix): Timer remains stuck at 54
    expect(result.current.remainingTime).toBe(52);

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
      jest.advanceTimersByTime(5100);
      result.current.setTime(95);
    });

    // Timer should continue after first sync
    act(() => {
      jest.advanceTimersByTime(2100);
    });

    expect(result.current.remainingTime).toBe(93);

    // Second sync at 85 seconds (10 seconds later)
    act(() => {
      jest.advanceTimersByTime(8100);
      result.current.setTime(85);
    });

    // Timer should still continue after second sync
    act(() => {
      jest.advanceTimersByTime(2100);
    });

    expect(result.current.remainingTime).toBe(83);
    expect(result.current.isRunning).toBe(true);
  });

  it('should handle sync during active gameplay without freezing', async () => {
    const onTick = jest.fn();

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
        jest.advanceTimersByTime(1100);
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
      jest.advanceTimersByTime(2100);
    });

    expect(result.current.remainingTime).toBe(23);

    // Verify onTick was called after sync
    const tickCallsBefore = onTick.mock.calls.length;

    act(() => {
      jest.advanceTimersByTime(1100);
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
      jest.advanceTimersByTime(5000);
    });

    // Timer should still be paused, not counting down
    expect(result.current.remainingTime).toBe(55);
    expect(result.current.isRunning).toBe(false);
  });
});
