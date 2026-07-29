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

  // --- Segmented rewarded units ---

  it('exposes rewardedUnits map with surface-specific defaults baked in', () => {
    const config = getAdmobConfig('android');
    expect(config.rewardedUnits).toBeDefined();
    expect(config.rewardedUnits.generic).toBe(DEFAULTS.android.rewardedAdId);
    // Per-surface units have their own DEFAULTS entries, distinct from generic.
    expect(config.rewardedUnits.hint).toBe(DEFAULTS.android.rewardedSurfaceIds.hint);
    expect(config.rewardedUnits.doubleGold).toBe(DEFAULTS.android.rewardedSurfaceIds.doubleGold);
    expect(config.rewardedUnits.freeze).toBe(DEFAULTS.android.rewardedSurfaceIds.freeze);
    expect(config.rewardedUnits.retry).toBe(DEFAULTS.android.rewardedSurfaceIds.retry);
    expect(config.rewardedUnits.timeLow).toBe(DEFAULTS.android.rewardedSurfaceIds.timeLow);
    expect(config.rewardedUnits.catchup).toBe(DEFAULTS.android.rewardedSurfaceIds.catchup);
  });

  it('per-surface env override for catchup takes precedence over generic and default', () => {
    process.env.NEXT_PUBLIC_ADMOB_REWARDED_ANDROID = 'ca-app-pub-x/generic';
    process.env.NEXT_PUBLIC_ADMOB_REWARDED_CATCHUP_ANDROID = 'ca-app-pub-x/catchup';
    const config = getAdmobConfig('android');
    expect(config.rewardedUnits.catchup).toBe('ca-app-pub-x/catchup');
    expect(config.rewardedUnits.generic).toBe('ca-app-pub-x/generic');
  });

  it('per-surface env override for hint takes precedence over generic env and surface default', () => {
    process.env.NEXT_PUBLIC_ADMOB_REWARDED_ANDROID = 'ca-app-pub-x/generic';
    process.env.NEXT_PUBLIC_ADMOB_REWARDED_HINT_ANDROID = 'ca-app-pub-x/hint';
    const config = getAdmobConfig('android');
    expect(config.rewardedUnits.hint).toBe('ca-app-pub-x/hint');
    expect(config.rewardedUnits.generic).toBe('ca-app-pub-x/generic');
    // doubleGold has no env set → falls to its hard-coded surface default
    expect(config.rewardedUnits.doubleGold).toBe(DEFAULTS.android.rewardedSurfaceIds.doubleGold);
  });

  it('cross-platform per-surface env applies to both platforms', () => {
    process.env.NEXT_PUBLIC_ADMOB_REWARDED_FREEZE = 'ca-app-pub-x/freeze';
    expect(getAdmobConfig('android').rewardedUnits.freeze).toBe('ca-app-pub-x/freeze');
    expect(getAdmobConfig('ios').rewardedUnits.freeze).toBe('ca-app-pub-x/freeze');
  });

  it('platform-specific per-surface env beats cross-platform per-surface', () => {
    process.env.NEXT_PUBLIC_ADMOB_REWARDED_RETRY = 'ca-app-pub-x/retry-any';
    process.env.NEXT_PUBLIC_ADMOB_REWARDED_RETRY_ANDROID = 'ca-app-pub-x/retry-android';
    expect(getAdmobConfig('android').rewardedUnits.retry).toBe('ca-app-pub-x/retry-android');
    expect(getAdmobConfig('ios').rewardedUnits.retry).toBe('ca-app-pub-x/retry-any');
  });

  it('legacy rewardedAdId mirrors rewardedUnits.generic', () => {
    process.env.NEXT_PUBLIC_ADMOB_REWARDED_ANDROID = 'ca-app-pub-x/legacy-generic';
    const config = getAdmobConfig('android');
    expect(config.rewardedAdId).toBe(config.rewardedUnits.generic);
  });

  // --- Segmented banner variants ---

  it('exposes bannerUnits map with distinct content default', () => {
    const config = getAdmobConfig('android');
    expect(config.bannerUnits).toBeDefined();
    expect(config.bannerUnits.game).toBe(DEFAULTS.android.bannerAdId);
    expect(config.bannerUnits.content).toBe(DEFAULTS.android.contentBannerAdId);
  });

  it('content banner env override beats default content banner', () => {
    process.env.NEXT_PUBLIC_ADMOB_BANNER_CONTENT_ANDROID = 'ca-app-pub-x/banner-content';
    const config = getAdmobConfig('android');
    expect(config.bannerUnits.content).toBe('ca-app-pub-x/banner-content');
    expect(config.bannerUnits.game).toBe(DEFAULTS.android.bannerAdId);
  });

  it('legacy bannerAdId mirrors bannerUnits.game', () => {
    process.env.NEXT_PUBLIC_ADMOB_BANNER_ANDROID = 'ca-app-pub-x/legacy-banner';
    const config = getAdmobConfig('android');
    expect(config.bannerAdId).toBe(config.bannerUnits.game);
  });
});
