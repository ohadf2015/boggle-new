'use client';

import { useEffect, useRef } from 'react';

/**
 * Publishes `--results-sticky-cta-h` so the growth soft-sheet
 * (FirstWinSignupModal) can clear mobile sticky results CTAs
 * (t_da22db9a). Mirrors MultiplayerSignupSheet's bottomOffset pattern.
 */
export function useResultsStickyCtaHeight<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof document === 'undefined') return;
    const root = document.documentElement;
    const sync = () => {
      root.style.setProperty('--results-sticky-cta-h', `${el.offsetHeight}px`);
    };
    sync();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(sync) : null;
    ro?.observe(el);
    return () => {
      ro?.disconnect();
      root.style.removeProperty('--results-sticky-cta-h');
    };
  }, []);

  return ref;
}
