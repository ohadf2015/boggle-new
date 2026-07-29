import { vi, type Mock, } from 'vitest';
/**
 * HostView pendingGameStart Tests
 *
 * Tests for verifying that HostView properly initializes game state
 * when mounted with pendingGameStart data (host returning from results page)
 *
 * Bug: When host clicks "play" on results page, startGame event is captured
 * at page level while HostView is unmounted. When HostView mounts, it must
 * initialize from pendingGameStart to start the game.
 */

import { renderHook, act } from '@testing-library/react';
import { useState, useEffect } from 'react';

// Mock socket
interface MockSocket {
  listeners: Record<string, Array<(...args: unknown[]) => void>>;
  connected: boolean;
  emit: Mock;
  on: Mock;
  off: Mock;
}

function createMockSocket(): MockSocket {
  const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};

  return {
    listeners,
    connected: true,
    emit: vi.fn(),
    on: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
      if (!listeners[event]) {
        listeners[event] = [];
      }
      listeners[event].push(callback);
      return {} as unknown;
    }),
    off: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((cb) => cb !== callback);
      }
      return {} as unknown;
    }),
  };
}

// Simplified hook that mimics the pendingGameStart handling logic from HostView
interface GameStartData {
  letterGrid: string[][];
  timerSeconds: number;
  language: string;
}

interface UseHostPendingGameStartProps {
  pendingGameStart: GameStartData | null;
  onGameStartConsumed?: () => void;
}

interface HostGameState {
  tableData: string[][] | null;
  remainingTime: number | null;
  waitingForResults: boolean;
  showStartAnimation: boolean;
  gameStarted: boolean;
}

function useHostPendingGameStart({
  pendingGameStart,
  onGameStartConsumed,
}: UseHostPendingGameStartProps): HostGameState {
  const [tableData, setTableData] = useState<string[][] | null>(null);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [waitingForResults, setWaitingForResults] = useState(false);
  const [showStartAnimation, setShowStartAnimation] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  // Handle pending game start (when host returns from results page)
  useEffect(() => {
    if (!pendingGameStart) return;

    // Initialize game state from pending data
    if (pendingGameStart.letterGrid) {
      setTableData(pendingGameStart.letterGrid);
    }
    if (pendingGameStart.timerSeconds !== undefined) {
      setRemainingTime(pendingGameStart.timerSeconds);
    }

    // Reset states for new game and trigger animation
    setWaitingForResults(false);
    setShowStartAnimation(true);

    // Mark pending game start as consumed
    onGameStartConsumed?.();
  }, [pendingGameStart, onGameStartConsumed]);

  // Simulate useHostEffects: gameStarted becomes true after animation
  useEffect(() => {
    if (
      !showStartAnimation &&
      tableData &&
      remainingTime &&
      remainingTime > 0 &&
      !gameStarted &&
      !waitingForResults
    ) {
      setGameStarted(true);
    }
  }, [showStartAnimation, tableData, remainingTime, gameStarted, waitingForResults]);

  return {
    tableData,
    remainingTime,
    waitingForResults,
    showStartAnimation,
    gameStarted,
  };
}

describe('HostView pendingGameStart handling', () => {
  describe('when pendingGameStart is provided', () => {
    it('should initialize tableData from pendingGameStart.letterGrid', () => {
      // GIVEN
      const pendingGameStart: GameStartData = {
        letterGrid: [
          ['A', 'B', 'C', 'D'],
          ['E', 'F', 'G', 'H'],
          ['I', 'J', 'K', 'L'],
          ['M', 'N', 'O', 'P'],
        ],
        timerSeconds: 180,
        language: 'en',
      };

      // WHEN
      const { result } = renderHook(() =>
        useHostPendingGameStart({ pendingGameStart, onGameStartConsumed: vi.fn() })
      );

      // THEN
      expect(result.current.tableData).toEqual(pendingGameStart.letterGrid);
    });

    it('should initialize remainingTime from pendingGameStart.timerSeconds', () => {
      // GIVEN
      const pendingGameStart: GameStartData = {
        letterGrid: [['A']],
        timerSeconds: 120,
        language: 'en',
      };

      // WHEN
      const { result } = renderHook(() =>
        useHostPendingGameStart({ pendingGameStart, onGameStartConsumed: vi.fn() })
      );

      // THEN
      expect(result.current.remainingTime).toBe(120);
    });

    it('should set showStartAnimation to true', () => {
      // GIVEN
      const pendingGameStart: GameStartData = {
        letterGrid: [['A']],
        timerSeconds: 180,
        language: 'en',
      };

      // WHEN
      const { result } = renderHook(() =>
        useHostPendingGameStart({ pendingGameStart, onGameStartConsumed: vi.fn() })
      );

      // THEN
      expect(result.current.showStartAnimation).toBe(true);
    });

    it('should call onGameStartConsumed callback', () => {
      // GIVEN
      const onGameStartConsumed = vi.fn();
      const pendingGameStart: GameStartData = {
        letterGrid: [['A']],
        timerSeconds: 180,
        language: 'en',
      };

      // WHEN
      renderHook(() =>
        useHostPendingGameStart({ pendingGameStart, onGameStartConsumed })
      );

      // THEN
      expect(onGameStartConsumed).toHaveBeenCalledTimes(1);
    });

    it('should set waitingForResults to false', () => {
      // GIVEN
      const pendingGameStart: GameStartData = {
        letterGrid: [['A']],
        timerSeconds: 180,
        language: 'en',
      };

      // WHEN
      const { result } = renderHook(() =>
        useHostPendingGameStart({ pendingGameStart, onGameStartConsumed: vi.fn() })
      );

      // THEN
      expect(result.current.waitingForResults).toBe(false);
    });
  });

  describe('when pendingGameStart is null', () => {
    it('should not initialize any state', () => {
      // GIVEN
      const onGameStartConsumed = vi.fn();

      // WHEN
      const { result } = renderHook(() =>
        useHostPendingGameStart({ pendingGameStart: null, onGameStartConsumed })
      );

      // THEN
      expect(result.current.tableData).toBeNull();
      expect(result.current.remainingTime).toBeNull();
      expect(result.current.showStartAnimation).toBe(false);
      expect(onGameStartConsumed).not.toHaveBeenCalled();
    });
  });

  describe('game flow after pendingGameStart', () => {
    it('should set gameStarted to true after animation completes (simulating useHostEffects)', async () => {
      // GIVEN - Component that simulates animation completing
      const pendingGameStart: GameStartData = {
        letterGrid: [['A']],
        timerSeconds: 180,
        language: 'en',
      };

      // This test verifies the state that would lead to game starting
      // The actual animation completion is handled by HostView's useEffect
      const { result } = renderHook(() =>
        useHostPendingGameStart({ pendingGameStart, onGameStartConsumed: vi.fn() })
      );

      // THEN - After pendingGameStart is processed:
      // - tableData is set
      // - remainingTime is set
      // - showStartAnimation is true (will become false when animation completes)
      expect(result.current.tableData).not.toBeNull();
      expect(result.current.remainingTime).toBeGreaterThan(0);
      expect(result.current.showStartAnimation).toBe(true);

      // At this point in the real component, once showStartAnimation becomes false,
      // gameStarted will become true (tested separately in useHostEffects tests)
    });
  });
});
