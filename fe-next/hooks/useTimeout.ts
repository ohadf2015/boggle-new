import { useEffect, useRef, useCallback } from 'react';

interface UseTimeoutReturn {
  clear: () => void;
  reset: () => void;
}

/**
 * Custom hook for managing setTimeout with automatic cleanup
 * @param callback - Function to execute after delay
 * @param delay - Delay in milliseconds (null to pause)
 * @returns Control functions
 */
export function useTimeout(callback: () => void, delay: number | null): UseTimeoutReturn {
  const savedCallback = useRef(callback);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the timeout
  useEffect(() => {
    // Don't schedule if no delay is specified
    if (delay === null) {
      return;
    }

    timeoutIdRef.current = setTimeout(() => {
      savedCallback.current();
    }, delay);

    // Clean up on unmount or when delay/callback changes
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, [delay]);

  // Expose a function to manually clear the timeout
  const clear = useCallback(() => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
  }, []);

  // Expose a function to reset the timeout
  const reset = useCallback(() => {
    clear();
    if (delay !== null) {
      timeoutIdRef.current = setTimeout(() => {
        savedCallback.current();
      }, delay);
    }
  }, [delay, clear]);

  return { clear, reset };
}
