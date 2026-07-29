'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

/** Delay in ms before showing hint prompt after last word found */
const HINT_PROMPT_DELAY_MS = 5000; // 5 seconds

/** Interval in ms to check for inactivity */
const CHECK_INTERVAL_MS = 2000; // 2 seconds (check more frequently)

interface UseHintPromptOptions {
  /** Whether the game is paused */
  isPaused: boolean;
  /** Whether the game is over */
  isGameOver: boolean;
  /** Whether the grid has been loaded */
  hasGrid: boolean;
}

interface UseHintPromptReturn {
  /** Whether to show the hint prompt */
  showHintPrompt: boolean;
  /** Dismiss the hint prompt */
  dismissHintPrompt: () => void;
  /** Reset the inactivity timer (call when player finds a word) */
  resetInactivityTimer: () => void;
  /** Ref for tracking last word found time */
  lastWordFoundTimeRef: React.MutableRefObject<number>;
}

/**
 * Hook to manage hint prompt timing
 * Shows a hint prompt after the player hasn't found a word for 15+ seconds
 */
export function useHintPrompt({
  isPaused,
  isGameOver,
  hasGrid,
}: UseHintPromptOptions): UseHintPromptReturn {
  const [showHintPrompt, setShowHintPrompt] = useState(false);
  const lastWordFoundTimeRef = useRef<number>(0);

  // Ref for showHintPrompt to avoid adding it to useEffect dependencies
  const showHintPromptRef = useRef(showHintPrompt);
  useEffect(() => {
    showHintPromptRef.current = showHintPrompt;
  }, [showHintPrompt]);

  // Check for inactivity and show hint prompt
  useEffect(() => {
    if (isPaused || isGameOver || !hasGrid) return;

    // Initialize the ref on first run (avoids impure Date.now() call during render)
    if (lastWordFoundTimeRef.current === 0) {
      lastWordFoundTimeRef.current = Date.now();
    }

    const checkInactivity = setInterval(() => {
      const timeSinceLastWord = Date.now() - lastWordFoundTimeRef.current;
      // Use ref to read current showHintPrompt value without adding to dependencies
      if (timeSinceLastWord >= HINT_PROMPT_DELAY_MS && !showHintPromptRef.current) {
        setShowHintPrompt(true);
      }
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(checkInactivity);
  }, [isPaused, isGameOver, hasGrid]);

  const dismissHintPrompt = useCallback(() => {
    setShowHintPrompt(false);
  }, []);

  const resetInactivityTimer = useCallback(() => {
    lastWordFoundTimeRef.current = Date.now();
    setShowHintPrompt(false);
  }, []);

  return {
    showHintPrompt,
    dismissHintPrompt,
    resetInactivityTimer,
    lastWordFoundTimeRef,
  };
}
