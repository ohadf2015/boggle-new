/**
 * Attack Telegraph Hook
 *
 * Manages the 2-second countdown for boss attack warnings.
 * - Starts telegraph with target tiles
 * - Tracks progress (0-100%)
 * - Calls onComplete when countdown finishes
 *
 * @example
 * ```tsx
 * const { startTelegraph, state, isActive } = useAttackTelegraph({
 *   onComplete: (abilityId, tiles) => executeBossAttack(abilityId, tiles),
 * });
 *
 * // Start a 2-second warning
 * startTelegraph('scramble', [0, 1, 2, 3]);
 *
 * // Check state
 * if (isActive) {
 *   console.log(`Progress: ${state.progress * 100}%`);
 * }
 * ```
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// ==============================================
// TYPES
// ==============================================

export interface TelegraphState {
  /** Whether a telegraph is currently active */
  isActive: boolean;
  /** Progress from 0 to 1 (100%) */
  progress: number;
  /** Target tile indices being attacked */
  targetTiles: number[];
  /** Attack ability ID for styling */
  abilityId: string | null;
  /** Time remaining in milliseconds */
  timeRemaining: number;
}

export interface UseAttackTelegraphOptions {
  /** Duration of telegraph warning in ms (default: 2000) */
  duration?: number;
  /** Callback when telegraph completes */
  onComplete?: (abilityId: string, targetTiles: number[]) => void;
}

export interface UseAttackTelegraphReturn {
  /** Current telegraph state */
  state: TelegraphState;
  /** Start a new telegraph */
  startTelegraph: (abilityId: string, targetTiles: number[]) => void;
  /** Cancel the current telegraph */
  cancelTelegraph: () => void;
  /** Whether telegraph is currently active */
  isActive: boolean;
  /** Current progress (0-1) */
  progress: number;
}

// ==============================================
// CONSTANTS
// ==============================================

/** Default telegraph duration in milliseconds */
const TELEGRAPH_DURATION = 2000;

/** Update interval for smooth animation (20 FPS) */
const UPDATE_INTERVAL = 50;

// ==============================================
// INITIAL STATE
// ==============================================

const INITIAL_STATE: TelegraphState = {
  isActive: false,
  progress: 0,
  targetTiles: [],
  abilityId: null,
  timeRemaining: 0,
};

// ==============================================
// HOOK
// ==============================================

/**
 * Hook to manage attack telegraph countdown.
 *
 * Provides a 2-second (default) countdown with progress tracking
 * for boss attack warnings. Automatically calls onComplete when
 * the countdown finishes.
 *
 * @param options - Configuration options
 * @returns Telegraph state and control functions
 */
export function useAttackTelegraph(
  options: UseAttackTelegraphOptions = {}
): UseAttackTelegraphReturn {
  const { duration = TELEGRAPH_DURATION, onComplete } = options;

  const [state, setState] = useState<TelegraphState>(INITIAL_STATE);

  // Refs to persist values across interval callbacks
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const abilityIdRef = useRef<string | null>(null);
  const targetTilesRef = useRef<number[]>([]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  /**
   * Cancel the current telegraph and reset state.
   */
  const cancelTelegraph = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setState(INITIAL_STATE);
  }, []);

  /**
   * Start a new telegraph countdown.
   *
   * @param abilityId - Identifier for the attack ability
   * @param targetTiles - Array of tile indices being targeted
   */
  const startTelegraph = useCallback(
    (abilityId: string, targetTiles: number[]) => {
      // Cancel any existing telegraph
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Store refs for completion callback
      abilityIdRef.current = abilityId;
      targetTilesRef.current = targetTiles;
      startTimeRef.current = Date.now();

      // Set initial state
      setState({
        isActive: true,
        progress: 0,
        targetTiles,
        abilityId,
        timeRemaining: duration,
      });

      // Update progress every UPDATE_INTERVAL ms for smooth animation
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);
        const timeRemaining = Math.max(0, duration - elapsed);

        if (progress >= 1) {
          // Telegraph complete
          clearInterval(intervalRef.current!);
          intervalRef.current = null;

          setState({
            isActive: false,
            progress: 1,
            targetTiles: [],
            abilityId: null,
            timeRemaining: 0,
          });

          // Trigger completion callback
          if (onComplete && abilityIdRef.current) {
            onComplete(abilityIdRef.current, targetTilesRef.current);
          }
        } else {
          setState((prev) => ({
            ...prev,
            progress,
            timeRemaining,
          }));
        }
      }, UPDATE_INTERVAL);
    },
    [duration, onComplete]
  );

  return {
    state,
    startTelegraph,
    cancelTelegraph,
    isActive: state.isActive,
    progress: state.progress,
  };
}
