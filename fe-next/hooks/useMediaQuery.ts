'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to detect media query match
 * @param query - CSS media query string (e.g., '(min-width: 768px)')
 * @returns boolean - true if media query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  const checkMatch = useCallback(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);
  }, [query]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);

    // Initial check
    setMatches(mediaQuery.matches);

    // Modern API with addEventListener
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);

    // Use addEventListener if available (modern browsers)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(listener);
      return () => mediaQuery.removeListener(listener);
    }
  }, [query]);

  return matches;
}

/**
 * Hook to detect desktop mode (md breakpoint and above)
 * @returns boolean - true if viewport is >= 768px (Tailwind md breakpoint)
 */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 768px)');
}
