'use client';

import { useState, useCallback, useEffect } from 'react';
import { Howler } from 'howler';
import { useCrazyGames } from '@/components/CrazyGamesSDK';

/**
 * Hook for managing CrazyGames ad integration (midgame and rewarded ads).
 *
 * Handles:
 * - Adblock detection on mount
 * - Audio muting during ad playback (via Howler)
 * - Gameplay pause/resume around ads
 * - Ad state tracking (isAdPlaying)
 *
 * @example
 * ```tsx
 * const { requestMidgameAd, requestRewardedAd, isAdPlaying, hasAdblock } = useCrazyGamesAds();
 *
 * // Show midgame ad at natural break (level end)
 * const handleLevelEnd = async () => {
 *   const adShown = await requestMidgameAd();
 *   if (adShown) {
 *     console.log('Ad completed, proceeding...');
 *   }
 * };
 *
 * // Show rewarded ad for optional boost
 * const handleWatchForReward = async () => {
 *   const adShown = await requestRewardedAd();
 *   if (adShown) {
 *     grantReward(); // Give extra lives, XP, etc.
 *   }
 * };
 * ```
 */
export function useCrazyGamesAds() {
  const {
    isAvailable,
    showMidgameAd,
    showRewardedAd,
    hasAdblock: checkAdblock,
    gameplayStop,
    gameplayStart,
  } = useCrazyGames();

  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const [hasAdblock, setHasAdblock] = useState(false);

  // Check for adblock on mount
  useEffect(() => {
    const checkForAdblock = async () => {
      if (!isAvailable) return;

      try {
        const blocked = await checkAdblock();
        setHasAdblock(blocked);
      } catch (error) {
        console.error('Failed to check adblock:', error);
        setHasAdblock(false);
      }
    };

    checkForAdblock();
  }, [isAvailable, checkAdblock]);

  /**
   * Request a midgame ad at a natural break point (level end, boss defeat, etc.).
   * Returns true if ad was shown and completed, false otherwise.
   */
  const requestMidgameAd = useCallback(async (): Promise<boolean> => {
    if (!isAvailable || hasAdblock) return false;

    setIsAdPlaying(true);
    gameplayStop();

    return new Promise((resolve) => {
      showMidgameAd({
        adStarted: () => {
          Howler.mute(true);
        },
        adFinished: () => {
          Howler.mute(false);
          gameplayStart();
          setIsAdPlaying(false);
          resolve(true);
        },
        adError: (_error, errorData) => {
          Howler.mute(false);
          gameplayStart();
          setIsAdPlaying(false);
          if (errorData && typeof errorData === 'object' && 'reason' in errorData) {
            console.log('Midgame ad error:', errorData.reason);
          }
          resolve(false);
        },
      });
    });
  }, [isAvailable, hasAdblock, showMidgameAd, gameplayStop, gameplayStart]);

  /**
   * Request a rewarded ad for optional player boosts (extra lives, XP, etc.).
   * Returns true if ad was shown and completed, false otherwise.
   * Only grant reward if this returns true.
   */
  const requestRewardedAd = useCallback(async (): Promise<boolean> => {
    if (!isAvailable || hasAdblock) return false;

    setIsAdPlaying(true);
    gameplayStop();

    return new Promise((resolve) => {
      showRewardedAd({
        adStarted: () => {
          Howler.mute(true);
        },
        adFinished: () => {
          Howler.mute(false);
          gameplayStart();
          setIsAdPlaying(false);
          resolve(true);
        },
        adError: (_error, errorData) => {
          Howler.mute(false);
          gameplayStart();
          setIsAdPlaying(false);
          if (errorData && typeof errorData === 'object' && 'reason' in errorData) {
            console.log('Rewarded ad error:', errorData.reason);
          }
          resolve(false);
        },
      });
    });
  }, [isAvailable, hasAdblock, showRewardedAd, gameplayStop, gameplayStart]);

  return {
    /** Request midgame ad at natural break point */
    requestMidgameAd,
    /** Request rewarded ad for optional boost */
    requestRewardedAd,
    /** Whether an ad is currently playing */
    isAdPlaying,
    /** Whether adblock is detected */
    hasAdblock,
  };
}

export default useCrazyGamesAds;
