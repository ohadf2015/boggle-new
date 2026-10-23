'use client';

import { useEffect } from 'react';
import { scheduleSpLcpSrcSwap } from '@/lib/perf/swapSpLcpSrc';

/**
 * Mounted on /singleplayer so the SSR shell img (winner-lcp.webp, already
 * preloaded) upgrades to the animated winner.webp only after LCP paint.
 * Renders nothing — the element it mutates lives in SinglePlayerLcpShell.
 */
export function SpLcpSrcSwap() {
  useEffect(() => scheduleSpLcpSrcSwap(), []);
  return null;
}
