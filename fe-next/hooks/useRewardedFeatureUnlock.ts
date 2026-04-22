'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRewardedAd } from '@/hooks/useRewardedAd';
import { trackRewardedAdOffered } from '@/utils/growthTracking';

interface UseRewardedFeatureUnlockOptions {
  /** Analytics surface name (e.g. 'blast_wave_continue', 'daily_survival_extra_life') */
  placement: string;
  /** Called after the underlying ad rewards — run feature-unlock side effects here */
  onUnlock: () => void | Promise<void>;
  /** When true, do not track offer and ignore offer() calls */
  disabled?: boolean;
  /** Extra context for the offered event (e.g. { wave: 3 }) */
  context?: Record<string, unknown>;
}

export interface UseRewardedFeatureUnlockReturn {
  offer: () => void;
  status: ReturnType<typeof useRewardedAd>['status'];
  canShowAd: boolean;
  rewardAmount: number;
  isPlaceholder: boolean;
}

export function useRewardedFeatureUnlock(
  opts: UseRewardedFeatureUnlockOptions,
): UseRewardedFeatureUnlockReturn {
  const { placement, onUnlock, disabled = false, context } = opts;

  const onUnlockRef = useRef(onUnlock);
  onUnlockRef.current = onUnlock;

  const { status, canShowAd, rewardAmount, isPlaceholder, showAd } = useRewardedAd({
    onRewardEarned: async () => {
      await onUnlockRef.current();
    },
  });

  const offeredRef = useRef(false);
  useEffect(() => {
    if (disabled || !canShowAd) {
      offeredRef.current = false;
      return;
    }
    if (offeredRef.current) return;
    offeredRef.current = true;
    trackRewardedAdOffered(placement, context ?? {});
  }, [canShowAd, disabled, placement, context]);

  const offer = useCallback(() => {
    if (disabled) return;
    showAd();
  }, [disabled, showAd]);

  return { offer, status, canShowAd, rewardAmount, isPlaceholder };
}

export default useRewardedFeatureUnlock;
