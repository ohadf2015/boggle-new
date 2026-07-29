/**
 * Accessibility utility functions
 */

import { useState, useEffect } from 'react';

/**
 * Imperative sibling to `useReducedMotion` — synchronously reads the
 * `(prefers-reduced-motion: reduce)` media query without requiring a React
 * render cycle. Safe to call from Pixi effect callbacks, RAF loops, and
 * other non-React contexts where the `useReducedMotion` hook doesn't fit.
 *
 * SSR-safe: returns `false` (motion OK) when `window` or `matchMedia` are
 * unavailable, so first paint matches the hook's initial state and avoids
 * hydration-time flicker.
 */
export const isReducedMotionPreferred = (): boolean => {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * React hook to detect reduced motion preference
 * Listens for changes and updates automatically
 * @returns True if user prefers reduced motion
 */
export const useReducedMotion = (): boolean => {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }
    // Check initial value
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!mediaQuery) {
      return;
    }
    setReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
    };

    // Modern browsers use addEventListener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Legacy browsers (Safari < 14)
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  return reducedMotion;
};

