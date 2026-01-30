/**
 * usePrefersReducedMotion Hook
 *
 * Detects user's reduced motion preference for accessibility.
 * Respects prefers-reduced-motion media query (WCAG 2.1).
 */

import { useState, useEffect } from 'react';

/**
 * Hook to detect if user prefers reduced motion.
 *
 * Returns true if user has enabled reduced motion in their OS/browser settings.
 * Components should disable/simplify animations when true.
 *
 * @returns true if reduced motion is preferred, false otherwise
 *
 * @example
 * ```tsx
 * const prefersReducedMotion = usePrefersReducedMotion();
 *
 * <motion.div
 *   animate={prefersReducedMotion ? {} : { scale: 1.1 }}
 * />
 * ```
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check if window is available (SSR safety)
    if (typeof window === 'undefined') {
      return;
    }

    // Create media query
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReducedMotion;
}
