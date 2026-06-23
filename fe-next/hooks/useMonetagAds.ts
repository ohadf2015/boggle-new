'use client';

import { useCallback, useRef } from 'react';
import { initMonetagAds, showRewardedMonetag } from '@/lib/ads/monetagAds';

/**
 * Hook around the Monetag SDK for the web surface (instant-approval rewarded
 * fill — the AdSense/CrazyGames/AdinPlay-rejection fallback).
 *
 * Surface-gating is enforced inside the lib (`isMonetagAllowedSurface`):
 * Monetag never loads or shows inside the native Capacitor app (AdMob serves
 * there) or a portal iframe. The caller still env-gates
 * (`NEXT_PUBLIC_MONETAG_ENABLED` + a configured zone id) before invoking.
 *
 * Settle model: `showRewardedMonetag()` resolves when the user watched the ad
 * (reward owed) and rejects when dismissed / no fill / blocked. We collapse that
 * to a single `onReward` / `onError` outcome with a settle-once guard.
 */

export interface ShowRewardedMonetagHookOptions {
  /** Placement name for analytics — usually the surface (hint/freeze/retry/...). */
  name: string;
}

export interface UseMonetagAdsReturn {
  /** Load + configure the SDK. Idempotent. No-op on a disallowed surface. */
  initialize: () => Promise<void>;
  /** Show a rewarded ad. `onReward` fires only on a complete watch. */
  showRewarded: (
    onReward: () => void,
    onError?: (reason: string) => void,
    opts?: ShowRewardedMonetagHookOptions,
  ) => void;
  /** True in browser; false during SSR. Does NOT mean "ads will fill" — that's runtime. */
  isAvailable: boolean;
}

export function useMonetagAds(): UseMonetagAdsReturn {
  // Cache the init promise so repeated showRewarded calls share one script load.
  const initRef = useRef<Promise<void> | null>(null);
  const isAvailable = typeof window !== 'undefined';

  const initialize = useCallback(async () => {
    if (!isAvailable) return;
    if (!initRef.current) initRef.current = initMonetagAds();
    await initRef.current;
  }, [isAvailable]);

  const showRewarded = useCallback((
    onReward: () => void,
    onError?: (reason: string) => void,
    _opts?: ShowRewardedMonetagHookOptions,
  ) => {
    if (!isAvailable) {
      onError?.('monetag-unavailable');
      return;
    }
    let settled = false;
    const settle = (granted: boolean, reason?: string) => {
      if (settled) return;
      settled = true;
      if (granted) onReward();
      else onError?.(reason ?? 'monetag-no-reward');
    };

    if (!initRef.current) initRef.current = initMonetagAds();
    initRef.current
      .then(() => showRewardedMonetag())
      .then(() => settle(true))
      .catch((err) => settle(false, err instanceof Error ? err.message : 'monetag-error'));
  }, [isAvailable]);

  return { initialize, showRewarded, isAvailable };
}

export default useMonetagAds;
