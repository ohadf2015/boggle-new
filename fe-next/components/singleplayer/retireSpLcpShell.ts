'use client';

import { useEffect, useRef } from 'react';

export const SP_LCP_READY_ATTR = 'data-sp-ready';

type SpPhase = 'pre-game' | 'playing' | 'results';

function applySpLcpReady(on: boolean): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const paint = document.getElementById('sp-lcp-paint');
  if (on) {
    root.setAttribute(SP_LCP_READY_ATTR, '');
    if (paint) paint.hidden = true;
  } else {
    root.removeAttribute(SP_LCP_READY_ATTR);
    if (paint) paint.hidden = false;
  }
}

/**
 * Retire #sp-lcp-paint once SP is past the playing overlay, without unmounting
 * it (LCP must not retarget). Playing keeps the shell — SinglePlayerGame's
 * z-70 box covers it. Once retired (results / pre-game), stay retired through
 * rematch so the mascot overlay does not flash back.
 */
export function useRetireSpLcpShell(phase: SpPhase): void {
  const retiredRef = useRef(false);

  useEffect(() => {
    if (phase === 'playing' && !retiredRef.current) return;
    retiredRef.current = true;
    applySpLcpReady(true);
  }, [phase]);

  useEffect(() => () => applySpLcpReady(false), []);
}
