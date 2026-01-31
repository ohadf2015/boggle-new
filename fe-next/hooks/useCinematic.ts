/**
 * useCinematic Hook
 *
 * Manages cinematic playback state with skip functionality.
 * Skip button unlocks after SKIP_DELAY_MS (2 seconds per BOSS-04).
 *
 * Features:
 * - Auto-play control
 * - Skip timing (unlocks after 2s)
 * - Frame-based progress tracking
 * - Natural completion detection
 * - Cleanup on unmount
 */

'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ==============================================
// CONSTANTS
// ==============================================

/** Minimum time before skip is allowed (ms) */
export const SKIP_DELAY_MS = 2000;

/** Default frames per second for Remotion */
export const DEFAULT_FPS = 30;

/** Default cinematic duration (frames at 30fps) = 8 seconds */
export const DEFAULT_DURATION_FRAMES = 240;

// ==============================================
// TYPES
// ==============================================

export interface UseCinematicOptions {
  /** Duration in frames (at 30fps) */
  durationFrames?: number;
  /** Frames per second (default: 30) */
  fps?: number;
  /** Callback when cinematic ends (natural or skipped) */
  onComplete?: () => void;
  /** Callback when skip becomes available */
  onSkipAvailable?: () => void;
  /** Callback when frame updates */
  onFrameChange?: (frame: number) => void;
  /** Whether to auto-play on mount */
  autoPlay?: boolean;
}

export interface UseCinematicReturn {
  /** Whether cinematic is currently playing */
  isPlaying: boolean;
  /** Whether skip button should be visible/enabled */
  canSkip: boolean;
  /** Current frame number */
  currentFrame: number;
  /** Progress as percentage (0-100) */
  progress: number;
  /** Duration in frames */
  durationFrames: number;
  /** Whether cinematic has completed */
  isComplete: boolean;
  /** Skip the cinematic */
  skip: () => void;
  /** Start playing */
  play: () => void;
  /** Pause playback */
  pause: () => void;
  /** Reset to beginning */
  reset: () => void;
  /** Callback for Player component frame updates */
  handleFrameUpdate: (frame: number) => void;
}

// ==============================================
// HOOK IMPLEMENTATION
// ==============================================

/**
 * React hook for managing cinematic playback and skip timing
 *
 * @param options - Configuration options
 * @returns Cinematic state and control functions
 *
 * @example
 * ```tsx
 * const {
 *   isPlaying,
 *   canSkip,
 *   progress,
 *   skip,
 *   handleFrameUpdate
 * } = useCinematic({
 *   durationFrames: 240, // 8 seconds at 30fps
 *   onComplete: () => console.log('Cinematic finished'),
 * });
 *
 * // In render:
 * <Player
 *   ...
 *   onFrameUpdate={handleFrameUpdate}
 * />
 * {canSkip && <button onClick={skip}>Skip</button>}
 * ```
 */
