'use client';

import { useCallback, useRef } from 'react';
import { adBreak, initH5GamesAds, type H5PlacementInfo } from '@/lib/ads/h5GamesAds';

/**
 * Hook around the Google H5 Games Ads `adBreak()` API for web surface.
 *
 * Caller is responsible for surface-gating (`!isNative && !isCG`) before
 * invoking `initialize` or any show method — this hook makes no platform
 * assumptions beyond `typeof window`.
 *
 * Race model (matches Google's contract):
 *   `adBreakDone(info)` is the single source of truth. `breakStatus === 'viewed'`
 *   means reward; everything else (dismissed, noAdPreloaded, frequencyCapped,
 *   ignored, timeout, other) means no reward. `adViewed`/`adDismissed` callbacks
 *   are informational and ignored by the settle logic.
 *
 * `beforeReward(showAdFn)` fires when the SDK is ready to render the ad.
 * `useRewardedAd` already gates on user intent (button press), so the hook
 * auto-accepts by calling `showAdFn` immediately. We never present the SDK's
 * built-in "Watch ad?" dialog — our own UI owns the offer.
 */

export interface ShowRewardedOptions {
  /** Placement name reported to AdSense — usually the surface (hint/freeze/retry/...) */
  name: string;
}

export interface UseH5GamesAdsReturn {
  /** Load + configure the SDK. Idempotent. */
  initialize: () => Promise<void>;
  /** Show a rewarded H5 ad break. `onReward` fires only on `breakStatus === 'viewed'`. */
  showRewarded: (
    onReward: () => void,
    onError?: (reason: string) => void,
    opts?: ShowRewardedOptions,
  ) => void;
  /** Fire-and-forget interstitial (`type:'next'`). Safe to call without awaiting. */
  showInterstitial: (name: string) => void;
  /** True in browser; false during SSR. Does NOT mean "ads will fill" — that's runtime. */
  isAvailable: boolean;
}

export function useH5GamesAds(): UseH5GamesAdsReturn {
  // Cache the init promise on the hook instance so repeated showRewarded
  // calls don't race the script load — they all await the same promise.
  const initRef = useRef<Promise<void> | null>(null);
  const isAvailable = typeof window !== 'undefined';

  const initialize = useCallback(async () => {
    if (!isAvailable) return;
    if (!initRef.current) initRef.current = initH5GamesAds();
    await initRef.current;
  }, [isAvailable]);

  const showRewarded = useCallback((
    onReward: () => void,
    onError?: (reason: string) => void,
    opts?: ShowRewardedOptions,
  ) => {
    if (!isAvailable) {
      onError?.('h5-unavailable');
      return;
    }
    const name = opts?.name ?? 'generic';
    let settled = false;
    const settle = (granted: boolean, reason?: string) => {
      if (settled) return;
      settled = true;
      if (granted) onReward();
      else onError?.(reason ?? 'h5-no-reward');
    };

    const fire = () => {
      try {
        adBreak({
          type: 'reward',
          name,
          beforeReward: (showAdFn) => {
            // Our own UI already prompted the user. Skip SDK's built-in dialog.
            try { showAdFn(); } catch (err) {
              const msg = err instanceof Error ? err.message : 'h5-beforeReward-throw';
              settle(false, msg);
            }
          },
          adBreakDone: (info: H5PlacementInfo) => {
            settle(info?.breakStatus === 'viewed', info?.breakStatus);
          },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'h5-adBreak-throw';
        settle(false, msg);
      }
    };

    // Lazy-init on first use — but don't block: if SDK isn't loaded yet,
    // adBreak just queues into adsbygoogle. When SDK arrives it drains the queue.
    if (!initRef.current) initRef.current = initH5GamesAds();
    initRef.current.then(fire).catch(() => {
      // Init failed (script blocked, network) — still try to push: queue is fine.
      fire();
    });
  }, [isAvailable]);

  const showInterstitial = useCallback((name: string) => {
    if (!isAvailable) return;
    const fire = () => {
      try {
        adBreak({ type: 'next', name });
      } catch { /* fire-and-forget; nothing to surface */ }
    };
    if (!initRef.current) initRef.current = initH5GamesAds();
    initRef.current.then(fire).catch(fire);
  }, [isAvailable]);

  return { initialize, showRewarded, showInterstitial, isAvailable };
}

export default useH5GamesAds;
