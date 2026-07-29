'use client';

import { useCallback, useRef } from 'react';
import { initGameDistributionAds, showRewardedGd } from '@/lib/ads/gameDistributionAds';

/**
 * Hook around the GameDistribution HTML5 SDK for the web surface.
 *
 * Caller is responsible for surface-gating (`!isNative && !isCG`) and env-gating
 * (`NEXT_PUBLIC_GD_ADS_ENABLED` + a configured game id) before invoking — this
 * hook makes no platform assumptions beyond `typeof window`.
 *
 * Settle model (mirrors `useH5GamesAds`): `showRewardedGd()` resolves `true`
 * when the user fully watched the ad (SDK_REWARDED_WATCH_COMPLETE), `false` when
 * dismissed early, and rejects when the SDK could not show one. We collapse that
 * to a single `onReward` / `onError` outcome with a settle-once guard.
 */

export interface ShowRewardedGdHookOptions {
  /** Placement name for analytics — usually the surface (hint/freeze/retry/...). */
  name: string;
}

export interface UseGameDistributionAdsReturn {
  /** Load + configure the SDK. Idempotent. */
  initialize: () => Promise<void>;
  /** Show a rewarded ad. `onReward` fires only on a complete watch. */
  showRewarded: (
    onReward: () => void,
    onError?: (reason: string) => void,
    opts?: ShowRewardedGdHookOptions,
  ) => void;
  /** True in browser; false during SSR. Does NOT mean "ads will fill" — that's runtime. */
  isAvailable: boolean;
}

export function useGameDistributionAds(): UseGameDistributionAdsReturn {
  // Cache the init promise so repeated showRewarded calls share one script load.
  const initRef = useRef<Promise<void> | null>(null);
  const isAvailable = typeof window !== 'undefined';

  const initialize = useCallback(async () => {
    if (!isAvailable) return;
    if (!initRef.current) initRef.current = initGameDistributionAds();
    await initRef.current;
  }, [isAvailable]);

  const showRewarded = useCallback((
    onReward: () => void,
    onError?: (reason: string) => void,
    _opts?: ShowRewardedGdHookOptions,
  ) => {
    if (!isAvailable) {
      onError?.('gd-unavailable');
      return;
    }
    let settled = false;
    const settle = (granted: boolean, reason?: string) => {
      if (settled) return;
      settled = true;
      if (granted) onReward();
      else onError?.(reason ?? 'gd-no-reward');
    };

    if (!initRef.current) initRef.current = initGameDistributionAds();
    initRef.current
      .then(() => showRewardedGd())
      .then((watched) => settle(watched, watched ? undefined : 'gd-dismissed'))
      .catch((err) => settle(false, err instanceof Error ? err.message : 'gd-error'));
  }, [isAvailable]);

  return { initialize, showRewarded, isAvailable };
}

export default useGameDistributionAds;
