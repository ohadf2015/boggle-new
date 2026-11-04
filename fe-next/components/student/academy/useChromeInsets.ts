'use client';

import { useLayoutEffect, useState, type RefObject } from 'react';
import type { Insets } from './artFit';

/** Breathing room between the chrome and the nearest island box, px. */
const CHROME_GAP = 8;

/**
 * How much of each edge of the hub the chrome covers, measured (visual px, zoom
 * included) so the islands are solved against the real HUD and bottom bar. Read
 * against the hub's own box: a cookie banner under the hub is not chrome.
 */
export function useChromeInsets(
  hub: RefObject<HTMLElement | null>,
  top: RefObject<HTMLElement | null>,
  bottom: RefObject<HTMLElement | null>,
  deps: unknown[],
): Insets {
  const [insets, setInsets] = useState<Insets>({ top: 96, bottom: 170, left: 8, right: 8 });
  useLayoutEffect(() => {
    const read = () => {
      const tr = top.current?.getBoundingClientRect();
      const br = bottom.current?.getBoundingClientRect();
      // jsdom (no layout) reports zeros — keep the estimate.
      if (!tr || !br || (tr.height === 0 && br.height === 0)) return;
      const box = hub.current?.getBoundingClientRect();
      const hubTop = box && box.height > 0 ? box.top : 0;
      const hubBottom = box && box.height > 0 ? box.bottom : window.innerHeight;
      const next = {
        top: tr.bottom - hubTop + CHROME_GAP,
        bottom: Math.max(0, hubBottom - br.top) + CHROME_GAP,
        left: CHROME_GAP,
        right: CHROME_GAP,
      };
      setInsets((prev) => (Math.abs(prev.top - next.top) < 1 && Math.abs(prev.bottom - next.bottom) < 1 ? prev : next));
    };
    read();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(read) : null;
    for (const el of [hub.current, top.current, bottom.current]) if (el) ro?.observe(el);
    window.addEventListener('resize', read);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', read);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return insets;
}
