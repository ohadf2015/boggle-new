import { useRef, useEffect, useCallback } from 'react';

/**
 * Hook that keeps a ref synchronized with a callback
 *
 * This is useful when you need to use a callback in an effect or event handler
 * but don't want to recreate the effect/handler every time the callback changes.
 *
 * @example
 * ```tsx
 * const callbackRef = useCallbackRef(onSomeEvent);
 *
 * useEffect(() => {
 *   // This effect won't re-run when onSomeEvent changes
 *   // but callbackRef.current will always have the latest callback
 *   socket.on('event', () => {
 *     callbackRef.current(data);
 *   });
 * }, [socket]); // No need to include onSomeEvent in deps
 * ```
 */
export function useCallbackRef<T extends (...args: any[]) => any>(
  callback: T
): React.MutableRefObject<T> {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return callbackRef;
}

/**
 * Hook that returns a stable callback that always calls the latest version
 *
 * Similar to useCallbackRef but returns a stable function instead of a ref.
 * Useful when you need to pass a callback to a child component without
 * causing unnecessary re-renders.
 *
 * @example
 * ```tsx
 * const stableOnChange = useStableCallback(onChange);
 *
 * // stableOnChange identity never changes, but always calls latest onChange
 * return <ExpensiveComponent onChange={stableOnChange} />;
 * ```
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T
): T {
  const callbackRef = useCallbackRef(callback);

  // Return a stable callback that delegates to the ref
  return useCallback(
    ((...args: Parameters<T>) => callbackRef.current(...args)) as T,
    []
  );
}

export default useCallbackRef;
