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
 * - TIMESTAMP-BASED: Uses actual elapsed time, not interval callbacks
 *   This prevents timer drift/pause during heavy touch interactions on mobile
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
  const animationFrameRef = useRef<number | null>(null);
  const warningTriggeredRef = useRef(false);
  const timeUpCalledRef = useRef(false);

  // Timestamp tracking for accurate elapsed time calculation
  // This ensures timer accuracy even when JS event loop is blocked by touch events
  const startTimestampRef = useRef<number | null>(null);
  const accumulatedTimeRef = useRef(0); // Time accumulated before pauses
  const lastDisplayedSecondRef = useRef(initialTime);

  // Callback refs - store callbacks in refs to avoid re-triggering effect on every render
  const onTimeUpRef = useRef(onTimeUp);
  const onTickRef = useRef(onTick);
  const onWarningRef = useRef(onWarning);

  // Keep callback refs in sync (consolidated into single effect)
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
    onTickRef.current = onTick;
    onWarningRef.current = onWarning;
  }, [onTimeUp, onTick, onWarning]);

  // Calculate effective pause state
  const effectivelyPaused = externalPause || isExternallyPaused || internalPaused;
  const isRunning = !effectivelyPaused && remainingTime > 0;

  // Keep ref in sync
  useEffect(() => {
    remainingTimeRef.current = remainingTime;
  }, [remainingTime]);

  // Main timer effect using requestAnimationFrame for smooth updates
  // Uses timestamp-based calculation to prevent drift during touch interactions
  useEffect(() => {
    // Don't run if paused or already at 0
    // Use ref to avoid adding remainingTime to dependencies (would cause infinite loop)
    if (effectivelyPaused || remainingTimeRef.current <= 0) {
      // When pausing, accumulate the elapsed time
      if (startTimestampRef.current !== null) {
        const now = performance.now();
        accumulatedTimeRef.current += (now - startTimestampRef.current) / 1000;
        startTimestampRef.current = null;
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    // Start/resume timer - record start timestamp
    startTimestampRef.current = performance.now();

    const tick = () => {
      if (startTimestampRef.current === null) return;

      const now = performance.now();
      const elapsedSinceStart = (now - startTimestampRef.current) / 1000;
      const totalElapsed = accumulatedTimeRef.current + elapsedSinceStart;
      const newTime = Math.max(0, Math.ceil(initialTime - totalElapsed));

      // Only update state when the displayed second changes
      if (newTime !== lastDisplayedSecondRef.current) {
        lastDisplayedSecondRef.current = newTime;
        remainingTimeRef.current = newTime;
        setRemainingTime(newTime);

        // Call tick callback
        onTickRef.current?.(newTime);

        // Check warning threshold
        if (
          warningThreshold &&
          newTime <= warningThreshold &&
          !warningTriggeredRef.current
        ) {
          warningTriggeredRef.current = true;
          onWarningRef.current?.();
        }

        // Check if time is up
        if (newTime <= 0 && !timeUpCalledRef.current) {
          timeUpCalledRef.current = true;
          onTimeUpRef.current?.();
          return; // Stop the animation loop
        }
      }

      // Continue animation loop if time remaining
      if (newTime > 0) {
        animationFrameRef.current = requestAnimationFrame(tick);
      }
    };

    // Start the animation loop
    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [effectivelyPaused, initialTime, warningThreshold]);

  // Reset warning trigger when timer resets
  useEffect(() => {
    if (remainingTime === initialTime) {
      warningTriggeredRef.current = false;
      timeUpCalledRef.current = false;
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
    // Reset all timestamp tracking
    startTimestampRef.current = null;
    accumulatedTimeRef.current = 0;
    lastDisplayedSecondRef.current = initialTime;
    warningTriggeredRef.current = false;
    timeUpCalledRef.current = false;

    setRemainingTime(initialTime);
    remainingTimeRef.current = initialTime;
    setInternalPaused(!autoStart);
  }, [initialTime, autoStart]);

  /**
   * Set remaining time manually (e.g., sync from server)
   */
  const setTime = useCallback((time: number) => {
    const clampedTime = Math.max(0, time);

    // Reset timestamp tracking to match the new time
    startTimestampRef.current = null;
    accumulatedTimeRef.current = initialTime - clampedTime;
    lastDisplayedSecondRef.current = clampedTime;

    setRemainingTime(clampedTime);
    remainingTimeRef.current = clampedTime;
  }, [initialTime]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
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
