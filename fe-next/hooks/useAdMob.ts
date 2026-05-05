import { useCallback } from 'react';
import { AdMob, BannerAdSize, BannerAdPosition, RewardAdPluginEvents } from '@capacitor-community/admob';
import { useAdMobContext } from '@/contexts/AdMobContext';
import type { RewardedSurface, BannerVariant } from '@/lib/admob-config';

// Module-level so every useAdMob() consumer observes the same banner state.
// Prevents hideBanner calls when no banner was ever shown (Sentry #120).
const bannerShownRef = { current: false };

export interface ShowRewardedOptions {
  surface?: RewardedSurface;
}

export interface ShowBannerOptions {
  variant?: BannerVariant;
}

export function useAdMob() {
  const { recordGameEnd, shouldShowInterstitial, recordInterstitialShown, hasNoAds, getConfig, whenReady } = useAdMobContext();
  const isDev = process.env.NODE_ENV !== 'production';

  const showRewarded = useCallback(async (onReward: () => void, onError?: (err: string) => void, opts?: ShowRewardedOptions) => {
    if (hasNoAds()) return;
    const config = getConfig();
    if (!config) return;
    const surface: RewardedSurface = opts?.surface ?? 'generic';
    // Per-surface unit ID lets AdMob waterfall optimize each placement separately.
    const adId = config.rewardedUnits?.[surface] ?? config.rewardedAdId;

    // Reward must come from the SDK's Rewarded event. @capacitor-community/admob v8 does
    // not guarantee `Rewarded → Dismissed` order on Android — some builds fire Dismissed
    // first and the Rewarded payload lands ~tens-to-hundreds of ms later. Treat Rewarded
    // as the direct success trigger; on Dismissed without a prior Rewarded, hold a short
    // grace window for a late event before declaring skip.
    let rewarded = false;
    let settled = false;
    let dismissGraceTimer: ReturnType<typeof setTimeout> | null = null;
    const REWARD_GRACE_MS = 750;
    const handles: Array<{ remove: () => void | Promise<void> }> = [];

    const cleanup = () => {
      if (dismissGraceTimer) { clearTimeout(dismissGraceTimer); dismissGraceTimer = null; }
      handles.forEach((h) => { try { h.remove(); } catch {} });
      handles.length = 0;
    };

    let finishRef: (ok: boolean, errMsg?: string) => void = () => {};

    const pendingHandles = [
      AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
        rewarded = true;
        finishRef(true);
      }),
      AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
        if (rewarded || settled) return;
        dismissGraceTimer = setTimeout(() => {
          if (!rewarded) finishRef(false);
        }, REWARD_GRACE_MS);
      }),
      AdMob.addListener(RewardAdPluginEvents.FailedToShow, (e: { message?: string } | undefined) => finishRef(false, e?.message || 'Ad failed to show')),
      AdMob.addListener(RewardAdPluginEvents.FailedToLoad, (e: { message?: string } | undefined) => finishRef(false, e?.message || 'Ad failed to load')),
    ];
    // Await registration before we fire `prepareRewardVideoAd`, otherwise a fast plugin
    // could emit Rewarded before our listener is attached on the native side.
    try {
      const resolved = await Promise.all(pendingHandles);
      handles.push(...resolved);
    } catch { /* listener registration is best-effort; ad path still drives outcome */ }

    try {
      await new Promise<void>((resolve) => {
        finishRef = (ok: boolean, errMsg?: string) => {
          if (settled) return;
          settled = true;
          cleanup();
          if (ok) onReward(); else onError?.(errMsg || 'Ad dismissed without reward');
          resolve();
        };

        (async () => {
          try {
            await whenReady();
            await AdMob.prepareRewardVideoAd({ adId });
            await AdMob.showRewardVideoAd();
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Ad failed';
            finishRef(false, msg);
          }
        })();
      });
    } catch (err) {
      cleanup();
      const msg = err instanceof Error ? err.message : 'Ad failed';
      onError?.(msg);
    }
  }, [hasNoAds, getConfig, whenReady]);

  const showInterstitial = useCallback(async () => {
    recordGameEnd();
    if (!shouldShowInterstitial()) return;
    const config = getConfig();
    if (!config) return;
    // Record before show — gate uses this counter, recording after a thrown
    // showInterstitial would let a broken plugin re-fire indefinitely.
    recordInterstitialShown();
    try {
      await whenReady();
      await AdMob.prepareInterstitial({ adId: config.interstitialAdId });
      await AdMob.showInterstitial();
    } catch {}
  }, [recordGameEnd, shouldShowInterstitial, recordInterstitialShown, getConfig, whenReady]);

  const showBanner = useCallback(async (position = BannerAdPosition.BOTTOM_CENTER, margin?: number, opts?: ShowBannerOptions) => {
    if (hasNoAds()) return;
    const config = getConfig();
    if (!config) return;
    const variant: BannerVariant = opts?.variant ?? 'game';
    const adId = config.bannerUnits?.[variant] ?? config.bannerAdId;
    // Optimistic flip BEFORE await — closes race where a hideBanner arriving
    // mid-show was a no-op (ref still false), letting plugin paint the banner
    // on the destination route after navigation. Revert on failure.
    bannerShownRef.current = true;
    try {
      await whenReady();
      await AdMob.showBanner({
        adId,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position,
        isTesting: isDev,
        ...(typeof margin === 'number' ? { margin } : {}),
      });
    } catch (err) {
      bannerShownRef.current = false;
      // warn (not error) — Sentry captureConsole treats error-level as errors.
      console.warn('[AdMob] showBanner failed', err);
    }
  }, [hasNoAds, getConfig, isDev, whenReady]);

  /**
   * Pre-load a rewarded ad so the next `showRewarded` resolves instantly
   * (no network spinner between tap and ad). Fire-and-forget — failures
   * are silent because the eventual `showRewarded` retries `prepare` and
   * surfaces errors there.
   *
   * Call this when the user enters a context where they're likely to opt
   * in (e.g. a RewardedAdGoldButton mounting). Skipped on no-ads builds.
   */
  const prepareRewarded = useCallback(async (opts?: ShowRewardedOptions) => {
    if (hasNoAds()) return;
    const config = getConfig();
    if (!config) return;
    const surface: RewardedSurface = opts?.surface ?? 'generic';
    const adId = config.rewardedUnits?.[surface] ?? config.rewardedAdId;
    try {
      await whenReady();
      await AdMob.prepareRewardVideoAd({ adId });
    } catch {
      // Silent: subsequent showRewarded path will retry + report.
    }
  }, [hasNoAds, getConfig, whenReady]);

  const hideBanner = useCallback(async () => {
    // getConfig returns null when AdMob isn't available — skip entirely.
    if (!getConfig()) return;
    // Always attempt the plugin call. The prior `bannerShownRef` early-return
    // raced with in-flight showBanner (ref flips after await), making hide a
    // no-op while a banner was about to paint on the destination route.
    // Plugin throws benign "no banner" when nothing is showing — caught below.
    try {
      await whenReady();
      await AdMob.hideBanner();
      bannerShownRef.current = false;
    } catch (err) {
      if (err && typeof err === 'object' && 'message' in err) {
        const msg = String((err as { message: unknown }).message);
        if (!/no banner|never shown|not shown|not.*display/i.test(msg)) console.warn('[AdMob] hideBanner failed', err);
      }
    }
  }, [getConfig, whenReady]);

  return { showRewarded, prepareRewarded, showInterstitial, showBanner, hideBanner };
}

export default useAdMob;
