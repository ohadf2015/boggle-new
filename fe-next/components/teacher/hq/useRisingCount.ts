'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * A number that steps up from whatever is already on screen to `target`, one
 * tick per arrival. Unlike `useCountUp` it never restarts from 0, so a class
 * of 3 gaining a 4th reads 3 → 4, not 0 → 1 → 2 → 3 → 4 beside four seats.
 *
 * `animate` is false for the first read (a page load is not an event) and
 * under reduced motion; a drop (student removed, class switched) always snaps.
 */
export function useRisingCount(target: number, animate: boolean, stepMs = 140): number {
  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);

  useEffect(() => {
    if (!animate || target <= shownRef.current) {
      shownRef.current = target;
      setShown(target);
      return;
    }
    const id = setInterval(() => {
      shownRef.current = Math.min(target, shownRef.current + 1);
      setShown(shownRef.current);
      if (shownRef.current >= target) clearInterval(id);
    }, stepMs);
    return () => clearInterval(id);
  }, [target, animate, stepMs]);

  return shown;
}

export default useRisingCount;
