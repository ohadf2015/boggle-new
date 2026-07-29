'use client';

import { useEffect, useRef } from 'react';

/**
 * Fires `onComplete(getResults())` exactly once when `phase` first becomes
 * `'complete'`. Subsequent re-renders — even with new callback references
 * caused by parent state updates — are ignored.
 *
 * Background: drill completion previously dispatched rewards via a `useEffect`
 * with `onComplete` in its deps. After the first call, awarding gold updated
 * `CoinContext.coins` → `addCoins` ref changed → `awardDrillRewards` ref
 * changed → parent's `handleComplete` ref changed → effect re-fired with
 * `phase` still `'complete'` → infinite reward loop.
 */
export function useDrillCompleteOnce<R>(
  phase: string,
  getResults: () => R,
  onComplete: (result: R) => void,
  onCompleteSideEffect?: () => void,
): void {
  const firedRef = useRef(false);

  useEffect(() => {
    if (phase !== 'complete' || firedRef.current) return;
    firedRef.current = true;
    onCompleteSideEffect?.();
    onComplete(getResults());
  }, [phase, getResults, onComplete, onCompleteSideEffect]);
}
