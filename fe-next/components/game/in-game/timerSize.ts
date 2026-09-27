'use client';

import { useState, useEffect } from 'react';

export type TimerSize = 'sm' | 'md';

/**
 * Faithful replacement for the prior 4× CircularTimer breakpoint-div split.
 * Returns the size each viewport showed before the single-timer collapse.
 *
 * Derived from globals.css @custom-variant breakpoints + the 4 divs:
 *   medium-short = max-height:850, desktop-medium-short = lg & max-height:1023.
 *   - mobile  (<768w):        sm
 *   - tablet  (768..1023w):   md when height > 850, else sm
 *   - desktop (>=1024w):      md when height >= 1024, else sm
 */
export function resolveTimerSize(width: number, height: number): TimerSize {
  if (width < 768) return 'sm';
  if (width < 1024) return height > 850 ? 'md' : 'sm';
  return height >= 1024 ? 'md' : 'sm';
}

/**
 * Tracks the responsive CircularTimer size for the in-game stats row.
 * SSR-safe: renders 'sm' (the majority / mobile-first case) until mounted,
 * then resolves from the real viewport and follows resizes. Replaces the four
 * CSS-hidden CircularTimer mounts that all re-rendered on every 1s tick.
 */
export function useTimerSize(): TimerSize {
  const [size, setSize] = useState<TimerSize>('sm');
  useEffect(() => {
    const update = () => setSize(resolveTimerSize(window.innerWidth, window.innerHeight));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return size;
}
