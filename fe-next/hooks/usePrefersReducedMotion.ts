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
 * <m.div
 *   animate={prefersReducedMotion ? {} : { scale: 1.1 }}
 * />
 * ```
 */
export function usePrefersReducedMotion(): boolean {
  // Start false so SSR (no window) and the client's FIRST render agree — reading
  // matchMedia in the initializer diverges from SSR for reduced-motion users and
  // triggers React #418 tree regeneration. The effect below syncs the real value
  // post-mount; the SSR HTML already paints motion-on either way, so this adds no
  // flash, it only removes the mismatch.
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
