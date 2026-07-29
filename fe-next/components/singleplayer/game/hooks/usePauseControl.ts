'use client';

import { useState, useCallback } from 'react';

interface UsePauseControlOptions {
  /** Whether pause is allowed (e.g., not in practice mode) */
  allowPause?: boolean;
}

interface UsePauseControlReturn {
  /** Whether the game is currently paused by user */
  isPaused: boolean;
  /** Toggle pause state */
  togglePause: () => void;
  /** Explicitly set pause state */
  setPaused: (paused: boolean) => void;
  /** Reset pause state (for new game) */
  resetPause: () => void;
}

/**
 * Hook to manage game pause state
 * Handles user-initiated pause/resume functionality
 */
export function usePauseControl({
  allowPause = true,
}: UsePauseControlOptions = {}): UsePauseControlReturn {
  const [isPaused, setIsPaused] = useState(false);

  const togglePause = useCallback(() => {
    if (!allowPause) return;
    setIsPaused(prev => !prev);
  }, [allowPause]);

  const setPaused = useCallback((paused: boolean) => {
    if (!allowPause && paused) return;
    setIsPaused(paused);
  }, [allowPause]);

  const resetPause = useCallback(() => {
    setIsPaused(false);
  }, []);

  return {
    isPaused,
    togglePause,
    setPaused,
    resetPause,
  };
}
