'use client';

import { useState, useCallback } from 'react';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useAdPlacement } from '@/hooks/useAdPlacement';
import { useCoinContext } from '@/contexts/CoinContext';

export type AdStatus = 'idle' | 'loading' | 'showing' | 'completed' | 'error';

interface UseRewardedAdOptions {
  /** Callback when ad is successfully completed and coins are awarded */
  onRewardEarned?: (coinsAwarded: number) => void | Promise<void>;
  /** Callback when ad fails or is cancelled */
  onAdError?: (error: string) => void;
  /** Callback when ad starts playing */
  onAdStarted?: () => void;
}

interface UseRewardedAdReturn {
  /** Current status of the ad */
  status: AdStatus;
  /** Whether a rewarded ad is available to show */
  isAdAvailable: boolean;
  /** Show a rewarded ad and earn coins on completion */
  showAd: () => void;
  /** Error message if ad failed */
  error: string | null;
  /** Amount of coins that will be rewarded */
  rewardAmount: number;
}

/**
 * Hook to show rewarded video ads and earn coins.
 *
 * Priority order:
 * 1. CrazyGames SDK - when running on CrazyGames platform
 * 1.5. AdSense for Games - when running on web with ad placement API
 * 2. Simulation fallback - for development/testing
 *
 * @example
 * ```tsx
 * const { showAd, isAdAvailable, status, rewardAmount } = useRewardedAd({
 *   onRewardEarned: (coins) => setCurrentCoins(getCoins()),
 * });
 *
 * <Button onClick={showAd} disabled={!isAdAvailable || status === 'loading'}>
 *   Watch Ad (+{rewardAmount} coins)
 * </Button>
 * ```
 */
export function useRewardedAd(options: UseRewardedAdOptions = {}): UseRewardedAdReturn {
  const { onRewardEarned, onAdError, onAdStarted } = options;
  const [status, setStatus] = useState<AdStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // Use unified CoinContext for all coin operations
  const { awardWatchedAd, rewards } = useCoinContext();

  // Ad platform hooks
  const crazyGames = useCrazyGames();
  const adPlacement = useAdPlacement();

  // Determine which ad platform to use (priority order)
  const shouldUseCrazyGames = crazyGames.isAvailable && crazyGames.isOnCrazyGamesPlatform;
  const shouldUseAdSense = !shouldUseCrazyGames && adPlacement.isReady;
  // Simulation only in development — never award free gold in production
  const isDev = process.env.NODE_ENV === 'development';
  const shouldUseSimulation = isDev && !shouldUseCrazyGames && !shouldUseAdSense;

  // Ad is available only when a real platform is ready (or dev simulation)
  const isAdAvailable = shouldUseCrazyGames || shouldUseAdSense || shouldUseSimulation;

  const rewardAmount = rewards.WATCH_AD;

  const showAd = useCallback(() => {
    if (status === 'loading' || status === 'showing') {
      return; // Don't allow multiple simultaneous ads
    }

    setStatus('loading');
    setError(null);

    // Determine platform for logging
    const platform = shouldUseCrazyGames ? 'crazygames' : shouldUseAdSense ? 'adsense' : 'simulation';

    // Award coins helper - uses unified CoinContext for auth/guest sync
    const awardCoinsAndNotify = async () => {
      const result = await awardWatchedAd(platform);
      setStatus('completed');
      await onRewardEarned?.(result?.awarded ?? rewardAmount);

      // Reset to idle after a short delay
      setTimeout(() => setStatus('idle'), 1500);
    };

    // Handle ad error
    const handleAdError = (errorMsg: string) => {
      setStatus('error');
      setError(errorMsg);
      onAdError?.(errorMsg);

      // Reset to idle after showing error
      setTimeout(() => {
        setStatus('idle');
        setError(null);
      }, 3000);
    };

    if (shouldUseCrazyGames) {
      // Priority 1: CrazyGames SDK for rewarded ads
      crazyGames.showRewardedAd({
        adStarted: () => {
          setStatus('showing');
          onAdStarted?.();
        },
        adFinished: () => {
          awardCoinsAndNotify();
        },
        adError: (errorMsg: string) => {
          handleAdError(errorMsg || 'Ad failed to load');
        },
      });
    } else if (shouldUseAdSense) {
      // Priority 1.5: AdSense for Games rewarded ads
      setStatus('showing');
      onAdStarted?.();
      adPlacement.showRewarded('rewarded-gold', {
        onReward: () => {
          awardCoinsAndNotify();
        },
        onDismiss: () => {
          handleAdError('Ad dismissed');
        },
      });
    } else {
      // Priority 2: Simulation fallback for development/testing
      console.log('[RewardedAd] Using simulation mode - no real ads configured');
      setStatus('showing');
      onAdStarted?.();

      // Simulate ad duration (3 seconds)
      setTimeout(() => {
        awardCoinsAndNotify();
      }, 3000);
    }
  }, [status, shouldUseCrazyGames, shouldUseAdSense, crazyGames, adPlacement, rewardAmount, onRewardEarned, onAdError, onAdStarted, awardWatchedAd]);

  return {
    status,
    isAdAvailable,
    showAd,
    error,
    rewardAmount,
  };
}

export default useRewardedAd;
