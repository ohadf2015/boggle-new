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

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    setEarthquakeState = jest.fn();
    setFireRoundActive = jest.fn();
    setFireRoundRemaining = jest.fn();
    setLetterGrid = jest.fn();
    gameSessionIdRef = { current: 123 };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('handleFireRoundStart', () => {
    it('should set initial fire round state correctly', () => {
      const handlers = createEarthquakeSocketHandlers({
        setEarthquakeState,
        setFireRoundActive,
        setFireRoundRemaining,
        setLetterGrid,
        gameSessionIdRef,
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
        role: 'PLAYER',
      });

      handlers.handleFireRoundStart({
        gameSessionId: 123,
        duration: 15,
      });

      // Initial call sets to 15
      expect(setFireRoundRemaining).toHaveBeenLastCalledWith(15);

      // After 1 second, should be 14
      jest.advanceTimersByTime(1000);
      expect(setFireRoundRemaining).toHaveBeenLastCalledWith(14);

      // After 2 more seconds, should be 12
      jest.advanceTimersByTime(2000);
      expect(setFireRoundRemaining).toHaveBeenLastCalledWith(12);

      // After 5 more seconds, should be 7
      jest.advanceTimersByTime(5000);
      expect(setFireRoundRemaining).toHaveBeenLastCalledWith(7);
    });

    it('should stop countdown at 0 and not go negative', () => {
      const handlers = createEarthquakeSocketHandlers({
        setEarthquakeState,
        setFireRoundActive,
        setFireRoundRemaining,
        setLetterGrid,
        gameSessionIdRef,
        role: 'PLAYER',
      });

      handlers.handleFireRoundStart({
        gameSessionId: 123,
        duration: 3, // Short duration for testing
      });

      // Advance through the full countdown
      jest.advanceTimersByTime(5000); // More than duration

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
        role: 'PLAYER',
      });

      // Start first fire round
      handlers.handleFireRoundStart({
        gameSessionId: 123,
        duration: 15,
      });

      // Advance 3 seconds
      jest.advanceTimersByTime(3000);
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
      jest.advanceTimersByTime(1000);
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
        role: 'PLAYER',
      });

      // Start fire round
      handlers.handleFireRoundStart({
        gameSessionId: 123,
        duration: 15,
      });

      jest.advanceTimersByTime(3000);
      setFireRoundRemaining.mockClear();

      // End fire round
      handlers.handleFireRoundEnd({ gameSessionId: 123 });

      // Advance time - countdown should not continue
      jest.advanceTimersByTime(5000);

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
        role: 'PLAYER',
      });

      // Start fire round
      handlers.handleFireRoundStart({
        gameSessionId: 123,
        duration: 15,
      });

      jest.advanceTimersByTime(3000);
      setFireRoundRemaining.mockClear();

      // Cleanup (simulates component unmount)
      handlers.cleanup();

      // Advance time - countdown should not continue
      jest.advanceTimersByTime(5000);

      // No calls after cleanup
      expect(setFireRoundRemaining).not.toHaveBeenCalled();
    });
  });

  describe('host role', () => {
    it('should work for HOST role with tableDataRef', () => {
      const tableDataRef = { current: null };
      const setTableData = jest.fn();

      const handlers = createEarthquakeSocketHandlers({
        setEarthquakeState,
        setFireRoundActive,
        setFireRoundRemaining,
        setTableData,
        tableDataRef,
        gameSessionIdRef,
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
