'use client';

import { useEffect, type RefObject } from 'react';

/**
 * While a field inside `scope` has focus, keep `target` (the step's primary
 * button) on screen as the software keyboard opens and the visual viewport
 * shrinks under it.
 */
export function useKeepInView(scope: RefObject<HTMLElement | null>, target: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = scope.current;
    if (!root || typeof window === 'undefined') return;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const reveal = () => {
      if (!root.contains(document.activeElement)) return;
      clearTimeout(timer);
      // The keyboard animates in; reveal once it has settled.
      timer = setTimeout(() => {
        const el = target.current;
        if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'nearest' });
      }, 250);
    };

    root.addEventListener('focusin', reveal);
    const vv = window.visualViewport;
    vv?.addEventListener('resize', reveal);
    // A late class name or seeded nickname can grow the step after the first reveal.
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(reveal) : null;
    ro?.observe(root);
    // Focus may already be inside (autofocus ran before this effect).
    reveal();
    return () => {
      ro?.disconnect();
      clearTimeout(timer);
      root.removeEventListener('focusin', reveal);
      vv?.removeEventListener('resize', reveal);
    };
  }, [scope, target]);
}
