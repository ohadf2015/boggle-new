'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Howler } from 'howler';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useAdMob } from '@/hooks/useAdMob';
import { useH5GamesAds } from '@/hooks/useH5GamesAds';
import { isH5EnvEnabled } from '@/lib/ads/h5GamesAds';
import { useGameDistributionAds } from '@/hooks/useGameDistributionAds';
import { getGdGameId } from '@/lib/ads/gameDistributionAds';
import { useAyetVideoAds } from '@/hooks/useAyetVideoAds';
import { getAyetPlacementId } from '@/lib/ads/ayetVideoAds';
import { useCoinContext } from '@/contexts/CoinContext';
import { emitRewardAdActive } from '@/hooks/useRewardAdPause';
import { useLanguage } from '@/contexts/LanguageContext';
import { celebrateAdReward } from '@/lib/ads/rewardCelebration';
import { trackRewardedAdOffered, trackRewardedAdWatched, trackRewardedAdDeclined } from '@/utils/growthTracking';
import type { RewardedSurface } from '@/lib/admob-config';

export type AdStatus = 'idle' | 'loading' | 'showing' | 'completed' | 'error';

const identityT = (key: string): string => key;

function useRewardCopyTranslator(): (key: string) => string {
  try {
    return useLanguage().t ?? identityT;
  } catch {
    return identityT;
  }
}

const PLACEHOLDER_TIMESTAMPS_KEY = 'lexiclash_placeholder_ad_timestamps';
const MAX_PLACEHOLDER_PER_HOUR = 3;
const ONE_HOUR = 60 * 60 * 1000;

// Hook-level stuck-state backstop. Each ad provider is trusted to fire a
// terminal callback (reward / error / dismiss). If a provider's SDK hangs and
// fires NOTHING, `status` would stick at 'showing' forever and the in-flight
// guard would permanently disable the watch-ad button — the "reward ads timer
// stuck" bug. This is a LONG backstop, deliberately set ABOVE AdMob's own
// worst-case legit path (≈12s prepare + 90s show-safety ≈ 102s) so it only
// catches genuine infinite-hangs and NEVER preempts a late-but-real reward.
// Covers every path uniformly — including CrazyGames / H5, which have no
// timeout of their own, and a hung AdMob `whenReady()` the native layer misses.
const REWARD_STUCK_WATCHDOG_MS = 120000;

// Daily ad view tracking
type RewardKind = 'coins' | 'feature';

const DAILY_AD_VIEWS_KEY = 'lexiclash_daily_ad_views';
const MAX_DAILY_AD_VIEWS = 10;
// Abuse ceiling for feature unlocks, which mint no coins and so are NOT part of the
// coin budget above. Deliberately far above real play (retry/extra-life/hint across a
// long session) — it exists only so removing the coin cap can't leave feature ads
// globally unbounded, since some surfaces (blast_wave_continue, daily_retry) are
// per-wave / per-attempt rather than per-day.
const MAX_DAILY_FEATURE_AD_VIEWS = 40;

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function readDailyCounts(): { count: number; featureCount: number } {
  if (typeof window === 'undefined') return { count: 0, featureCount: 0 };
  try {
    const stored = localStorage.getItem(DAILY_AD_VIEWS_KEY);
    if (!stored) return { count: 0, featureCount: 0 };
    const data = JSON.parse(stored);
    if (data.date !== getTodayKey()) return { count: 0, featureCount: 0 };
    return { count: data.count ?? 0, featureCount: data.featureCount ?? 0 };
  } catch {
    return { count: 0, featureCount: 0 };
  }
}

/** Coin-granting views today — the number the "N/10 ads today" UI shows. */
function getDailyViewCount(): number {
  return readDailyCounts().count;
}

function recordDailyView(rewardKind: RewardKind): void {
  if (typeof window === 'undefined') return;
  try {
    const { count, featureCount } = readDailyCounts();
    localStorage.setItem(DAILY_AD_VIEWS_KEY, JSON.stringify({
      date: getTodayKey(),
      count: rewardKind === 'coins' ? count + 1 : count,
      featureCount: rewardKind === 'feature' ? featureCount + 1 : featureCount,
    }));
  } catch { /* silent */ }
}

