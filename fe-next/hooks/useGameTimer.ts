/**
 * useGameTimer - Unified game timer hook
 *
 * Consolidates timer logic from:
 * - SinglePlayerGame.tsx
 * - DailyChallengeGame.tsx
 * - PlayerView.tsx (multiplayer)
 *
 * Features:
 * - Countdown timer with configurable duration
 * - Pause/resume support
 * - External pause (for earthquake/fire round)
 * - Callbacks for tick, warning, and completion
 * - Ref for accessing current time without stale closures
 */

import { useState, useRef, useEffect, useCallback } from 'react';

// ==================== Types ====================

export interface UseGameTimerOptions {
  /** Initial time in seconds */
  initialTime: number;
  /** Whether timer is paused (user pause) */
  isPaused?: boolean;
  /** External pause (e.g., earthquake) */
  isExternallyPaused?: boolean;
  /** Auto-start timer (default: true) */
  autoStart?: boolean;
  /** Callback when timer reaches 0 */
  onTimeUp?: () => void;
  /** Callback on each tick with remaining time */
  onTick?: (remainingTime: number) => void;
  /** Threshold (in seconds) to trigger warning callback */
  warningThreshold?: number;
  /** Callback when remaining time crosses warning threshold */
  onWarning?: () => void;
}

export interface GameTimerReturn {
  /** Current remaining time in seconds */
  remainingTime: number;
  /** Ref for accessing remaining time in callbacks */
  remainingTimeRef: React.MutableRefObject<number>;
  /** Whether timer is currently running */
  isRunning: boolean;
  /** Pause the timer */
  pause: () => void;
  /** Resume the timer */
  resume: () => void;
  /** Toggle pause state */
  togglePause: () => void;
  /** Reset timer to initial time */
  reset: () => void;
  /** Set remaining time manually (e.g., sync from server) */
  setTime: (time: number) => void;
}

// ==================== Hook ====================

export function useGameTimer(options: UseGameTimerOptions): GameTimerReturn {
  const {
    initialTime,
    isPaused: externalPause = false,
    isExternallyPaused = false,
    autoStart = true,
    onTimeUp,
    onTick,
    warningThreshold,
    onWarning,
  } = options;

  // State
  const [remainingTime, setRemainingTime] = useState(initialTime);
  const [internalPaused, setInternalPaused] = useState(!autoStart);

  // Refs
  const remainingTimeRef = useRef(initialTime);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTriggeredRef = useRef(false);

  // Calculate effective pause state
  const effectivelyPaused = externalPause || isExternallyPaused || internalPaused;
  const isRunning = !effectivelyPaused && remainingTime > 0;

  // Keep ref in sync
  useEffect(() => {
    remainingTimeRef.current = remainingTime;
  }, [remainingTime]);

  // Main timer effect
  useEffect(() => {
    // Don't run if paused or already at 0
    if (effectivelyPaused || remainingTime <= 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setRemainingTime(prev => {
        const newTime = prev - 1;
        remainingTimeRef.current = newTime;

        // Call tick callback
        onTick?.(newTime);

        // Check warning threshold
        if (
          warningThreshold &&
          newTime <= warningThreshold &&
          !warningTriggeredRef.current
        ) {
          warningTriggeredRef.current = true;
          onWarning?.();
        }

        // Check if time is up
        if (newTime <= 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          onTimeUp?.();
          return 0;
        }

        return newTime;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [effectivelyPaused, onTimeUp, onTick, warningThreshold, onWarning]);

  // Reset warning trigger when timer resets
  useEffect(() => {
    if (remainingTime === initialTime) {
      warningTriggeredRef.current = false;
    }
  }, [remainingTime, initialTime]);

  /**
   * Pause the timer
   */
  const pause = useCallback(() => {
    setInternalPaused(true);
  }, []);

  /**
   * Resume the timer
   */
  const resume = useCallback(() => {
    setInternalPaused(false);
  }, []);

  /**
   * Toggle pause state
   */
  const togglePause = useCallback(() => {
    setInternalPaused(prev => !prev);
  }, []);

  /**
   * Reset timer to initial time
   */
  const reset = useCallback(() => {
    setRemainingTime(initialTime);
    remainingTimeRef.current = initialTime;
    warningTriggeredRef.current = false;
    setInternalPaused(!autoStart);
  }, [initialTime, autoStart]);

  /**
   * Set remaining time manually (e.g., sync from server)
   */
  const setTime = useCallback((time: number) => {
    const clampedTime = Math.max(0, time);
    setRemainingTime(clampedTime);
    remainingTimeRef.current = clampedTime;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
    remainingTime,
    remainingTimeRef,
    isRunning,
    pause,
    resume,
    togglePause,
    reset,
    setTime,
  };
}

export default useGameTimer;
