import { useEffect, useRef } from 'react';

/**
 * Tracks the previous value of a variable across renders.
 *
 * Returns `undefined` on the first render, then the previous value
 * on subsequent renders. Useful for detecting changes in useEffect.
 *
 * @example
 * const prevCount = usePreviousValue(count);
 * useEffect(() => {
 *   if (prevCount !== undefined && count > prevCount) {
 *     // count increased
 *   }
 * }, [count, prevCount]);
 */
export function usePreviousValue<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  });

  return ref.current;
}
