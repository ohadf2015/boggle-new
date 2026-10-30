'use client';

import { useCallback, useRef, useState } from 'react';
import { useHasRealAdProvider } from '@/hooks/useHasRealAdProvider';
import { useCoinsFromContext } from '@/contexts/CoinContext';
import type { WordHuntRescueMethod } from '../analytics/wordHuntCompletePayload';

export const EXTRA_LIFE_RESTORE_AMOUNT = 50;
export const EXTRA_LIFE_COIN_COST = 50;

/** Single-use rescue at life 0 (rewarded ad or coins); every path is guarded so it can only pay and restore once. */
export function useSurvivalExtraLife({ practice }: { practice: boolean }) {
  const usedRef = useRef(false);
  const coinInFlightRef = useRef(false);
  const rescueMethodRef = useRef<WordHuntRescueMethod>(null);
  const restoreRef = useRef<((amount: number) => void) | null>(null);
  const [declined, setDeclined] = useState(false);
  const [coinPending, setCoinPending] = useState(false);
  const hasRealAdProvider = useHasRealAdProvider();
  const { canAfford, spendCoins } = useCoinsFromContext();
  const canAffordCoinRestore = canAfford(EXTRA_LIFE_COIN_COST);
  // Practice runs never bottom out on life, so a rescue offer would only be monetization noise there.
  const hasRescueAvailable = !practice && (hasRealAdProvider || canAffordCoinRestore);
  const offerOpen = hasRescueAvailable && !usedRef.current && !declined;

  const grant = useCallback((method: WordHuntRescueMethod) => {
    usedRef.current = true;
    rescueMethodRef.current = method;
    restoreRef.current?.(EXTRA_LIFE_RESTORE_AMOUNT);
  }, []);

  const onAdRestore = useCallback(() => {
    if (usedRef.current) return;
    grant('ad');
  }, [grant]);

  const onCoinRestore = useCallback(async () => {
    if (usedRef.current || coinInFlightRef.current) return;
    coinInFlightRef.current = true;
    setCoinPending(true);
    try {
      const ok = await spendCoins(EXTRA_LIFE_COIN_COST, 'Daily Survival Extra Life', { placement: 'daily_survival_extra_life_coin' });
      if (ok && !usedRef.current) grant('coin');
    } finally {
      coinInFlightRef.current = false;
      setCoinPending(false);
    }
  }, [spendCoins, grant]);

  const onDecline = useCallback(() => setDeclined(true), []);

  return { offerOpen, canAffordCoinRestore, coinPending, onAdRestore, onCoinRestore, onDecline, rescueMethodRef, restoreRef };
}
