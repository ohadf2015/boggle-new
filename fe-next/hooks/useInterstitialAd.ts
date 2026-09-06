'use client';

import { useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { isAdFreeRoute } from '@/lib/admob-routes';
import { useCrazyGamesAds } from '@/hooks/useCrazyGamesAds';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useAdMob } from '@/hooks/useAdMob';
import { useH5GamesAds } from '@/hooks/useH5GamesAds';

/**
 * Unified interstitial ad hook — fires on the surface-appropriate platform.
 *
 * Routing (exactly one fires per `name`, idempotent via firedRef):
 *   CrazyGames iframe → CG midgame ad
 *   Android/iOS Capacitor → AdMob interstitial
 *   Production web (not CG, not native) → H5 Games Ads adBreak({type:'next'})
 *
 * Calls are fire-and-forget; failures are swallowed by the underlying hooks.
 */
export function useInterstitialAd() {
  const { requestMidgameAd } = useCrazyGamesAds();
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const adMob = useAdMob();
  const h5Ads = useH5GamesAds();
  const firedRef = useRef<Set<string>>(new Set());
  // Education / teacher / student / classroom surfaces are ad-free in every
  // format. No trigger site lives there today; this keeps it that way if one
  // (a shared results screen, say) is ever mounted under those routes.
  const pathname = usePathname();

  // Returns a Promise that resolves once the ad cycle has fully completed
  // (dismissed / failed / never shown). Callers can `await` it to gate
  // subsequent actions — e.g. the MP host awaits this before emitting
  // `startGame` so all players stay on results until the ad-watching host
  // is done. Non-awaiting callers still get the prior fire-and-forget shape.
  const showInterstitial = useCallback(
    async (name: string): Promise<void> => {
      // location.search (not useSearchParams) — the classroom flag is fixed at
      // page entry and this avoids a CSR bailout on statically rendered pages.
      const search = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search);
      if (isAdFreeRoute(pathname, search)) return;
      if (firedRef.current.has(name)) return;
      firedRef.current.add(name);

      const isProd = process.env.NODE_ENV === 'production';
      const h5EnvEnabled = process.env.NEXT_PUBLIC_H5_ADS_ENABLED === 'true';
      const hasH5TestFlag = typeof window !== 'undefined' && (
        (window as unknown as { __h5AdsTest?: boolean }).__h5AdsTest === true ||
        (typeof location !== 'undefined' && /[?&]h5ads_test=1/.test(location.search))
      );

      if (isOnCrazyGamesPlatform) {
        requestMidgameAd();
        return;
      }
      if (Capacitor.isNativePlatform()) {
        await adMob.showInterstitial();
        return;
      }
      if (h5EnvEnabled && (isProd || hasH5TestFlag)) {
        h5Ads.showInterstitial(name);
      }
    },
    [pathname, requestMidgameAd, isOnCrazyGamesPlatform, adMob, h5Ads],
  );

  return { showInterstitial };
}

export default useInterstitialAd;
