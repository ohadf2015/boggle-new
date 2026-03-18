'use client';

import { useState, useCallback, useMemo } from 'react';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useAdPlacement } from '@/hooks/useAdPlacement';
import { useCoinContext } from '@/contexts/CoinContext';

export type AdStatus = 'idle' | 'loading' | 'showing' | 'completed' | 'error';

const PLACEHOLDER_TIMESTAMPS_KEY = 'lexiclash_placeholder_ad_timestamps';
const MAX_PLACEHOLDER_PER_HOUR = 3;
const ONE_HOUR = 60 * 60 * 1000;

function isPlaceholderCapped(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem(PLACEHOLDER_TIMESTAMPS_KEY);
    if (!stored) return false;
    const timestamps: number[] = JSON.parse(stored);
    const cutoff = Date.now() - ONE_HOUR;
    return timestamps.filter(t => t > cutoff).length >= MAX_PLACEHOLDER_PER_HOUR;
  } catch {
    return false;
  }
}

function recordPlaceholderView(): void {
  if (typeof window === 'undefined') return;
  try {
    const stored = localStorage.getItem(PLACEHOLDER_TIMESTAMPS_KEY);
    const timestamps: number[] = stored ? JSON.parse(stored) : [];
    const cutoff = Date.now() - ONE_HOUR;
    const updated = [...timestamps.filter(t => t > cutoff), Date.now()];
    localStorage.setItem(PLACEHOLDER_TIMESTAMPS_KEY, JSON.stringify(updated));
  } catch { /* silent */ }
}

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
  /** Whether placeholder cooldown is active (3/hour limit) */
  isPlaceholderCooldown: boolean;
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
 * 3. Placeholder - no ads available, grant coins with cooldown
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
  const [placeholderCooldownFlag, setPlaceholderCooldownFlag] = useState(() => isPlaceholderCapped());

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
  // Placeholder: no ad platform available — still grant coins, log for admin
  const isPlaceholder = !shouldUseCrazyGames && !shouldUseAdSense && !shouldUseSimulation;

  // Always available — placeholder grants coins when no real ads exist
  const isAdAvailable = true;
  const isPlaceholderCooldown = isPlaceholder && placeholderCooldownFlag;

  const rewardAmount = rewards.WATCH_AD;

  const showAd = useCallback(() => {
    if (status === 'loading' || status === 'showing') {
      return; // Don't allow multiple simultaneous ads
    }

    // Enforce placeholder cooldown
    if (isPlaceholder && isPlaceholderCapped()) {
      setPlaceholderCooldownFlag(true);
      onAdError?.('Cooldown active — try again later');
      return;
    }

    setStatus('loading');
    setError(null);

    // Determine platform for logging
    const platform = shouldUseCrazyGames ? 'crazygames' : shouldUseAdSense ? 'adsense' : shouldUseSimulation ? 'simulation' : 'no-ad-placeholder';

    // Award coins helper - uses unified CoinContext for auth/guest sync
    const awardCoinsAndNotify = async () => {
      if (isPlaceholder) {
        recordPlaceholderView();
        setPlaceholderCooldownFlag(isPlaceholderCapped());
      }
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
    } else if (shouldUseSimulation) {
      // Priority 2: Simulation fallback for development/testing
      console.log('[RewardedAd] Using simulation mode - no real ads configured');
      setStatus('showing');
      onAdStarted?.();

      // Simulate ad duration (3 seconds)
      setTimeout(() => {
        awardCoinsAndNotify();
      }, 3000);
    } else {
      // Priority 3: No ad platform — grant coins immediately, log for admin
      console.log('[RewardedAd] No ad platform available — granting placeholder reward');
      setStatus('showing');
      onAdStarted?.();
      awardCoinsAndNotify();
    }
  }, [status, isPlaceholder, shouldUseCrazyGames, shouldUseAdSense, shouldUseSimulation, crazyGames, adPlacement, rewardAmount, onRewardEarned, onAdError, onAdStarted, awardWatchedAd]);

  return {
    status,
    isAdAvailable,
    isPlaceholderCooldown,
    showAd,
    error,
    rewardAmount,
  };
}

export default useRewardedAd;