export function useCinematic(options: UseCinematicOptions = {}): UseCinematicReturn {
  const {
    durationFrames = DEFAULT_DURATION_FRAMES,
    fps = DEFAULT_FPS,
    onComplete,
    onSkipAvailable,
    onFrameChange,
    autoPlay = true,
  } = options;

  // ==============================================
  // STATE
  // ==============================================

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [canSkip, setCanSkip] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // ==============================================
  // REFS
  // ==============================================

  // Track skip timer for cleanup
  const skipTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Prevent multiple completion callbacks
  const hasCompletedRef = useRef(false);

  // Store callbacks in refs to avoid stale closures
  const onCompleteRef = useRef(onComplete);
  const onSkipAvailableRef = useRef(onSkipAvailable);
  const onFrameChangeRef = useRef(onFrameChange);

  // Update refs when callbacks change
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    onSkipAvailableRef.current = onSkipAvailable;
  }, [onSkipAvailable]);

  useEffect(() => {
    onFrameChangeRef.current = onFrameChange;
  }, [onFrameChange]);

  // ==============================================
  // SKIP TIMER EFFECT
  // ==============================================

  /**
   * Enable skip button after SKIP_DELAY_MS when playing starts.
   * Timer resets if playback stops before skip is enabled.
   */
  useEffect(() => {
    // Only start timer if playing and skip not yet enabled
    if (isPlaying && !canSkip && !isComplete) {
      skipTimerRef.current = setTimeout(() => {
        setCanSkip(true);
        onSkipAvailableRef.current?.();
      }, SKIP_DELAY_MS);
    }

    // Cleanup timer on unmount or when conditions change
    return () => {
      if (skipTimerRef.current) {
        clearTimeout(skipTimerRef.current);
        skipTimerRef.current = null;
      }
    };
  }, [isPlaying, canSkip, isComplete]);

  // ==============================================
  // COMPLETION HANDLER
  // ==============================================

  /**
   * Handle cinematic completion (natural or skipped).
   * Prevents multiple calls via hasCompletedRef.
   */
  const handleComplete = useCallback(() => {
    if (hasCompletedRef.current) return;

    hasCompletedRef.current = true;
    setIsPlaying(false);
    setIsComplete(true);
    onCompleteRef.current?.();
  }, []);

  // ==============================================
  // FRAME UPDATE HANDLER
  // ==============================================

  /**
   * Callback for Remotion Player's onFrameUpdate.
   * Tracks current frame and detects natural completion.
   */
  const handleFrameUpdate = useCallback(
    (frame: number) => {
      setCurrentFrame(frame);
      onFrameChangeRef.current?.(frame);

      // Check for natural completion (reached last frame)
      if (frame >= durationFrames - 1 && !hasCompletedRef.current) {
        handleComplete();
      }
    },
    [durationFrames, handleComplete]
  );

  // ==============================================
  // CONTROL FUNCTIONS
  // ==============================================

  /**
   * Skip the cinematic (only works after 2s delay)
   */
  const skip = useCallback(() => {
    if (canSkip && !isComplete) {
      handleComplete();
    }
  }, [canSkip, isComplete, handleComplete]);

  /**
   * Start/resume playback
   */
  const play = useCallback(() => {
    if (!isComplete) {
      setIsPlaying(true);
    }
  }, [isComplete]);

  /**
   * Pause playback
   */
  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  /**
   * Reset cinematic to beginning
   */
  const reset = useCallback(() => {
    setIsPlaying(false);
    setCanSkip(false);
    setCurrentFrame(0);
    setIsComplete(false);
    hasCompletedRef.current = false;

    // Clear any pending skip timer
    if (skipTimerRef.current) {
      clearTimeout(skipTimerRef.current);
      skipTimerRef.current = null;
    }
  }, []);

  // ==============================================
  // COMPUTED VALUES
  // ==============================================

  /**
   * Calculate progress percentage (0-100)
   */
  const progress = useMemo(() => {
    if (durationFrames === 0) return 0;
    return Math.min(100, (currentFrame / durationFrames) * 100);
  }, [currentFrame, durationFrames]);

  // ==============================================
  // CLEANUP
  // ==============================================

  useEffect(() => {
    return () => {
      if (skipTimerRef.current) {
        clearTimeout(skipTimerRef.current);
      }
    };
  }, []);

  // ==============================================
  // RETURN
  // ==============================================

  return {
    isPlaying,
    canSkip,
    currentFrame,
    progress,
    durationFrames,
    isComplete,
    skip,
    play,
    pause,
    reset,
    handleFrameUpdate,
  };
}

// ==============================================
// UTILITY FUNCTIONS
// ==============================================

/**
 * Convert seconds to frames at given FPS
 */
export function secondsToFrames(seconds: number, fps: number = DEFAULT_FPS): number {
  return Math.round(seconds * fps);
}

/**
 * Convert frames to seconds at given FPS
 */
export function framesToSeconds(frames: number, fps: number = DEFAULT_FPS): number {
  return frames / fps;
}

/**
 * Convert frames to milliseconds at given FPS
 */
export function framesToMs(frames: number, fps: number = DEFAULT_FPS): number {
  return (frames / fps) * 1000;
}
