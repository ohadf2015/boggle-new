import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for managing setInterval with automatic cleanup
 * @param {Function} callback - Function to execute on each interval
 * @param {number} delay - Delay in milliseconds (null to pause)
 * @returns {Object} Control functions
 */
export function useInterval(callback, delay) {
  const savedCallback = useRef(callback);
  const intervalIdRef = useRef(null);

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
