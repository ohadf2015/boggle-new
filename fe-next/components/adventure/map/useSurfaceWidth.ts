'use client';

/**
 * Width of the surface the map draws itself into, measured BEFORE paint.
 *
 * Deliberately not `window.matchMedia` at render time: a hook that returns the
 * phone preset on the server and flips to the TV preset after mount is the
 * "optimistic default a later source overrides" flash this repo keeps getting
 * bitten by. `useLayoutEffect` runs before the browser paints, so the first
 * painted frame already has the real width, and `measured` lets the caller
 * hold the canvas for the one commit where it does not.
 *
 * `ResizeObserver` is guarded: it does not exist in jsdom, where the element
 * measures 0 and the phone preset is the correct answer anyway.
 */
import { useCallback, useLayoutEffect, useRef, useState } from 'react';

export function useSurfaceWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  const [measured, setMeasured] = useState(false);

  const read = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    setMeasured(true);
  }, []);

  useLayoutEffect(() => {
    read();
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [read]);

  return { ref, width, measured };
}
