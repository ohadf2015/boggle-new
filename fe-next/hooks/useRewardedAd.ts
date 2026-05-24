'use client';

import { useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Howler } from 'howler';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useAdMob } from '@/hooks/useAdMob';
import { useH5GamesAds } from '@/hooks/useH5GamesAds';
import { useCoinContext } from '@/contexts/CoinContext';
import { trackRewardedAdWatched, trackRewardedAdDeclined } from '@/utils/growthTracking';
import type { RewardedSurface } from '@/lib/admob-config';

export type AdStatus = 'idle' | 'loading' | 'showing' | 'completed' | 'error';

const PLACEHOLDER_TIMESTAMPS_KEY = 'lexiclash_placeholder_ad_timestamps';
const MAX_PLACEHOLDER_PER_HOUR = 3;
const ONE_HOUR = 60 * 60 * 1000;

// Daily ad view tracking
const DAILY_AD_VIEWS_KEY = 'lexiclash_daily_ad_views';
const MAX_DAILY_AD_VIEWS = 10;

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function getDailyViewCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const stored = localStorage.getItem(DAILY_AD_VIEWS_KEY);
    if (!stored) return 0;
    const data = JSON.parse(stored);
    if (data.date !== getTodayKey()) return 0;
    return data.count ?? 0;
  } catch {
    return 0;
  }
}

function recordDailyView(): void {
  if (typeof window === 'undefined') return;
  try {
    const today = getTodayKey();
    const stored = localStorage.getItem(DAILY_AD_VIEWS_KEY);
    let count = 0;
    if (stored) {
      const data = JSON.parse(stored);
      if (data.date === today) count = data.count ?? 0;
    }
    localStorage.setItem(DAILY_AD_VIEWS_KEY, JSON.stringify({ date: today, count: count + 1 }));
  } catch { /* silent */ }
}

function isDailyLimitReached(): boolean {
  return getDailyViewCount() >= MAX_DAILY_AD_VIEWS;
}

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
  /**
   * What the ad is rewarding.
   * - 'coins' (default): hook auto-grants WATCH_AD coins via awardWatchedAd.
   * - 'feature': hook does NOT grant coins — the caller's onRewardEarned is
   *   the sole reward (e.g. retry, extra life, streak freeze, avatar part).
   *   Prevents the double-reward bug where feature unlocks also paid coins.
   */
  rewardKind?: 'coins' | 'feature';
  /**
   * Which gameplay surface this ad serves. Routes to a per-surface AdMob unit
   * so the waterfall can be optimized per placement. Defaults to 'generic'.
   */
  surface?: RewardedSurface;
  /**
   * Free-form analytics tag for the offered→watched funnel. Mirrors the value
   * passed to `trackRewardedAdOffered` so PostHog can join offer and outcome
   * by surface. Defaults to the routing `surface` when omitted.
   */
  analyticsSurface?: string;
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
  /** Pre-load the next ad so showAd resolves instantly. No-op on web/CG. */
  prepareAd: () => void;
  /** Error message if ad failed */
  error: string | null;
  /** Amount of coins that will be rewarded */
  rewardAmount: number;
  /** Whether the user can show another ad today */
  canShowAd: boolean;
  /** Number of ad views today */
  viewsToday: number;
  /** Maximum daily ad views allowed */
  maxViews: number;
  /** Whether the daily limit has been reached */
  isDailyLimitReached: boolean;
  /** Whether the hook is in placeholder mode (no real ad provider wired) */
  isPlaceholder: boolean;
}

