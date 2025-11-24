import { useRef, useEffect, useCallback } from 'react';

/**
 * Custom hook for managing multiple setInterval calls safely
 * Automatically clears all intervals on component unmount
 * @returns {Object} Interval management functions
 */
export function useSafeInterval() {
  const intervalsRef = useRef(new Set());

  // Create a safe setInterval that tracks the interval ID
  const setSafeInterval = useCallback((callback, delay) => {
    const intervalId = setInterval(callback, delay);
    intervalsRef.current.add(intervalId);
    return intervalId;
  }, []);

  // Clear a specific interval
  const clearSafeInterval = useCallback((intervalId) => {
    if (intervalId && intervalsRef.current.has(intervalId)) {
      clearInterval(intervalId);
      intervalsRef.current.delete(intervalId);
    }
  }, []);

  // Clear all intervals
  const clearAllIntervals = useCallback(() => {
    intervalsRef.current.forEach((intervalId) => {
      clearInterval(intervalId);
    });
    intervalsRef.current.clear();
  }, []);

  // Clean up all intervals on unmount
  useEffect(() => {
    return () => {
      clearAllIntervals();
    };
  }, [clearAllIntervals]);

  return {
    setSafeInterval,
    clearSafeInterval,
    clearAllIntervals,
  };
}
