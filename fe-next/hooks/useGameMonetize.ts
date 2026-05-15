'use client';

import { useCallback, useRef } from 'react';
import {
  initGameMonetizeAds,
  getGameMonetizeId,
} from '@/lib/ads/gameMonetizeSdk';

/**
 * Hook around GameMonetize SDK rewarded-video for web surface.
 *
 * Caller is responsible for surface-gating (`!isNative && !isCG && !isH5`)
 * before invoking — this hook makes no platform assumptions beyond
 * `typeof window` and `window.sdk` presence.
 *
 * Settle model:
 *   `sdk.showAd('rewarded')` returns a Promise. Resolve = ad-complete →
 *   reward. Reject = no-fill / dismiss / error → no reward. Single-fire:
 *   late events ignored after first settle.
 *
 * No SSV: GameMonetize relies on client-side completion signal. Server
 * still enforces daily cap in /api/coins for replay protection (same
 * model as H5 Games Ads).
 */

export interface ShowRewardedOptions {
  /** Placement name reported to analytics — usually the surface (hint/freeze/...) */
  name: string;
}

export interface UseGameMonetizeReturn {
  /** Load + configure SDK. Idempotent. No-op when game-id env unset. */
  initialize: () => Promise<void>;
  /** Show a rewarded ad. `onReward` fires only on full ad-complete. */
  showRewarded: (
    onReward: () => void,
    onError?: (reason: string) => void,
    opts?: ShowRewardedOptions,
  ) => void;
  /** True in browser; false during SSR. Does NOT mean "ads will fill". */
  isAvailable: boolean;
}

export function useGameMonetize(): UseGameMonetizeReturn {
  const initRef = useRef<Promise<void> | null>(null);
  const isAvailable = typeof window !== 'undefined';

  const initialize = useCallback(async () => {
    if (!isAvailable) return;
    const gameId = getGameMonetizeId();
    if (!gameId) return;
    if (!initRef.current) initRef.current = initGameMonetizeAds(gameId);
    await initRef.current;
  }, [isAvailable]);

  const showRewarded = useCallback((
    onReward: () => void,
    onError?: (reason: string) => void,
    _opts?: ShowRewardedOptions,
  ) => {
    if (!isAvailable) {
      onError?.('gamemonetize-unavailable');
      return;
    }
    const gameId = getGameMonetizeId();
    if (!gameId) {
      onError?.('gamemonetize-no-game-id');
      return;
    }

    let settled = false;
    const settle = (granted: boolean, reason?: string) => {
      if (settled) return;
      settled = true;
      if (granted) onReward();
      else onError?.(reason ?? 'gamemonetize-no-reward');
    };

    const fire = () => {
      const sdk = (window as Window).sdk;
      if (!sdk || typeof sdk.showAd !== 'function') {
        settle(false, 'gamemonetize-sdk-missing');
        return;
      }
      try {
        Promise.resolve(sdk.showAd('rewarded'))
          .then(() => settle(true))
          .catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : 'gamemonetize-show-rejected';
            settle(false, msg);
          });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'gamemonetize-showAd-throw';
        settle(false, msg);
      }
    };

    if (!initRef.current) initRef.current = initGameMonetizeAds(gameId);
    initRef.current.then(fire).catch(() => {
      // Init failed (script blocked, network) — try anyway: SDK may have
      // partially loaded. If sdk missing, fire's own guard settles to error.
      fire();
    });
  }, [isAvailable]);

  return { initialize, showRewarded, isAvailable };
}

export default useGameMonetize;
