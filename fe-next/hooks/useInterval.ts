import { useEffect, useRef, useCallback } from 'react';

interface UseIntervalReturn {
  clear: () => void;
  reset: () => void;
}

/**
 * Custom hook for managing setInterval with automatic cleanup
 * @param callback - Function to execute on each interval
 * @param delay - Delay in milliseconds (null to pause)
 * @returns Control functions
 */
export function useInterval(callback: () => void, delay: number | null): UseIntervalReturn {
  const savedCallback = useRef(callback);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval
  useEffect(() => {
    // Don't schedule if no delay is specified
    if (delay === null) {
      return;
    }

    intervalIdRef.current = setInterval(() => {
      savedCallback.current();
    }, delay);

    // Clean up on unmount or when delay/callback changes
    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, [delay]);

  // Expose a function to manually clear the interval
  const clear = useCallback(() => {
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
  }, []);

  // Expose a function to reset the interval
  const reset = useCallback(() => {
    clear();
    if (delay !== null) {
      intervalIdRef.current = setInterval(() => {
        savedCallback.current();
      }, delay);
    }
  }, [delay, clear]);

  return { clear, reset };
}
