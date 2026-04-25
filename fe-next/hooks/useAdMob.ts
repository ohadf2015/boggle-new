import { useCallback } from 'react';
import { AdMob, BannerAdSize, BannerAdPosition, RewardAdPluginEvents } from '@capacitor-community/admob';
import { useAdMobContext } from '@/contexts/AdMobContext';

// Module-level so every useAdMob() consumer observes the same banner state.
// Prevents hideBanner calls when no banner was ever shown (Sentry #120).
const bannerShownRef = { current: false };

export function useAdMob() {
  const { recordGameEnd, shouldShowInterstitial, recordInterstitialShown, hasNoAds, getConfig, whenReady } = useAdMobContext();
  const isDev = process.env.NODE_ENV !== 'production';

  const showRewarded = useCallback(async (onReward: () => void, onError?: (err: string) => void) => {
    if (hasNoAds()) return;
    const config = getConfig();
    if (!config) return;

    // Reward must come from the SDK's Rewarded event — Dismissed alone is ambiguous
    // (fires on both early-close and post-reward per plugin docs).
    let rewarded = false;
    let settled = false;
    const handles: Array<{ remove: () => void | Promise<void> }> = [];

    const cleanup = () => {
      handles.forEach((h) => { try { h.remove(); } catch {} });
      handles.length = 0;
    };

    let finishRef: (ok: boolean, errMsg?: string) => void = () => {};

    // Register listeners SYNCHRONOUSLY before any await — plugin's addListener
    // pushes to its internal registry on call (Promise wraps the handle, not registration).
    // Awaiting first would let the test/event loop race ahead of registration.
    const pendingHandles = [
      AdMob.addListener(RewardAdPluginEvents.Rewarded, () => { rewarded = true; }),
      AdMob.addListener(RewardAdPluginEvents.Dismissed, () => finishRef(rewarded)),
      AdMob.addListener(RewardAdPluginEvents.FailedToShow, (e: { message?: string } | undefined) => finishRef(false, e?.message || 'Ad failed to show')),
      AdMob.addListener(RewardAdPluginEvents.FailedToLoad, (e: { message?: string } | undefined) => finishRef(false, e?.message || 'Ad failed to load')),
    ];
    Promise.all(pendingHandles).then((hs) => handles.push(...hs)).catch(() => {});

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
            await AdMob.prepareRewardVideoAd({ adId: config.rewardedAdId });
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

  const showBanner = useCallback(async (position = BannerAdPosition.BOTTOM_CENTER, margin?: number) => {
    if (hasNoAds()) return;
    const config = getConfig();
    if (!config) return;
    try {
      await whenReady();
      await AdMob.showBanner({
        adId: config.bannerAdId,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position,
        isTesting: isDev,
        ...(typeof margin === 'number' ? { margin } : {}),
      });
      bannerShownRef.current = true;
    } catch (err) {
      // warn (not error) — Sentry captureConsole treats error-level as errors.
      console.warn('[AdMob] showBanner failed', err);
    }
  }, [hasNoAds, getConfig, isDev, whenReady]);

  const hideBanner = useCallback(async () => {
    // getConfig returns null when AdMob isn't available — skip entirely.
    if (!getConfig()) return;
    // Don't call hideBanner if we never successfully showed one (Sentry #120).
    if (!bannerShownRef.current) return;
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

  return { showRewarded, showInterstitial, showBanner, hideBanner };
}

export default useAdMob;
