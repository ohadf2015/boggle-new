'use client';

import { useEffect, useState } from 'react';

/**
 * Below this the control strip has to give space back to the game surface.
 *
 * Measured against the live Vocab Quiz projector: the host surface (prompt card
 * plus a 2x2 answer grid) needs ~566px, and the answer grid is a plain CSS grid
 * that cannot shrink. On a 633px-tall laptop window a full-height strip left
 * the last row of answers sitting underneath it. A fullscreen 720p projector
 * has room for both, so the strip only compacts where it must.
 */
export const SHORT_VIEWPORT_PX = 760;

/**
 * True while the viewport is too short to carry the strip at full size.
 *
 * Starts false so SSR and the first paint render the full-size strip, then
 * corrects on mount — the opposite default would flash big controls down to
 * small ones on every projector.
 */
export function useShortViewport(maxHeight: number = SHORT_VIEWPORT_PX): boolean {
  const [isShort, setIsShort] = useState(false);

  useEffect(() => {
    const measure = () => setIsShort(window.innerHeight > 0 && window.innerHeight < maxHeight);
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, [maxHeight]);

  return isShort;
}

export default useShortViewport;
