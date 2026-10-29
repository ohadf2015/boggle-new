'use client';

import { useEffect } from 'react';
import { scheduleSpLcpSrcSwap } from '@/lib/perf/swapSpLcpSrc';

/**
 * Mounted on /singleplayer so the SSR shell img (winner-lcp.webp, already
 * preloaded) stays the LCP src. After LCP paint, the right-sized
 * winner-swap.webp is applied as a CSS background on #sp-lcp-anim — never
 * as an img src swap, which is what Lantern scores as simulated LCP.
 * Renders nothing — the element it mutates lives in SinglePlayerLcpShell.
 */
export function SpLcpSrcSwap() {
  useEffect(() => scheduleSpLcpSrcSwap(), []);
  return null;
}
