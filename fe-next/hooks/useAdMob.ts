import { useCallback } from 'react';
import { AdMob, BannerAdSize, BannerAdPosition, RewardAdPluginEvents } from '@capacitor-community/admob';
import { useAdMobContext } from '@/contexts/AdMobContext';

export function useAdMob() {
  const { recordGameEnd, shouldShowInterstitial, hasNoAds, getConfig, whenReady } = useAdMobContext();
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
    try {
      await whenReady();
      await AdMob.prepareInterstitial({ adId: config.interstitialAdId });
      await AdMob.showInterstitial();
    } catch {}
  }, [recordGameEnd, shouldShowInterstitial, getConfig, whenReady]);

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
    } catch (err) {
      console.error('[AdMob] showBanner failed', err);
    }
  }, [hasNoAds, getConfig, isDev, whenReady]);

  const hideBanner = useCallback(async () => {
    try {
      await whenReady();
      await AdMob.hideBanner();
    } catch (err) {
      // hideBanner throws when no banner is mounted yet (expected on first call); only log
      // when we actually have a meaningful error.
      if (err && typeof err === 'object' && 'message' in err) {
        const msg = String((err as { message: unknown }).message);
        if (!msg.toLowerCase().includes('no banner')) console.warn('[AdMob] hideBanner failed', err);
      }
    }
  }, [whenReady]);

  return { showRewarded, showInterstitial, showBanner, hideBanner };
}

export default useAdMob;
