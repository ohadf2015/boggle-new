import { useRef, useEffect, useCallback, useMemo } from 'react';

/**
 * Hook for managing a timeout that automatically cleans up
 *
 * Returns a function to set a new timeout and a function to clear it.
 * Automatically clears the timeout when the component unmounts.
 *
 * @example
 * ```tsx
 * const { set: setTimeout, clear: clearTimeout } = useSafeTimeout();
 *
 * const handleClick = () => {
 *   setTimeout(() => {
 *     setIsVisible(false);
 *   }, 2000);
 * };
 *
 * // Clear on some condition
 * if (shouldCancel) {
 *   clearTimeout();
 * }
 * ```
 */
export function useSafeTimeout() {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const set = useCallback((callback: () => void, delay: number) => {
    // Clear any existing timeout
    clear();
    // Set new timeout
    timeoutRef.current = setTimeout(callback, delay);
  }, [clear]);

  // Memoize the return value to ensure stable reference for useEffect dependencies
  return useMemo(() => ({ set, clear, timeoutRef }), [set, clear]);
}

/**
 * Hook for running a callback after a delay
 *
 * Automatically runs the callback after the specified delay.
 * Pass null as delay to pause the timeout.
 *
 * @example
 * ```tsx
 * // Auto-hide after 2 seconds
 * useTimeout(() => {
 *   setIsVisible(false);
 * }, isVisible ? 2000 : null);
 * ```
 */
export function useTimeout(callback: () => void, delay: number | null): void {
  const callbackRef = useRef(callback);

  // Update callback ref on each render
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    // Don't schedule if delay is null
    if (delay === null) return;

    const id = setTimeout(() => {
      callbackRef.current();
    }, delay);

    return () => clearTimeout(id);
  }, [delay]);
}

/**
 * Hook for managing an interval that automatically cleans up
 *
 * Returns functions to start and stop the interval.
 * Automatically clears the interval when the component unmounts.
 *
 * @example
 * ```tsx
 * const { start, stop, isRunning } = useSafeInterval();
 *
 * // Start countdown
 * start(() => {
 *   setCount(c => c - 1);
 * }, 1000);
 *
 * // Stop when reaching zero
 * if (count === 0) {
 *   stop();
 * }
 * ```
 */
export function useSafeInterval() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clear interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback((callback: () => void, interval: number) => {
    // Clear any existing interval
    stop();
    // Set new interval
    intervalRef.current = setInterval(callback, interval);
  }, [stop]);

  // Memoize the return value to ensure stable reference for useEffect dependencies
  // Without this, the returned object is a new reference on every render,
  // which causes infinite effect re-runs when used in dependency arrays
  return useMemo(
    () => ({
      start,
      stop,
      get isRunning() {
        return intervalRef.current !== null;
      },
      intervalRef,
    }),
    [start, stop]
  );
}

/**
 * Hook for running a callback at regular intervals
 *
 * Automatically runs the callback at the specified interval.
 * Pass null as delay to pause the interval.
 *
 * @example
 * ```tsx
 * // Update clock every second
 * useInterval(() => {
 *   setTime(new Date());
 * }, 1000);
 *
 * // Pause when not visible
 * useInterval(tick, isVisible ? 100 : null);
 * ```
 */
export function useInterval(callback: () => void, delay: number | null): void {
  const callbackRef = useRef(callback);

  // Update callback ref on each render
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    // Don't schedule if delay is null
    if (delay === null) return;

    const id = setInterval(() => {
      callbackRef.current();
    }, delay);

    return () => clearInterval(id);
  }, [delay]);
}

export default useSafeTimeout;
