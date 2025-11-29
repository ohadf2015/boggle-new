import { useRef, useEffect, useCallback } from 'react';

interface UseSafeIntervalReturn {
  setSafeInterval: (callback: () => void, delay: number) => NodeJS.Timeout;
  clearSafeInterval: (intervalId: NodeJS.Timeout) => void;
  clearAllIntervals: () => void;
}

/**
 * Custom hook for managing multiple setInterval calls safely
 * Automatically clears all intervals on component unmount
 * @returns Interval management functions
 */
export function useSafeInterval(): UseSafeIntervalReturn {
  const intervalsRef = useRef(new Set<NodeJS.Timeout>());

  // Create a safe setInterval that tracks the interval ID
  const setSafeInterval = useCallback((callback: () => void, delay: number) => {
    const intervalId = setInterval(callback, delay);
    intervalsRef.current.add(intervalId);
    return intervalId;
  }, []);

  // Clear a specific interval
  const clearSafeInterval = useCallback((intervalId: NodeJS.Timeout) => {
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
