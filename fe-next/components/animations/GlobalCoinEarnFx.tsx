'use client';

import React, { useEffect, useCallback } from 'react';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { SharedFxApp } from '@/lib/pixiFx/SharedFxApp';

export const COIN_EARNED_EVENT = 'lexiclash:coin-earned';

interface CoinEarnedDetail {
  amount: number;
  source?: { x: number; y: number };
}

const CASCADE_THRESHOLD = 100;
const MAX_COINS_PER_BURST = 10;
const MIN_COINS_PER_BURST = 4;
const COINS_PER_25_GOLD = 25;

function getTargetPosition(): { x: number; y: number } {
  if (typeof document === 'undefined') return { x: 0, y: 0 };
  const target = document.querySelector<HTMLElement>('[data-coin-counter="true"]');
  if (!target) {
    return { x: window.innerWidth - 40, y: 40 };
  }
  const rect = target.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function getSourcePosition(detail?: CoinEarnedDetail): { x: number; y: number } {
  if (detail?.source) return detail.source;
  if (typeof window === 'undefined') return { x: 0, y: 0 };
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

/**
 * Thin bridge: CoinContext CustomEvent → sound + SharedFxApp.spawnCoinStream.
 * Mount once inside SoundEffectsProvider.
 */
export const GlobalCoinEarnFx: React.FC = () => {
  const { playCoinCollectSound, playCoinCascadeSound } = useSoundEffects();

  const handleCoinEarned = useCallback(
    (evt: Event) => {
      const detail = (evt as CustomEvent<CoinEarnedDetail>).detail;
      const amount = detail?.amount ?? 0;
      if (amount <= 0) return;

      if (amount >= CASCADE_THRESHOLD) {
        playCoinCascadeSound();
      } else {
        playCoinCollectSound();
      }

      const count = Math.min(
        MAX_COINS_PER_BURST,
        Math.max(MIN_COINS_PER_BURST, Math.ceil(amount / COINS_PER_25_GOLD)),
      );

      SharedFxApp.spawnCoinStream({
        source: getSourcePosition(detail),
        target: getTargetPosition(),
        count,
      });
    },
    [playCoinCollectSound, playCoinCascadeSound],
  );

  useEffect(() => {
    window.addEventListener(COIN_EARNED_EVENT, handleCoinEarned);
    return () => window.removeEventListener(COIN_EARNED_EVENT, handleCoinEarned);
  }, [handleCoinEarned]);

  return null;
};

export default GlobalCoinEarnFx;
