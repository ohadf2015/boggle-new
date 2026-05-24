'use client';

import { Capacitor } from '@capacitor/core';
import { useCrazyGames } from '@/components/CrazyGamesSDK';

/**
 * Returns true iff a real rewarded-ad provider is wired and usable.
 *
 * Priority mirrors `useRewardedAd`:
 *   1. CrazyGames SDK (on CrazyGames platform)
 *   2. AdMob via Capacitor (native build)
 *
 * Development always returns true so local QA of rewarded-ad entry points works
 * without needing a real SDK. In production, returns false when only the
 * placeholder branch of `useRewardedAd` would fire — use this to hide the
 * containers/cards/buttons that open rewarded-ad modals.
 */
export function useHasRealAdProvider(): boolean {
  const crazyGames = useCrazyGames();

  if (process.env.NODE_ENV !== 'production') return true;

  const onCrazyGames = crazyGames.isAvailable && crazyGames.isOnCrazyGamesPlatform;
  const onNativeAdMob = Capacitor.isNativePlatform();

  return onCrazyGames || onNativeAdMob;
}

export default useHasRealAdProvider;
