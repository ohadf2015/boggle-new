'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Hold a transient toast on screen through an EXIT animation after its source
 * clears, so compliments/messages leave with a cool effect instead of snapping
 * to nothing.
 *
 * Pairs with {@link useAutoDismiss}: that nulls the source value after the hold
 * (e.g. 2s); this watches the source and, the moment it goes null, keeps the
 * LAST value rendered with `exiting = true` for `exitMs` so the caller can run
 * an exit keyframe, then unmounts it. A fresh message mid-exit cancels the exit
 * and shows the new one immediately.
 *
 * @param source  the live toast value (null/undefined ⇒ source wants it gone).
 * @param exitMs  how long the exit animation runs before unmount (0 ⇒ next tick,
 *                the reduced-motion path).
 */
export function useExitReveal<T>(source: T | null | undefined, exitMs = 420): { value: T | null; exiting: boolean } {
  const [value, setValue] = useState<T | null>(source ?? null);
  const [exiting, setExiting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef<T | null>(value);
  valueRef.current = value;

  useEffect(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }

    if (source != null) {
      // Live (or refreshed) content — show it now, cancel any pending exit.
      setValue(source);
      setExiting(false);
    } else if (valueRef.current != null) {
      // Source cleared while something is showing → run the exit, keep the last
      // value on screen until the animation finishes, then unmount it.
      setExiting(true);
      timer.current = setTimeout(() => {
        setValue(null);
        setExiting(false);
        timer.current = null;
      }, exitMs);
    }

    return () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  }, [source, exitMs]);

  return { value, exiting };
}
