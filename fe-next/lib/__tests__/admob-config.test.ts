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

  it('returns android test IDs by default', () => {
    const config = getAdmobConfig('android');
    expect(config.rewardedAdId).toBe('ca-app-pub-3940256099942544/5224354917');
    expect(config.interstitialAdId).toBe('ca-app-pub-3940256099942544/1033173712');
    expect(config.bannerAdId).toBe('ca-app-pub-3940256099942544/6300978111');
  });

  it('returns ios test IDs by default', () => {
    const config = getAdmobConfig('ios');
    expect(config.rewardedAdId).toBe('ca-app-pub-3940256099942544/1712485313');
    expect(config.interstitialAdId).toBe('ca-app-pub-3940256099942544/4411468910');
    expect(config.bannerAdId).toBe('ca-app-pub-3940256099942544/2934735716');
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
