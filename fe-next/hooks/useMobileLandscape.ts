'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to detect mobile landscape mode
 * Returns true when on mobile/tablet in landscape orientation
 * Threshold: window.innerWidth > window.innerHeight && window.innerHeight <= 600
 */
export function useMobileLandscape(): boolean {
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkLandscape = () => {
      const isLandscapeMode = window.innerWidth > window.innerHeight;
      const isMobileHeight = window.innerHeight <= 600;
      setIsLandscape(isLandscapeMode && isMobileHeight);
    };

    checkLandscape();
    window.addEventListener('resize', checkLandscape);
    window.addEventListener('orientationchange', checkLandscape);

    return () => {
      window.removeEventListener('resize', checkLandscape);
      window.removeEventListener('orientationchange', checkLandscape);
    };
  }, []);

  return isLandscape;
}
