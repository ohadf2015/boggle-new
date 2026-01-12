'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to detect mobile portrait mode
 * Returns true when on mobile (< 640px width) in portrait orientation
 */
export function useMobilePortrait(): boolean {
  const [isMobilePortrait, setIsMobilePortrait] = useState(false);

  const checkPortrait = useCallback(() => {
    if (typeof window === 'undefined') return;
    const isPortrait = window.innerWidth <= window.innerHeight;
    const isMobileWidth = window.innerWidth < 640; // Tailwind sm breakpoint
    setIsMobilePortrait(isPortrait && isMobileWidth);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initial check
    checkPortrait();

    // Listen for resize and orientation changes
    window.addEventListener('resize', checkPortrait);
    window.addEventListener('orientationchange', checkPortrait);

    return () => {
      window.removeEventListener('resize', checkPortrait);
      window.removeEventListener('orientationchange', checkPortrait);
    };
  }, [checkPortrait]);

  return isMobilePortrait;
}
