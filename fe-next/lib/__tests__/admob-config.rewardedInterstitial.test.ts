import { describe, it, expect, afterEach, vi } from 'vitest';
import { getAdmobConfig } from '../admob-config';

/**
 * Per-surface "use Rewarded Interstitial API" switch.
 *
 * Some AdMob units are configured in the dashboard as Rewarded INTERSTITIAL
 * (the "Ad 1 of 2" creative), which must be driven through
 * prepareRewardInterstitialAd / showRewardInterstitialAd — not the rewarded
 * VIDEO API. Showing such a unit via the video API renders an ad whose
 * terminal events never fire in the video namespace → the player is stuck with
 * no reward. This switch lets ops route the affected surface(s) to the correct
 * API WITHOUT a code change. Default = empty (every surface keeps the proven
 * video path).
 */

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getAdmobConfig — rewardedInterstitialSurfaces', () => {
  it('defaults to an empty list (every surface uses the video path)', () => {
    const cfg = getAdmobConfig('android');
    expect(cfg.rewardedInterstitialSurfaces).toEqual([]);
  });

  it('parses a comma-separated env list, trims, and drops unknown surfaces', () => {
    vi.stubEnv('NEXT_PUBLIC_ADMOB_REWARDED_INTERSTITIAL_SURFACES', ' doubleGold , retry ,bogus, ');
    const cfg = getAdmobConfig('android');
    expect(cfg.rewardedInterstitialSurfaces).toEqual(['doubleGold', 'retry']);
  });

  it('supports "all" as a shorthand for every rewarded surface', () => {
    vi.stubEnv('NEXT_PUBLIC_ADMOB_REWARDED_INTERSTITIAL_SURFACES', 'all');
    const cfg = getAdmobConfig('android');
    expect(cfg.rewardedInterstitialSurfaces).toContain('generic');
    expect(cfg.rewardedInterstitialSurfaces).toContain('doubleGold');
    expect(cfg.rewardedInterstitialSurfaces.length).toBeGreaterThanOrEqual(7);
  });
});
