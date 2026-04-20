import { useCallback } from 'react';
import { AdMob, BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';
import { useAdMobContext } from '@/contexts/AdMobContext';

export function useAdMob() {
  const { recordGameEnd, shouldShowInterstitial, hasNoAds, getConfig } = useAdMobContext();
  const isDev = process.env.NODE_ENV !== 'production';

  const showRewarded = useCallback(async (onReward: () => void, onError?: (err: string) => void) => {
    if (hasNoAds()) return;
    const config = getConfig();
    if (!config) return;
    try {
      await AdMob.prepareRewardVideoAd({ adId: config.rewardedAdId });
      await AdMob.showRewardVideoAd();
      onReward();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ad failed';
      onError?.(msg);
    }
  }, [hasNoAds, getConfig]);

  const showInterstitial = useCallback(async () => {
    recordGameEnd();
    if (!shouldShowInterstitial()) return;
    const config = getConfig();
    if (!config) return;
    try {
      await AdMob.prepareInterstitial({ adId: config.interstitialAdId });
      await AdMob.showInterstitial();
    } catch {}
  }, [recordGameEnd, shouldShowInterstitial, getConfig]);

  const showBanner = useCallback(async (position = BannerAdPosition.BOTTOM_CENTER) => {
    if (hasNoAds()) return;
    const config = getConfig();
    if (!config) return;
    try {
      await AdMob.showBanner({
        adId: config.bannerAdId,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position,
        isTesting: isDev,
      });
    } catch {}
  }, [hasNoAds, getConfig, isDev]);

  const hideBanner = useCallback(async () => {
    try {
      await AdMob.hideBanner();
    } catch {}
  }, []);

  return { showRewarded, showInterstitial, showBanner, hideBanner };
}

export default useAdMob;
