export type AdPlatform = 'android' | 'ios';

export interface AdmobConfig {
  rewardedAdId: string;
  interstitialAdId: string;
  bannerAdId: string;
}

export const DEFAULTS: Record<AdPlatform, AdmobConfig> = {
  android: {
    rewardedAdId: 'ca-app-pub-3940256099942544/5224354917',
    interstitialAdId: 'ca-app-pub-3940256099942544/1033173712',
    bannerAdId: 'ca-app-pub-3940256099942544/6300978111',
  },
  ios: {
    rewardedAdId: 'ca-app-pub-3940256099942544/1712485313',
    interstitialAdId: 'ca-app-pub-3940256099942544/4411468910',
    bannerAdId: 'ca-app-pub-3940256099942544/2934735716',
  },
};

export function getAdmobConfig(platform: AdPlatform): AdmobConfig {
  const suffix = platform === 'android' ? 'ANDROID' : 'IOS';
  return {
    rewardedAdId:
      process.env[`NEXT_PUBLIC_ADMOB_REWARDED_${suffix}`] ||
      process.env['NEXT_PUBLIC_ADMOB_REWARDED_ID'] ||
      DEFAULTS[platform].rewardedAdId,
    interstitialAdId:
      process.env[`NEXT_PUBLIC_ADMOB_INTERSTITIAL_${suffix}`] ||
      process.env['NEXT_PUBLIC_ADMOB_INTERSTITIAL_ID'] ||
      DEFAULTS[platform].interstitialAdId,
    bannerAdId:
      process.env[`NEXT_PUBLIC_ADMOB_BANNER_${suffix}`] ||
      process.env['NEXT_PUBLIC_ADMOB_BANNER_ID'] ||
      DEFAULTS[platform].bannerAdId,
  };
}
