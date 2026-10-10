'use client';
import { useEffect, useRef } from 'react';
import { emitCoinEarned } from '@/utils/coinEarnedFx';

/** Fires one coin-earned moment per in-level increase. Visual only: the wallet total stays server-owned. */
export function useBlastCoinEarn(levelCoins: number): void {
  const prev = useRef(levelCoins);
  useEffect(() => {
    const delta = levelCoins - prev.current;
    prev.current = levelCoins;
    if (delta > 0) emitCoinEarned(delta);
  }, [levelCoins]);
}
