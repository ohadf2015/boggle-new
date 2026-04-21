import { useCallback } from 'react';
import { AdMob, BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';
import { useAdMobContext } from '@/contexts/AdMobContext';

export function useAdMob() {
  const { recordGameEnd, shouldShowInterstitial, hasNoAds, getConfig, whenReady } = useAdMobContext();
  const isDev = process.env.NODE_ENV !== 'production';

  const showRewarded = useCallback(async (onReward: () => void, onError?: (err: string) => void) => {
    if (hasNoAds()) return;
    const config = getConfig();
    if (!config) return;
    try {
      await whenReady();
      await AdMob.prepareRewardVideoAd({ adId: config.rewardedAdId });
      await AdMob.showRewardVideoAd();
      onReward();
    } catch (err) {
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
    } catch {}
  }, [hasNoAds, getConfig, isDev, whenReady]);

  const hideBanner = useCallback(async () => {
    try {
      await whenReady();
      await AdMob.hideBanner();
    } catch {}
  }, [whenReady]);

  return { showRewarded, showInterstitial, showBanner, hideBanner };
}

export default useAdMob;
