'use client';

import { useRef, useEffect } from 'react';

/**
 * Hook to track component mount state.
 * Use this to prevent state updates after unmount, avoiding React warnings.
 *
 * @returns A ref that is true while component is mounted, false after unmount
 *
 * @example
 * const isMounted = useMounted();
 *
 * useEffect(() => {
 *   fetchData().then(data => {
 *     if (isMounted.current) {
 *       setState(data);
 *     }
 *   });
 * }, []);
 */
export function useMounted(): React.MutableRefObject<boolean> {
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return isMounted;
}

export default useMounted;
