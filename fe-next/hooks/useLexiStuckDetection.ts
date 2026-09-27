/**
 * useLexiStuckDetection Hook
 *
 * DEBT-03 + DEBT-04: Game-aware wrapper for inactivity detection
 *
 * Detects when players are stuck in Adventure mode and triggers Lexi hints.
 * This hook wraps useInactivityDetection with game-specific logic:
 * - Pauses detection when game is paused or modal is open
 * - Uses longer timeout for boss levels (45s vs 30s)
 * - Provides resetOnGameAction to reset timer on word submissions
 *
 * @example
 * ```tsx
 * const { resetOnGameAction } = useLexiStuckDetection({
 *   onStuck: () => {
 *     neoInfoToast(t('adventure.lexi.stuckHint'));
 *   },
 *   isPlaying: gameState === 'playing',
 *   isPaused: isPaused,
 *   isModalOpen: showModal,
 *   isBossLevel: currentLevel?.isBoss,
 * });
 *
 * // Reset on game actions
 * const handleWordSubmit = (word: string) => {
 *   submitWord(word);
 *   resetOnGameAction();
 * };
 * ```
 */

import { useEffect, useMemo, useCallback } from 'react';
import { useInactivityDetection } from './useInactivityDetection';
import { createDeadTimeDetector } from '@/utils/posthogEngagement';

/** Default timeout: 30 seconds for normal levels */
const DEFAULT_TIMEOUT = 30000;

/** Extended timeout: 45 seconds for boss levels */
const BOSS_LEVEL_TIMEOUT = 45000;

/**
 * Options for the useLexiStuckDetection hook
 */
export interface UseLexiStuckDetectionOptions {
  /**
   * Callback triggered when player is detected as stuck
   * Use this to show Lexi hints or encouragement
   */
  onStuck: () => void;

  /**
   * Whether the game is actively playing
   * Detection is disabled when not playing
   */
  isPlaying: boolean;

  /**
   * Whether the game is paused
   * Detection is disabled when paused
   */
  isPaused: boolean;

  /**
   * Whether a modal is currently open
   * Detection is disabled when modal is open
   * @default false
   */
  isModalOpen?: boolean;

  /**
   * Custom timeout in milliseconds
   * If not provided, uses 30s for normal levels, 45s for boss levels
   */
  timeout?: number;

  /**
   * Whether this is a boss level
   * Boss levels use longer timeout (45s vs 30s)
   * @default false
   */
  isBossLevel?: boolean;
}

/**
 * Return value from the useLexiStuckDetection hook
 */
export interface UseLexiStuckDetectionReturn {
  /**
   * Call this on game actions (word submit, tile click) to reset the timer
   */
  resetOnGameAction: () => void;
}

/**
 * Hook for detecting when players are stuck in Adventure mode
 *
 * Wraps useInactivityDetection with game-specific logic for Adventure mode.
 * Automatically disables detection when:
 * - Game is not playing
 * - Game is paused
 * - Modal is open
 *
 * Uses 30s timeout for normal levels, 45s for boss levels.
 */
export function useLexiStuckDetection(
  options: UseLexiStuckDetectionOptions
): UseLexiStuckDetectionReturn {
  const {
    onStuck,
    isPlaying,
    isPaused,
    isModalOpen = false,
    timeout,
    isBossLevel = false,
  } = options;

  // Detection should only be enabled when:
  // - Game is playing
  // - Game is not paused
  // - No modal is open
  const enabled = isPlaying && !isPaused && !isModalOpen;

  // Determine timeout:
  // 1. Use custom timeout if provided
  // 2. Use boss level timeout (45s) if it's a boss level
  // 3. Use default timeout (30s) otherwise
  const effectiveTimeout = timeout ?? (isBossLevel ? BOSS_LEVEL_TIMEOUT : DEFAULT_TIMEOUT);

  const { reset } = useInactivityDetection({
    timeout: effectiveTimeout,
    onInactive: onStuck,
    enabled,
  });

  // Parallel analytics probe — fires `dead_time_detected` independently of
  // the UI hint so PostHog sees confusion/AFK even when Lexi hints are off.
  const deadTimeDetector = useMemo(
    () => createDeadTimeDetector({ thresholdMs: effectiveTimeout, mode: 'adventure' }),
    [effectiveTimeout]
  );

  useEffect(() => {
    if (enabled) {
      deadTimeDetector.start();
      return () => deadTimeDetector.stop();
    }
    deadTimeDetector.stop();
    return undefined;
  }, [enabled, deadTimeDetector]);

  const resetOnGameAction = useCallback(() => {
    reset();
    deadTimeDetector.recordActivity();
  }, [reset, deadTimeDetector]);

  return {
    resetOnGameAction,
  };
}

export default useLexiStuckDetection;
