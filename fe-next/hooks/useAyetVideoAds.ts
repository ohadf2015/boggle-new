'use client';

import { useCallback, useRef } from 'react';
import { initAyetVideo, showRewardedAyet } from '@/lib/ads/ayetVideoAds';

/**
 * Hook around the ayeT-Studios HTML5 Rewarded Video SDK for the web surface.
 *
 * Caller is responsible for surface-gating (`!isNative && !isCG`) and env-gating
 * (`NEXT_PUBLIC_AYET_ADS_ENABLED` + a configured placement id) before invoking.
 *
 * Settle model mirrors `useGameDistributionAds` / `useH5GamesAds`:
 * `showRewardedAyet()` resolves `true` on a complete watch, `false` on early
 * close, rejects on no-fill — collapsed to a single onReward/onError with a
 * settle-once guard.
 */

const AYET_UID_KEY = 'lexiclash_ayet_uid';

/**
 * Stable per-user identifier for ayeT (3–128 chars; used for S2S dedup/reporting
 * and frequency capping). Persisted in localStorage so the same browser keeps
 * one id across sessions. Falls back to 'anon' during SSR.
 */
function resolveExternalId(): string {
  if (typeof window === 'undefined') return 'anon';
  try {
    let id = localStorage.getItem(AYET_UID_KEY);
    if (!id) {
      id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
        ? crypto.randomUUID()
        : `u_${Math.abs(Date.parse(new Date().toISOString()))}_${Math.floor(performance.now())}`;
      localStorage.setItem(AYET_UID_KEY, id);
    }
    return id;
  } catch {
    return 'anon';
  }
}

export interface ShowRewardedAyetHookOptions {
  /** Placement name for analytics — usually the surface (hint/freeze/retry/...). */
  name: string;
}

export interface UseAyetVideoAdsReturn {
  initialize: () => Promise<void>;
  showRewarded: (
    onReward: () => void,
    onError?: (reason: string) => void,
    opts?: ShowRewardedAyetHookOptions,
  ) => void;
  isAvailable: boolean;
}

export function useAyetVideoAds(): UseAyetVideoAdsReturn {
  const initRef = useRef<Promise<void> | null>(null);
  const isAvailable = typeof window !== 'undefined';

  const initialize = useCallback(async () => {
    if (!isAvailable) return;
    if (!initRef.current) initRef.current = initAyetVideo(resolveExternalId());
    await initRef.current;
  }, [isAvailable]);

  const showRewarded = useCallback((
    onReward: () => void,
    onError?: (reason: string) => void,
    _opts?: ShowRewardedAyetHookOptions,
  ) => {
    if (!isAvailable) {
      onError?.('ayet-unavailable');
      return;
    }
    let settled = false;
    const settle = (granted: boolean, reason?: string) => {
      if (settled) return;
      settled = true;
      if (granted) onReward();
      else onError?.(reason ?? 'ayet-no-reward');
    };

    if (!initRef.current) initRef.current = initAyetVideo(resolveExternalId());
    initRef.current
      .then(() => showRewardedAyet())
      .then((watched) => settle(watched, watched ? undefined : 'ayet-dismissed'))
      .catch((err) => settle(false, err instanceof Error ? err.message : 'ayet-error'));
  }, [isAvailable]);

  return { initialize, showRewarded, isAvailable };
}

export default useAyetVideoAds;
