'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Howler } from 'howler';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import logger from '@/utils/logger';

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
// CrazyGames ad error codes — handle each appropriately
type CgAdErrorCode = 'adsDisabledBasicLaunch' | 'unfilled' | 'adblock' | 'adCooldown' | 'other';

function extractAdErrorCode(errorData: unknown): CgAdErrorCode {
  if (errorData && typeof errorData === 'object') {
    const code = (errorData as Record<string, unknown>).code ?? (errorData as Record<string, unknown>).reason;
    if (typeof code === 'string' && ['adsDisabledBasicLaunch', 'unfilled', 'adblock', 'adCooldown'].includes(code)) {
      return code as CgAdErrorCode;
    }
  }
  return 'other';
}

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
  const [adsDisabled, setAdsDisabled] = useState(false);

  // Client-side debounce to prevent spamming SDK with rapid ad requests
  const AD_DEBOUNCE_MS = 500; // 500ms debounce between ad requests
  const lastAdRequestRef = useRef(0);

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
    if (!isAvailable || hasAdblock || adsDisabled) return false;

    // Client-side cooldown — prevent rapid re-requests after ad completes
    const now = Date.now();
    if (isAdPlaying || now - lastAdRequestRef.current < AD_DEBOUNCE_MS) return false;
    lastAdRequestRef.current = now;

    setIsAdPlaying(true);
    gameplayStop();

    return new Promise((resolve) => {
      let settled = false;
      const settle = (success: boolean) => {
        if (settled) return;
        settled = true;
        try { Howler.mute(false); } catch { /* Howler not initialized */ }
        gameplayStart();
        setIsAdPlaying(false);
        // Clear debounce so next ad can be requested immediately after completion
        lastAdRequestRef.current = 0;
        resolve(success);
      };

      showMidgameAd({
        adStarted: () => {
          try { Howler.mute(true); } catch { /* Howler not initialized */ }
        },
        adFinished: () => settle(true),
        adError: (_error, errorData) => {
          const code = extractAdErrorCode(errorData);
          if (code === 'adsDisabledBasicLaunch') {
            setAdsDisabled(true);
          } else if (code === 'adblock') {
            setHasAdblock(true);
          } else if (code !== 'adCooldown' && code !== 'unfilled') {
            logger.debug('Midgame ad error:', code, errorData);
          }
          settle(false);
        },
      });
    });
  }, [isAvailable, hasAdblock, adsDisabled, isAdPlaying, showMidgameAd, gameplayStop, gameplayStart]);

  /**
   * Request a rewarded ad for optional player boosts (extra lives, XP, etc.).
   * Returns true if ad was shown and completed, false otherwise.
   * Only grant reward if this returns true.
   */
  const requestRewardedAd = useCallback(async (): Promise<boolean> => {
    if (!isAvailable || hasAdblock || adsDisabled) return false;

    // Client-side cooldown — prevent rapid re-requests after ad completes
    const now = Date.now();
    if (isAdPlaying || now - lastAdRequestRef.current < AD_DEBOUNCE_MS) return false;
    lastAdRequestRef.current = now;

    setIsAdPlaying(true);
    gameplayStop();

    return new Promise((resolve) => {
      let settled = false;
      const settle = (success: boolean) => {
        if (settled) return;
        settled = true;
        try { Howler.mute(false); } catch { /* Howler not initialized */ }
        gameplayStart();
        setIsAdPlaying(false);
        // Clear debounce so next ad can be requested immediately after completion
        lastAdRequestRef.current = 0;
        resolve(success);
      };

      showRewardedAd({
        adStarted: () => {
          try { Howler.mute(true); } catch { /* Howler not initialized */ }
        },
        adFinished: () => settle(true),
        adError: (_error, errorData) => {
          const code = extractAdErrorCode(errorData);
          if (code === 'adsDisabledBasicLaunch') {
            setAdsDisabled(true);
          } else if (code === 'adblock') {
            setHasAdblock(true);
          } else if (code !== 'adCooldown' && code !== 'unfilled') {
            logger.debug('Rewarded ad error:', code, errorData);
          }
          settle(false);
        },
      });
    });
  }, [isAvailable, hasAdblock, adsDisabled, isAdPlaying, showRewardedAd, gameplayStop, gameplayStart]);

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
