import { useRef, useEffect, useCallback, useMemo } from 'react';

/**
 * Options for the useInactivityDetection hook
 */
export interface UseInactivityDetectionOptions {
  /**
   * Timeout in milliseconds before onInactive is called
   * @default 30000 (30 seconds)
   */
  timeout?: number;

  /**
   * Callback function triggered after the timeout expires with no activity
   */
  onInactive: () => void;

  /**
   * DOM events that reset the inactivity timer
   * @default ['mousemove', 'keydown', 'touchstart', 'click']
   */
  events?: string[];

  /**
   * Whether the inactivity detection is enabled
   * @default true
   */
  enabled?: boolean;
}

/**
 * Return value from the useInactivityDetection hook
 */
export interface UseInactivityDetectionReturn {
  /**
   * Timestamp of last detected activity
   */
  lastActivity: number;

  /**
   * Manual reset function to restart the inactivity timer
   * Useful for game actions like word submissions
   */
  reset: () => void;
}

/** Default timeout: 30 seconds */
const DEFAULT_TIMEOUT = 30000;

/** Default DOM events to listen for */
const DEFAULT_EVENTS = ['mousemove', 'keydown', 'touchstart', 'click'];

/**
 * Hook for detecting user inactivity
 *
 * Tracks user activity via DOM events and fires a callback after a configurable
 * timeout period of inactivity. Designed for Lexi stuck detection (DEBT-04).
 *
 * @example
 * ```tsx
 * const { reset, lastActivity } = useInactivityDetection({
 *   timeout: 30000, // 30 seconds
 *   onInactive: () => {
 *     // Show hint or help
 *     showLexiHint();
 *   },
 *   enabled: isGameActive,
 * });
 *
 * // Call reset on game actions to restart timer
 * const handleWordSubmit = (word: string) => {
 *   submitWord(word);
 *   reset(); // Reset inactivity timer
 * };
 * ```
 */
export function useInactivityDetection(
  options: UseInactivityDetectionOptions
): UseInactivityDetectionReturn {
  const {
    timeout = DEFAULT_TIMEOUT,
    onInactive,
    events = DEFAULT_EVENTS,
    enabled = true,
  } = options;

  // Store callback in ref to avoid restarting timer on callback changes
  const onInactiveRef = useRef(onInactive);
  onInactiveRef.current = onInactive;

  // Timer reference
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Last activity timestamp
  const lastActivityRef = useRef<number>(Date.now());

  // Whether callback has been called (prevents multiple calls until reset)
  const hasFiredRef = useRef<boolean>(false);

  // Clear the timer
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Start/restart the timer
  const startTimer = useCallback(() => {
    clearTimer();
    hasFiredRef.current = false;

    timerRef.current = setTimeout(() => {
      if (!hasFiredRef.current) {
        hasFiredRef.current = true;
        onInactiveRef.current();
      }
    }, timeout);
  }, [clearTimer, timeout]);

  // Handle activity event - reset timer
  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (!hasFiredRef.current) {
      startTimer();
    }
  }, [startTimer]);

  // Manual reset function - exposed to consumers
  const reset = useCallback(() => {
    lastActivityRef.current = Date.now();
    startTimer();
  }, [startTimer]);

  // Setup/teardown event listeners and timer
  useEffect(() => {
    if (!enabled) {
      clearTimer();
      return;
    }

    // Start initial timer
    lastActivityRef.current = Date.now();
    startTimer();

    // Add event listeners
    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    // Cleanup
    return () => {
      clearTimer();
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [enabled, events, handleActivity, startTimer, clearTimer]);

  // Return stable object with getter for lastActivity
  return useMemo(
    () => ({
      get lastActivity() {
        return lastActivityRef.current;
      },
      reset,
    }),
    [reset]
  );
}

export default useInactivityDetection;
