import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getAdmobConfig, DEFAULTS } from '../admob-config';

describe('getAdmobConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns android default IDs when env vars are missing', () => {
    const config = getAdmobConfig('android');
    expect(config.rewardedAdId).toBe(DEFAULTS.android.rewardedAdId);
    expect(config.interstitialAdId).toBe(DEFAULTS.android.interstitialAdId);
    expect(config.bannerAdId).toBe(DEFAULTS.android.bannerAdId);
  });

  it('returns ios default IDs when env vars are missing', () => {
    const config = getAdmobConfig('ios');
    expect(config.rewardedAdId).toBe(DEFAULTS.ios.rewardedAdId);
    expect(config.interstitialAdId).toBe(DEFAULTS.ios.interstitialAdId);
    expect(config.bannerAdId).toBe(DEFAULTS.ios.bannerAdId);
  });

  it('overrides android rewarded ID from env', () => {
    process.env.NEXT_PUBLIC_ADMOB_REWARDED_ANDROID = 'ca-app-pub-custom/rewarded-android';
    const config = getAdmobConfig('android');
    expect(config.rewardedAdId).toBe('ca-app-pub-custom/rewarded-android');
  });

  it('overrides ios banner ID from env', () => {
    process.env.NEXT_PUBLIC_ADMOB_BANNER_IOS = 'ca-app-pub-custom/banner-ios';
    const config = getAdmobConfig('ios');
    expect(config.bannerAdId).toBe('ca-app-pub-custom/banner-ios');
  });

  it('falls back to default when env var is empty string', () => {
    process.env.NEXT_PUBLIC_ADMOB_REWARDED_ANDROID = '';
    const config = getAdmobConfig('android');
    expect(config.rewardedAdId).toBe(DEFAULTS.android.rewardedAdId);
  });
});
