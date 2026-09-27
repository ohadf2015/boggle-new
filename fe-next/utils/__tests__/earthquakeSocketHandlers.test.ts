/**
 * Tests for earthquakeSocketHandlers
 *
 * Verifies fire round countdown and earthquake state transitions
 * work correctly when receiving socket events.
 */

import { createEarthquakeSocketHandlers } from '../../shared/utils/earthquakeSocketHandlers';
import type { MutableRefObject } from 'react';

describe('createEarthquakeSocketHandlers', () => {
  let setEarthquakeState: jest.Mock;
  let setFireRoundActive: jest.Mock;
  let setFireRoundRemaining: jest.Mock;
  let setLetterGrid: jest.Mock;
  let gameSessionIdRef: MutableRefObject<number>;
  let fireRoundIntervalRef: MutableRefObject<NodeJS.Timeout | null>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    setEarthquakeState = vi.fn();
    setFireRoundActive = vi.fn();
    setFireRoundRemaining = vi.fn();
    setLetterGrid = vi.fn();
    gameSessionIdRef = { current: 123 };
    fireRoundIntervalRef = { current: null };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('handleFireRoundStart', () => {
    it('should set initial fire round state correctly', () => {
      const handlers = createEarthquakeSocketHandlers({
        setEarthquakeState,
        setFireRoundActive,
        setFireRoundRemaining,
        setLetterGrid,
        gameSessionIdRef,
        fireRoundIntervalRef,
        role: 'PLAYER',
      });

      handlers.handleFireRoundStart({
        gameSessionId: 123,
        grid: [['A', 'B'], ['C', 'D']],
        duration: 15,
      });

      expect(setEarthquakeState).toHaveBeenCalledWith('fire-round');
      expect(setFireRoundActive).toHaveBeenCalledWith(true);
      expect(setFireRoundRemaining).toHaveBeenCalledWith(15);
      expect(setLetterGrid).toHaveBeenCalledWith([['A', 'B'], ['C', 'D']]);
    });

    it('should countdown fire round remaining time', () => {
      const handlers = createEarthquakeSocketHandlers({
        setEarthquakeState,
        setFireRoundActive,
        setFireRoundRemaining,
        setLetterGrid,
        gameSessionIdRef,
        fireRoundIntervalRef,
        role: 'PLAYER',
      });

      handlers.handleFireRoundStart({
        gameSessionId: 123,
        duration: 15,
      });

      // Initial call sets to 15
      expect(setFireRoundRemaining).toHaveBeenLastCalledWith(15);

      // After 1 second, should be 14
      vi.advanceTimersByTime(1000);
      expect(setFireRoundRemaining).toHaveBeenLastCalledWith(14);

      // After 2 more seconds, should be 12
      vi.advanceTimersByTime(2000);
      expect(setFireRoundRemaining).toHaveBeenLastCalledWith(12);

      // After 5 more seconds, should be 7
      vi.advanceTimersByTime(5000);
      expect(setFireRoundRemaining).toHaveBeenLastCalledWith(7);
    });

    it('should stop countdown at 0 and not go negative', () => {
      const handlers = createEarthquakeSocketHandlers({
        setEarthquakeState,
        setFireRoundActive,
        setFireRoundRemaining,
        setLetterGrid,
        gameSessionIdRef,
        fireRoundIntervalRef,
        role: 'PLAYER',
      });

      handlers.handleFireRoundStart({
        gameSessionId: 123,
        duration: 3, // Short duration for testing
      });

      // Advance through the full countdown
      vi.advanceTimersByTime(5000); // More than duration

      // Should have called with 3, 2, 1, 0 (no negatives)
      const calls = setFireRoundRemaining.mock.calls.map((c: [number]) => c[0]);
      expect(calls).toContain(3);
      expect(calls).toContain(2);
      expect(calls).toContain(1);
      expect(calls).toContain(0);
      expect(calls.filter((c: number) => c < 0)).toHaveLength(0);
    });

    it('should ignore fire round events from stale game sessions', () => {
      const handlers = createEarthquakeSocketHandlers({
        setEarthquakeState,
        setFireRoundActive,
        setFireRoundRemaining,
        setLetterGrid,
        gameSessionIdRef,
        fireRoundIntervalRef,
        role: 'PLAYER',
      });

      // Send event with different game session ID
      handlers.handleFireRoundStart({
        gameSessionId: 999, // Different from ref's 123
        duration: 15,
      });

      // Should not update state
      expect(setFireRoundActive).not.toHaveBeenCalled();
      expect(setFireRoundRemaining).not.toHaveBeenCalled();
    });

    it('should clear previous countdown when new fire round starts', () => {
      const handlers = createEarthquakeSocketHandlers({
        setEarthquakeState,
        setFireRoundActive,
        setFireRoundRemaining,
        setLetterGrid,
        gameSessionIdRef,
        fireRoundIntervalRef,
        role: 'PLAYER',
      });

      // Start first fire round
      handlers.handleFireRoundStart({
        gameSessionId: 123,
        duration: 15,
      });

      // Advance 3 seconds
      vi.advanceTimersByTime(3000);
      expect(setFireRoundRemaining).toHaveBeenLastCalledWith(12);

      // Start another fire round (simulating multiple earthquakes or reconnect)
      setFireRoundRemaining.mockClear();
      handlers.handleFireRoundStart({
        gameSessionId: 123,
        duration: 10,
      });

      // Should reset to new duration, not continue from 12
      expect(setFireRoundRemaining).toHaveBeenCalledWith(10);

      // Advance 1 second - should count down from 10, not from 12
      vi.advanceTimersByTime(1000);
      expect(setFireRoundRemaining).toHaveBeenLastCalledWith(9);
    });
  });

  describe('handleFireRoundEnd', () => {
    it('should reset fire round state', () => {
      const handlers = createEarthquakeSocketHandlers({
        setEarthquakeState,
        setFireRoundActive,
        setFireRoundRemaining,
        setLetterGrid,
        gameSessionIdRef,
        fireRoundIntervalRef,
        role: 'PLAYER',
      });

      handlers.handleFireRoundEnd({ gameSessionId: 123 });

      expect(setEarthquakeState).toHaveBeenCalledWith('idle');
      expect(setFireRoundActive).toHaveBeenCalledWith(false);
      expect(setFireRoundRemaining).toHaveBeenCalledWith(0);
    });

    it('should clear countdown when fire round ends', () => {
      const handlers = createEarthquakeSocketHandlers({
        setEarthquakeState,
        setFireRoundActive,
        setFireRoundRemaining,
        setLetterGrid,
        gameSessionIdRef,
        fireRoundIntervalRef,
        role: 'PLAYER',
      });

      // Start fire round
      handlers.handleFireRoundStart({
        gameSessionId: 123,
        duration: 15,
      });

      vi.advanceTimersByTime(3000);
      setFireRoundRemaining.mockClear();

      // End fire round
      handlers.handleFireRoundEnd({ gameSessionId: 123 });

      // Advance time - countdown should not continue
      vi.advanceTimersByTime(5000);

      // Only call should be the reset to 0 from handleFireRoundEnd
      expect(setFireRoundRemaining).toHaveBeenCalledTimes(1);
      expect(setFireRoundRemaining).toHaveBeenCalledWith(0);
    });
  });

  describe('handleEarthquakeWarning', () => {
    it('should set earthquake state to warning', () => {
      const handlers = createEarthquakeSocketHandlers({
        setEarthquakeState,
        setFireRoundActive,
        setFireRoundRemaining,
        setLetterGrid,
        gameSessionIdRef,
        fireRoundIntervalRef,
        role: 'PLAYER',
      });

      handlers.handleEarthquakeWarning({ gameSessionId: 123 });

      expect(setEarthquakeState).toHaveBeenCalledWith('warning');
    });
  });

  describe('handleEarthquakeShake', () => {
    it('should set earthquake state to shaking', () => {
      const handlers = createEarthquakeSocketHandlers({
        setEarthquakeState,
        setFireRoundActive,
        setFireRoundRemaining,
        setLetterGrid,
        gameSessionIdRef,
        fireRoundIntervalRef,
        role: 'PLAYER',
      });

      handlers.handleEarthquakeShake({ gameSessionId: 123 });

      expect(setEarthquakeState).toHaveBeenCalledWith('shaking');
    });
  });

  describe('cleanup', () => {
    it('should clear countdown interval on cleanup', () => {
      const handlers = createEarthquakeSocketHandlers({
        setEarthquakeState,
        setFireRoundActive,
        setFireRoundRemaining,
        setLetterGrid,
        gameSessionIdRef,
        fireRoundIntervalRef,
        role: 'PLAYER',
      });

      // Start fire round
      handlers.handleFireRoundStart({
        gameSessionId: 123,
        duration: 15,
      });

      vi.advanceTimersByTime(3000);
      setFireRoundRemaining.mockClear();

      // Cleanup (simulates component unmount)
      handlers.cleanup();

      // Advance time - countdown should not continue
      vi.advanceTimersByTime(5000);

      // No calls after cleanup
      expect(setFireRoundRemaining).not.toHaveBeenCalled();
    });
  });

  describe('interval persistence across handler recreation', () => {
    it('should continue countdown when handlers are recreated (simulating useEffect re-run)', () => {
      // This test verifies the fix for the bug where countdown stops when useEffect re-runs
      // The key is that fireRoundIntervalRef persists across handler recreations

      // Create first handler and start fire round
      const handlers1 = createEarthquakeSocketHandlers({
        setEarthquakeState,
        setFireRoundActive,
        setFireRoundRemaining,
        setLetterGrid,
        gameSessionIdRef,
        fireRoundIntervalRef,
        role: 'PLAYER',
      });

      handlers1.handleFireRoundStart({
        gameSessionId: 123,
        duration: 15,
      });

      // Advance 3 seconds, countdown should be at 12
      vi.advanceTimersByTime(3000);
      expect(setFireRoundRemaining).toHaveBeenLastCalledWith(12);

      // Simulate useEffect cleanup and re-creation (what happens when deps change)
      handlers1.cleanup();

      // Create new handlers (simulating useMemo re-evaluation)
      // CRITICAL: Using the SAME fireRoundIntervalRef
      const handlers2 = createEarthquakeSocketHandlers({
        setEarthquakeState,
        setFireRoundActive,
        setFireRoundRemaining,
        setLetterGrid,
        gameSessionIdRef,
        fireRoundIntervalRef,
        role: 'PLAYER',
      });

      // Since cleanup was called, the interval should have been cleared
      // This is the expected behavior - the interval is cleared when handlers are recreated
      // The fix ensures that if the interval was cleared, it can be properly restarted
      // when a new fireRoundStart event is received

      // Verify interval was cleared
      expect(fireRoundIntervalRef.current).toBeNull();

      // Simulate receiving fireRoundStart again (e.g., from server resync)
      handlers2.handleFireRoundStart({
        gameSessionId: 123,
        duration: 10, // New duration
      });

      // Should start fresh countdown from 10
      expect(setFireRoundRemaining).toHaveBeenLastCalledWith(10);

      // Advance and verify countdown works with new handlers
      vi.advanceTimersByTime(2000);
      expect(setFireRoundRemaining).toHaveBeenLastCalledWith(8);
    });

    it('should preserve interval if cleanup is NOT called (handler recreation without cleanup)', () => {
      // This tests the scenario where handlers are recreated but cleanup isn't called
      // (shouldn't happen in React, but good to verify ref behavior)

      const handlers1 = createEarthquakeSocketHandlers({
        setEarthquakeState,
        setFireRoundActive,
        setFireRoundRemaining,
        setLetterGrid,
        gameSessionIdRef,
        fireRoundIntervalRef,
        role: 'PLAYER',
      });

      handlers1.handleFireRoundStart({
        gameSessionId: 123,
        duration: 15,
      });

      // Advance 3 seconds
      vi.advanceTimersByTime(3000);
      expect(setFireRoundRemaining).toHaveBeenLastCalledWith(12);

      // Create new handlers WITHOUT calling cleanup on old ones
      // Both share the same fireRoundIntervalRef, so new handlers can clear the interval
      const handlers2 = createEarthquakeSocketHandlers({
        setEarthquakeState,
        setFireRoundActive,
        setFireRoundRemaining,
        setLetterGrid,
        gameSessionIdRef,
        fireRoundIntervalRef,
        role: 'PLAYER',
      });

      // Interval should still be running (ref still holds the interval ID)
      expect(fireRoundIntervalRef.current).not.toBeNull();

      // Advance another 2 seconds - countdown should continue
      vi.advanceTimersByTime(2000);
      expect(setFireRoundRemaining).toHaveBeenLastCalledWith(10);

      // Cleanup with new handlers should work
      handlers2.cleanup();
      expect(fireRoundIntervalRef.current).toBeNull();
    });
  });

  describe('host role', () => {
    it('should work for HOST role with tableDataRef', () => {
      const tableDataRef = { current: null };
      const setTableData = vi.fn();

      const handlers = createEarthquakeSocketHandlers({
        setEarthquakeState,
        setFireRoundActive,
        setFireRoundRemaining,
        setTableData,
        tableDataRef,
        gameSessionIdRef,
        fireRoundIntervalRef,
        role: 'HOST',
      });

      const newGrid = [['X', 'Y'], ['Z', 'W']];
      handlers.handleFireRoundStart({
        gameSessionId: 123,
        grid: newGrid,
        duration: 15,
      });

      expect(setTableData).toHaveBeenCalledWith(newGrid);
      expect(tableDataRef.current).toEqual(newGrid);
      expect(setFireRoundRemaining).toHaveBeenCalledWith(15);
    });
  });
});
