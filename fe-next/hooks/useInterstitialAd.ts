'use client';

import { useCallback, useRef } from 'react';
import { useCrazyGamesAds } from '@/hooks/useCrazyGamesAds';
import { useAdMob } from '@/hooks/useAdMob';

/**
 * Unified interstitial ad hook — fires on all available platforms.
 *
 * Priority: CrazyGames midgame > AdMob interstitial (native)
 * Each platform is independent — if one fails, the others still fire.
 */
export function useInterstitialAd() {
  const { requestMidgameAd } = useCrazyGamesAds();
  const adMob = useAdMob();
  const firedRef = useRef<Set<string>>(new Set());

  const showInterstitial = useCallback(
    (name: string) => {
      if (firedRef.current.has(name)) return;
      firedRef.current.add(name);

      requestMidgameAd();
      adMob.showInterstitial();
    },
    [requestMidgameAd, adMob],
  );

  return { showInterstitial };
}

export default useInterstitialAd;