/**
 * Hook to show rewarded video ads and earn coins.
 *
 * Provider reality (PostHog 90d, audited 2026-05-21): AdMob (native) is the
 * ONLY provider that delivers — 27 successful watches, 0 from any web path.
 * Web rewarded ads have a 0% fill rate (H5 Games Ads needs AdSense approval
 * we don't have; CrazyGames only works inside its own iframe). So on
 * production web the hook intentionally lands on `placeholder`, which makes
 * `canShowAd` false and hides the watch-ad CTAs — better than promising a
 * reward we can't grant.
 *
 * Priority order:
 * 1. CrazyGames SDK - only inside a CrazyGames-distributed build (opt-in env)
 * 1.5. AdMob - native Capacitor apps (the only path with real fill)
 * 1.75. H5 Games Ads - production web, gated off pending AdSense approval
 * 2. Simulation fallback - for development/testing
 * 3. Placeholder - no ads available; refuses rewards + hides CTA in prod
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
  const { onRewardEarned, onAdError, onAdStarted, rewardKind = 'coins', surface = 'generic', analyticsSurface } = options;
  const telemetrySurface = analyticsSurface ?? surface;
  const [status, setStatus] = useState<AdStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [placeholderCooldownFlag, setPlaceholderCooldownFlag] = useState(() => isPlaceholderCapped());
  const [dailyViewCount, setDailyViewCount] = useState(() => getDailyViewCount());

  // Use unified CoinContext for all coin operations
  const { awardWatchedAd, rewards } = useCoinContext();

  // Ad platform hooks
  const crazyGames = useCrazyGames();
  const adMob = useAdMob();
  const h5Ads = useH5GamesAds();

  // Determine which ad platform to use (priority order)
  const shouldUseCrazyGames = crazyGames.isAvailable && crazyGames.isOnCrazyGamesPlatform;
  const shouldUseAdMob = !shouldUseCrazyGames && Capacitor.isNativePlatform();
  // Production web (not CG, not native) → Google H5 Games Ads via `adBreak()`.
  // Triple-gated: explicit `NEXT_PUBLIC_H5_ADS_ENABLED=true` env (off until
  // AdSense domain approval lands, since H5 Games Ads serves no fill without
  // it), production runtime OR `?h5ads_test=1`, and browser env. Keeping all
  // three lets us ship the code dormant and flip the env when approval lands.
  const isProd = process.env.NODE_ENV === 'production';
  const isDev = process.env.NODE_ENV === 'development';
  const h5EnvEnabled = process.env.NEXT_PUBLIC_H5_ADS_ENABLED === 'true';
  const hasH5TestFlag = typeof window !== 'undefined' && (
    (window as unknown as { __h5AdsTest?: boolean }).__h5AdsTest === true ||
    (typeof location !== 'undefined' && /[?&]h5ads_test=1/.test(location.search))
  );
  const shouldUseH5 = !shouldUseCrazyGames && !shouldUseAdMob && h5Ads.isAvailable && h5EnvEnabled && (isProd || hasH5TestFlag);
  // Simulation only in development — never award free gold in production
  const shouldUseSimulation = isDev && !shouldUseCrazyGames && !shouldUseAdMob && !shouldUseH5;
  // Placeholder: no ad platform available — still grant coins, log for admin
  const isPlaceholder = !shouldUseCrazyGames && !shouldUseAdMob && !shouldUseH5
    && !shouldUseSimulation;

  // Always available — placeholder grants coins when no real ads exist
  const isAdAvailable = true;
  const isPlaceholderCooldown = isPlaceholder && placeholderCooldownFlag;

  const rewardAmount = rewards.WATCH_AD;

  const showAd = useCallback(() => {
    if (status === 'loading' || status === 'showing') {
      return; // Don't allow multiple simultaneous ads
    }

    // Determine platform early for declined-event tagging
    const platformForDecline = shouldUseCrazyGames ? 'crazygames'
      : shouldUseAdMob ? 'admob'
      : shouldUseH5 ? 'h5-games'
      : shouldUseSimulation ? 'simulation'
      : 'no-ad-placeholder';

    // Enforce daily limit across all platforms
    if (isDailyLimitReached()) {
      trackRewardedAdDeclined('daily_limit_reached', platformForDecline, telemetrySurface);
      onAdError?.('Daily ad limit reached');
      return;
    }

    // No-ads web build (no CrazyGames, no AdMob, not dev): refuse to grant
    // ANY reward — feature unlocks (hint/freeze/retry/extra-life) and coin
    // grants alike. Until real ads ship on a platform, boosts must stay
    // locked. canShowAd already returns false here so well-behaved callsites
    // hide the button; this block stops rogue callers from bypassing it.
    if (isPlaceholder && !isDev) {
      trackRewardedAdDeclined('no_ad_provider', platformForDecline, telemetrySurface);
      onAdError?.('No ad provider available');
      return;
    }

    // Enforce placeholder cooldown (development only — production blocked above)
    if (isPlaceholder && isPlaceholderCapped()) {
      setPlaceholderCooldownFlag(true);
      trackRewardedAdDeclined('placeholder_cooldown', platformForDecline, telemetrySurface);
      onAdError?.('Cooldown active — try again later');
      return;
    }

    setStatus('loading');
    setError(null);

    // Determine platform for logging
    const platform = shouldUseCrazyGames ? 'crazygames'
      : shouldUseAdMob ? 'admob'
      : shouldUseH5 ? 'h5-games'
      : shouldUseSimulation ? 'simulation'
      : 'no-ad-placeholder';

    // Award coins helper - uses unified CoinContext for auth/guest sync.
    // For rewardKind='feature' we skip awardWatchedAd so feature unlocks
    // (retry, extra life, streak freeze, etc.) don't silently also pay coins.
    const awardCoinsAndNotify = async () => {
      if (isPlaceholder) {
        recordPlaceholderView();
        setPlaceholderCooldownFlag(isPlaceholderCapped());
      }
      recordDailyView();
      setDailyViewCount(getDailyViewCount());
      let awarded = 0;
      if (rewardKind === 'coins') {
        const result = await awardWatchedAd(platform);
        if (!result) {
          // DB write failed — don't report false success to analytics or caller
          handleAdError('Failed to grant coins — please try again');
          return;
        }
        awarded = result.awarded;
      }
      trackRewardedAdWatched(platform, awarded, telemetrySurface);
      setStatus('completed');
      await onRewardEarned?.(awarded);

      // Reset to idle after a short delay
      setTimeout(() => setStatus('idle'), 1500);
    };

    // Handle ad error
    const handleAdError = (errorMsg: string) => {
      setStatus('error');
      setError(errorMsg);
      trackRewardedAdDeclined(errorMsg, platform, telemetrySurface);
      onAdError?.(errorMsg);

      // Reset to idle after showing error
      setTimeout(() => {
        setStatus('idle');
        setError(null);
      }, 3000);
    };

    if (shouldUseCrazyGames) {
      // Priority 1: CrazyGames SDK for rewarded ads
      // Full-launch QA requires gameplayStop + audio mute around ads.
      crazyGames.gameplayStop();
      let settled = false;
      const settleCg = (cb: () => void) => {
        if (settled) return;
        settled = true;
        try { Howler.mute(false); } catch { /* Howler not initialized */ }
        crazyGames.gameplayStart();
        cb();
      };
      crazyGames.showRewardedAd({
        adStarted: () => {
          try { Howler.mute(true); } catch { /* Howler not initialized */ }
          setStatus('showing');
          onAdStarted?.();
        },
        adFinished: () => settleCg(() => { awardCoinsAndNotify(); }),
        adError: (errorMsg: string) => settleCg(() => { handleAdError(errorMsg || 'Ad failed to load'); }),
      });
    } else if (shouldUseAdMob) {
      // Priority 1.5: AdMob SDK for native Capacitor apps
      setStatus('showing');
      onAdStarted?.();
      adMob.showRewarded(
        () => { awardCoinsAndNotify(); },
        (errMsg) => { handleAdError(errMsg || 'Ad dismissed without reward'); },
        { surface },
      );
    } else if (shouldUseH5) {
      // Priority 1.75: H5 Games Ads for production web (no SSV — relies on
      // server-side daily cap in /api/coins for replay protection).
      setStatus('showing');
      onAdStarted?.();
      h5Ads.showRewarded(
        () => { awardCoinsAndNotify(); },
        (reason) => { handleAdError(reason || 'Ad dismissed without reward'); },
        { name: surface },
      );
    } else if (shouldUseSimulation) {
      // Priority 2: Simulation fallback for development/testing
      setStatus('showing');
      onAdStarted?.();

      // Simulate ad duration (3 seconds)
      setTimeout(() => {
        awardCoinsAndNotify();
      }, 3000);
    } else {
      // Priority 3: No ad platform — grant coins immediately
      setStatus('showing');
      onAdStarted?.();
      awardCoinsAndNotify();
    }
  }, [status, isDev, isPlaceholder, shouldUseCrazyGames, shouldUseAdMob, shouldUseH5, shouldUseSimulation, crazyGames, adMob, h5Ads, onRewardEarned, onAdError, onAdStarted, awardWatchedAd, rewardKind, surface, telemetrySurface]);

  // Pre-load AdMob rewarded slot when caller signals likely intent (button
  // mount). CrazyGames SDK auto-prepares; simulation/placeholder paths
  // resolve instantly. Reduces tap-to-ad latency on the hot native path —
  // PostHog 30d showed only 3 users ever completed a watch (96 offers /
  // 13 users / 20 watches), and tap-latency anecdotally drives drop-off.
  const prepareAd = useCallback(() => {
    if (!shouldUseAdMob) return;
    void adMob.prepareRewarded({ surface });
  }, [shouldUseAdMob, adMob, surface]);

  return {
    status,
    isAdAvailable,
    isPlaceholderCooldown,
    showAd,
    prepareAd,
    error,
    rewardAmount,
    canShowAd: !isDailyLimitReached() && !(isPlaceholder && !isDev),
    viewsToday: dailyViewCount,
    maxViews: MAX_DAILY_AD_VIEWS,
    isDailyLimitReached: isDailyLimitReached(),
    isPlaceholder,
  };
}

export default useRewardedAd;
