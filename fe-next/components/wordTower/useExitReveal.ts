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
    // Guard against the setTimeout and the rAF watchdog both firing, or a stale
    // watchdog tick running after the value has already been cleared. Ensures
    // the finish cleanup runs exactly once per exit.
    let finished = false;
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    let raf = 0;

    if (source != null) {
      // Live (or refreshed) content — show it now, cancel any pending exit.
      setValue(source);
      setExiting(false);
    } else if (valueRef.current != null && exitMs <= 0) {
      // Reduced-motion path: no exit animation, so clear SYNCHRONOUSLY instead of
      // via setTimeout(0). A busy webview frame can starve that 0ms timer, leaving
      // the toast stuck — the founder's "notifications stay stuck" report. Clearing
      // in the effect body removes the timer dependency entirely.
      finished = true;
      setValue(null);
      setExiting(false);
    } else if (valueRef.current != null) {
      // Source cleared while something is showing → run the exit, keep the last
      // value on screen until the animation finishes, then unmount it.
      setExiting(true);
      const finish = () => {
        if (finished) return;
        finished = true;
        if (raf) cancelAnimationFrame(raf);
        setValue(null);
        setExiting(false);
        timer.current = null;
      };
      timer.current = setTimeout(finish, exitMs);
      // rAF watchdog (same rationale as useAutoDismiss): guarantees the exit
      // completes + unmounts even if the main thread starves setTimeout, so a
      // toast can never linger half-faded on a busy frame. The `finished` guard
      // prevents it from double-firing if the setTimeout already won.
      if (exitMs > 0 && typeof requestAnimationFrame !== 'undefined') {
        const start = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
        const tick = () => {
          if (finished) return;
          if (now() - start >= exitMs) {
            if (timer.current) { clearTimeout(timer.current); }
            finish();
            return;
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      }
    }

    return () => {
      finished = true;
      if (timer.current) { clearTimeout(timer.current); timer.current = null; }
      if (raf) cancelAnimationFrame(raf);
    };
  }, [source, exitMs]);

  return { value, exiting };
}
