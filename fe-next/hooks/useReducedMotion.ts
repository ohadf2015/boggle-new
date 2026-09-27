'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to detect if user prefers reduced motion
 * Respects the CSS media query `prefers-reduced-motion: reduce`
 *
 * Usage:
 * const prefersReducedMotion = useReducedMotion();
 *
 * // In animations:
 * animate={prefersReducedMotion ? {} : { scale: [1, 1.1, 1] }}
 * transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.5, repeat: Infinity }}
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check if window exists (SSR safety)
    if (typeof window === 'undefined') return;

    // Get initial preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    // Fallback for older browsers
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  return prefersReducedMotion;
}

/**
 * Helper to create motion-safe animation props
 * Returns empty object if user prefers reduced motion
 */
export function useMotionSafeAnimation<T extends object>(animation: T): T | Record<string, never> {
  const prefersReducedMotion = useReducedMotion();
  return prefersReducedMotion ? {} : animation;
}

export default useReducedMotion;
