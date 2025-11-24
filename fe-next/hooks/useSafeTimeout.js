import { useRef, useEffect, useCallback } from 'react';

/**
 * Custom hook for managing multiple setTimeout calls safely
 * Automatically clears all timeouts on component unmount
 * @returns {Object} Timeout management functions
 */
export function useSafeTimeout() {
  const timeoutsRef = useRef(new Set());

  // Create a safe setTimeout that tracks the timeout ID
  const setSafeTimeout = useCallback((callback, delay) => {
    const timeoutId = setTimeout(() => {
      callback();
      timeoutsRef.current.delete(timeoutId);
    }, delay);

    timeoutsRef.current.add(timeoutId);
    return timeoutId;
  }, []);

  // Clear a specific timeout
  const clearSafeTimeout = useCallback((timeoutId) => {
    if (timeoutId && timeoutsRef.current.has(timeoutId)) {
      clearTimeout(timeoutId);
      timeoutsRef.current.delete(timeoutId);
    }
  }, []);

  // Clear all timeouts
  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    timeoutsRef.current.clear();
  }, []);

  // Clean up all timeouts on unmount
  useEffect(() => {
    return () => {
      clearAllTimeouts();
    };
  }, [clearAllTimeouts]);

  return {
    setSafeTimeout,
    clearSafeTimeout,
    clearAllTimeouts,
  };
}
