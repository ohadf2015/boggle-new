'use client';

import { useCallback, useRef } from 'react';
import { useCrazyGamesAds } from '@/hooks/useCrazyGamesAds';
import { useAdPlacement } from '@/hooks/useAdPlacement';
import { useAdMob } from '@/hooks/useAdMob';

/**
 * Unified interstitial ad hook — fires on all available platforms.
 *
 * Priority: CrazyGames midgame > AdMob interstitial (native) > AdSense H5 (web)
 * Each platform is independent — if one fails, the others still fire.
 */
export function useInterstitialAd() {
  const { requestMidgameAd } = useCrazyGamesAds();
  const { showInterstitial: showAdSenseInterstitial } = useAdPlacement();
  const adMob = useAdMob();
  const firedRef = useRef<Set<string>>(new Set());

  const showInterstitial = useCallback(
    (name: string) => {
      // Deduplicate — don't fire the same placement twice in the same component lifecycle
      if (firedRef.current.has(name)) return;
      firedRef.current.add(name);

      // CrazyGames midgame ad
      requestMidgameAd();

      // AdMob interstitial (native only — hook returns no-ops on web)
      adMob.showInterstitial();

      // AdSense H5 interstitial (web only — no-ops on native)
      showAdSenseInterstitial(name);
    },
    [requestMidgameAd, adMob, showAdSenseInterstitial],
  );

  return { showInterstitial };
}

export default useInterstitialAd;