/**
 * The daily cap is a COIN budget, not an ad budget.
 *
 * It exists to stop a player minting unlimited gold from `rewardKind: 'coins'` ads.
 * `rewardKind: 'feature'` ads (retry, extra life, hint reveal, streak freeze — the
 * large majority of our rewarded surfaces) mint no coins at all: the ad IS the price.
 * Counting them against the coin budget throttled the highest-eCPM format we serve
 * (~20x a banner impression) for an economy risk that path doesn't carry, and
 * dead-ended the player mid-run once the counter filled.
 *
 * So the two kinds now hold SEPARATE budgets in the same record: `count` (coins, 10)
 * and `featureCount` (features, 40 — an abuse ceiling, not a play limit; a normal
 * session never approaches it). Records written before this split carry no
 * `featureCount` and read as 0, which is the correct starting state.
 */
function isDailyLimitReached(rewardKind: RewardKind = 'coins'): boolean {
  const { count, featureCount } = readDailyCounts();
  return rewardKind === 'feature'
    ? featureCount >= MAX_DAILY_FEATURE_AD_VIEWS
    : count >= MAX_DAILY_AD_VIEWS;
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
  rewardKind?: RewardKind;
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
  /**
   * Pre-load the surface's AdMob unit once, as soon as the hook can serve
   * (native provider + daily cap not hit). Pass true at HIGH-INTENT moments
   * (retry/continue modals, results doubling) so tap→ad is instant — cold
   * loads on tap lost 36% of retry watches to the 12s prepare timeout
   * (AdMob 30d audit 2026-07-03). Leave unset on passive placements (lobby
   * gold button burned 198 loads for 2 shows there).
   */
  warm?: boolean;
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
  const { onRewardEarned, onAdError, onAdStarted, rewardKind = 'coins', surface = 'generic', analyticsSurface, warm = false } = options;
  const telemetrySurface = analyticsSurface ?? surface;
  const [status, setStatus] = useState<AdStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [placeholderCooldownFlag, setPlaceholderCooldownFlag] = useState(() => isPlaceholderCapped());
  const [dailyViewCount, setDailyViewCount] = useState(() => getDailyViewCount());

  // Timers held in refs so a single showAd session can clear its own watchdog
  // and so unmount can sweep any pending timer (hygiene — no setState on a
  // dead component). watchdogRef = the stuck-state backstop; idleResetRef =
  // the short completed/error → idle reset.
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // True only while THIS instance's ad is live. The game-clock pause is a
  // global, non-refcounted boolean, so an unconditional unmount emit(false)
  // from one rewarded consumer would clear a DIFFERENT consumer's active pause
  // (resuming the timer behind its ad). Gate the unmount backstop on our own
  // ad so we only release a pause we ourselves set.
  const adActiveRef = useRef(false);
  useEffect(() => () => {
    if (watchdogRef.current) clearTimeout(watchdogRef.current);
    if (idleResetRef.current) clearTimeout(idleResetRef.current);
    // Unmounted mid-ad (e.g. navigation) with no terminal callback fired —
    // release our own pause so a listening game clock isn't frozen forever.
    if (adActiveRef.current) emitRewardAdActive(false);
  }, []);

  // Use unified CoinContext for all coin operations
  const { awardWatchedAd, rewards } = useCoinContext();
  // Translator for the reward celebration. Called unconditionally (hook order
  // is stable); the try/catch only absorbs the provider-missing throw so a
  // surface that mounts before LanguageProvider (or a test without one)
  // degrades to raw keys instead of crashing the ad flow.
  const t = useRewardCopyTranslator();

  // Ad platform hooks
  const crazyGames = useCrazyGames();
  const adMob = useAdMob();
  const h5Ads = useH5GamesAds();
  const gdAds = useGameDistributionAds();
  const ayetAds = useAyetVideoAds();

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
  const h5EnvEnabled = isH5EnvEnabled();
  const hasH5TestFlag = typeof window !== 'undefined' && (
    (window as unknown as { __h5AdsTest?: boolean }).__h5AdsTest === true ||
    (typeof location !== 'undefined' && /[?&]h5ads_test=1/.test(location.search))
  );
  // Production web → GameDistribution rewarded (the AdSense-rejection fallback;
  // see docs/2026-06-04-web-ad-provider-after-adsense-rejection.md). Unlike H5
  // it fills on our OWN domain without AdSense approval, so this is the live web
  // path once the env + game id are provisioned. Triple-gated like H5 — explicit
  // `NEXT_PUBLIC_GD_ADS_ENABLED=true` + a configured game id, prod runtime OR
  // `?gdads_test=1`, browser env — so it ships dormant and flips by env. Sits
  // ABOVE the (0-fill) H5 path in priority.
  // Production web → ayeT-Studios rewarded video (the PRIMARY post-AdSense web
  // path: no traffic minimum, own-domain payout; see
  // docs/2026-06-04-web-ad-provider-after-adsense-rejection.md). Triple-gated
  // like the others — explicit `NEXT_PUBLIC_AYET_ADS_ENABLED=true` + a configured
  // placement id, prod runtime OR `?ayet_test=1`, browser env — so it ships
  // dormant and flips by env. Sits ABOVE GameDistribution and the dead H5 path.
  const ayetEnvEnabled = process.env.NEXT_PUBLIC_AYET_ADS_ENABLED === 'true' && getAyetPlacementId() !== '';
  const hasAyetTestFlag = typeof window !== 'undefined' && (
    (window as unknown as { __ayetAdsTest?: boolean }).__ayetAdsTest === true ||
    (typeof location !== 'undefined' && /[?&]ayet_test=1/.test(location.search))
  );
  const shouldUseAyet = !shouldUseCrazyGames && !shouldUseAdMob && ayetAds.isAvailable && ayetEnvEnabled && (isProd || hasAyetTestFlag);
  const gdEnvEnabled = process.env.NEXT_PUBLIC_GD_ADS_ENABLED === 'true' && getGdGameId() !== '';
  const hasGdTestFlag = typeof window !== 'undefined' && (
    (window as unknown as { __gdAdsTest?: boolean }).__gdAdsTest === true ||
    (typeof location !== 'undefined' && /[?&]gdads_test=1/.test(location.search))
  );
  const shouldUseGd = !shouldUseCrazyGames && !shouldUseAdMob && !shouldUseAyet && gdAds.isAvailable && gdEnvEnabled && (isProd || hasGdTestFlag);
  const shouldUseH5 = !shouldUseCrazyGames && !shouldUseAdMob && !shouldUseAyet && !shouldUseGd && h5Ads.isAvailable && h5EnvEnabled && (isProd || hasH5TestFlag);
  // Simulation only in development — never award free gold in production
  const shouldUseSimulation = isDev && !shouldUseCrazyGames && !shouldUseAdMob && !shouldUseAyet && !shouldUseGd && !shouldUseH5;
  // Placeholder: no ad platform available — still grant coins, log for admin
  const isPlaceholder = !shouldUseCrazyGames && !shouldUseAdMob && !shouldUseAyet && !shouldUseGd && !shouldUseH5
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
      : shouldUseAyet ? 'ayet'
      : shouldUseGd ? 'gamedistribution'
      : shouldUseH5 ? 'h5-games'
      : shouldUseSimulation ? 'simulation'
      : 'no-ad-placeholder';

    // Enforce daily limit across all platforms
    if (isDailyLimitReached(rewardKind)) {
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

    // Sweep any pending completed→idle / error→idle reset from a PRIOR session
    // before starting a new one — otherwise that stale timer fires mid-session
    // and flips the live status back to 'idle' (re-enabling the button under a
    // running ad).
    if (idleResetRef.current) { clearTimeout(idleResetRef.current); idleResetRef.current = null; }

    setStatus('loading');
    setError(null);

    // Freeze any listening game clock for the whole ad lifecycle. Emitting here
    // — after the early returns, before any provider shows — means EVERY
    // rewarded surface pauses a live timer (not just the one component that
    // used to wire this by hand), and the early-return paths above never set
    // it true, so they can't strand the clock frozen. Paired with the two
    // terminal emits below (reward + error) and the unmount safety above.
    adActiveRef.current = true;
    emitRewardAdActive(true);

    // Determine platform for logging
    const platform = shouldUseCrazyGames ? 'crazygames'
      : shouldUseAdMob ? 'admob'
      : shouldUseAyet ? 'ayet'
      : shouldUseGd ? 'gamedistribution'
      : shouldUseH5 ? 'h5-games'
      : shouldUseSimulation ? 'simulation'
      : 'no-ad-placeholder';

    trackRewardedAdOffered(telemetrySurface ?? 'unknown', { platform });

    // Single idempotent settle guard for this showAd session. The FIRST
    // terminal outcome — reward, error, or the stuck-state watchdog — wins;
    // every later callback (a late real reward, a duplicate provider event, a
    // watchdog that outlived a normal ad) is ignored. Generalizes the
    // CrazyGames `settleCg` pattern to ALL paths so the watchdog can never
    // double-fire with a real callback.
    let sessionSettled = false;
    const clearWatchdog = () => {
      if (watchdogRef.current) { clearTimeout(watchdogRef.current); watchdogRef.current = null; }
    };

    // Error transition, split from the settle guard so the in-flight
    // coin-grant-failure path (already inside a settled session) can reuse it
    // without tripping the guard a second time.
    const applyError = (errorMsg: string) => {
      adActiveRef.current = false;
      emitRewardAdActive(false); // resume the game clock on any failure path
      setStatus('error');
      setError(errorMsg);
      trackRewardedAdDeclined(errorMsg, platform, telemetrySurface);
      onAdError?.(errorMsg);
      // Reset to idle after showing error
      idleResetRef.current = setTimeout(() => {
        setStatus('idle');
        setError(null);
      }, 3000);
    };

    // Award coins helper - uses unified CoinContext for auth/guest sync.
    // For rewardKind='feature' we skip awardWatchedAd so feature unlocks
    // (retry, extra life, streak freeze, etc.) don't silently also pay coins.
    const awardCoinsAndNotify = async () => {
      if (sessionSettled) return;
      sessionSettled = true;
      clearWatchdog();
      adActiveRef.current = false;
      emitRewardAdActive(false); // ad done — resume the game clock before granting
      if (isPlaceholder) {
        recordPlaceholderView();
        setPlaceholderCooldownFlag(isPlaceholderCapped());
      }
      // Each kind spends its own budget — see isDailyLimitReached().
      recordDailyView(rewardKind);
      setDailyViewCount(getDailyViewCount());
      let awarded = 0;
      if (rewardKind === 'coins') {
        const result = await awardWatchedAd(platform);
        if (!result) {
          // DB write failed — don't report false success to analytics or caller
          applyError('Failed to grant coins — please try again');
          return;
        }
        awarded = result.awarded;
      }
      trackRewardedAdWatched(platform, awarded, telemetrySurface);
      setStatus('completed');
      // Shared payoff for every placement — see lib/ads/rewardCelebration.
      celebrateAdReward({ rewardKind, awarded, surface, t });
      await onRewardEarned?.(awarded);

      // Reset to idle after a short delay
      idleResetRef.current = setTimeout(() => setStatus('idle'), 1500);
    };

    // Handle ad error
    const handleAdError = (errorMsg: string) => {
      if (sessionSettled) return;
      sessionSettled = true;
      clearWatchdog();
      applyError(errorMsg);
    };

    // Arm the stuck-state backstop for the whole loading→showing→reward window.
    // If NO provider callback fires within the long window (hung SDK), force
    // the state machine back to idle so the watch-ad button re-enables.
    // Synchronous paths (immediate placeholder grant) settle first and clear
    // this instantly; real ads settle well within REWARD_STUCK_WATCHDOG_MS.
    clearWatchdog();
    watchdogRef.current = setTimeout(() => {
      if (sessionSettled) return;
      sessionSettled = true;
      watchdogRef.current = null;
      applyError('Ad timed out — please try again');
    }, REWARD_STUCK_WATCHDOG_MS);

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
    } else if (shouldUseAyet) {
      // Priority 1.6: ayeT-Studios rewarded video — primary production-web path
      // (no traffic min, own-domain). Client reward via callbackRewarded; the
      // server-side daily cap in /api/coins is the replay backstop (with the
      // S2S conversion callback as the secure server credit, wired separately).
      // Mute Howler around the fullscreen video, restore on both terminal paths.
      setStatus('showing');
      onAdStarted?.();
      try { Howler.mute(true); } catch { /* Howler not initialized */ }
      const unmuteAyet = () => { try { Howler.mute(false); } catch { /* Howler not initialized */ } };
      ayetAds.showRewarded(
        () => { unmuteAyet(); awardCoinsAndNotify(); },
        (reason) => { unmuteAyet(); handleAdError(reason || 'Ad dismissed without reward'); },
        { name: surface },
      );
    } else if (shouldUseGd) {
      // Priority 1.7: GameDistribution for production web — own-domain rewarded
      // fill (no SSV; replay protection is the server-side daily cap in
      // /api/coins). GD requires game audio muted during the video ad, so mute
      // Howler around it and restore on both terminal paths.
      setStatus('showing');
      onAdStarted?.();
      try { Howler.mute(true); } catch { /* Howler not initialized */ }
      const unmuteGd = () => { try { Howler.mute(false); } catch { /* Howler not initialized */ } };
      gdAds.showRewarded(
        () => { unmuteGd(); awardCoinsAndNotify(); },
        (reason) => { unmuteGd(); handleAdError(reason || 'Ad dismissed without reward'); },
        { name: surface },
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
  }, [status, isDev, isPlaceholder, shouldUseCrazyGames, shouldUseAdMob, shouldUseAyet, shouldUseGd, shouldUseH5, shouldUseSimulation, crazyGames, adMob, ayetAds, gdAds, h5Ads, onRewardEarned, onAdError, onAdStarted, awardWatchedAd, rewardKind, surface, telemetrySurface, t]);

  // Pre-load AdMob rewarded slot when caller signals likely intent (button
  // mount). CrazyGames SDK auto-prepares; simulation/placeholder paths
  // resolve instantly. Reduces tap-to-ad latency on the hot native path —
  // PostHog 30d showed only 3 users ever completed a watch (96 offers /
  // 13 users / 20 watches), and tap-latency anecdotally drives drop-off.
  const prepareAd = useCallback(() => {
    if (!shouldUseAdMob) return;
    void adMob.prepareRewarded({ surface });
  }, [shouldUseAdMob, adMob, surface]);

  // Opt-in warm-up: load the surface unit once when the caller signals a
  // high-intent placement (warm: true). Once per hook instance — a re-render
  // or warm flapping must not stack loads (198-loads/2-shows lesson).
  const warmedRef = useRef(false);
  useEffect(() => {
    if (!warm || warmedRef.current || !shouldUseAdMob || isDailyLimitReached(rewardKind)) return;
    warmedRef.current = true;
    void adMob.prepareRewarded({ surface });
  }, [warm, shouldUseAdMob, adMob, surface, rewardKind]);

  return {
    status,
    isAdAvailable,
    isPlaceholderCooldown,
    showAd,
    prepareAd,
    error,
    rewardAmount,
    canShowAd: !isDailyLimitReached(rewardKind) && !(isPlaceholder && !isDev),
    viewsToday: dailyViewCount,
    maxViews: MAX_DAILY_AD_VIEWS,
    isDailyLimitReached: isDailyLimitReached(rewardKind),
    isPlaceholder,
  };
}

export default useRewardedAd;
