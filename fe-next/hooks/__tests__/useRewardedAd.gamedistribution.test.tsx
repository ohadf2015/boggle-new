/**
 * useRewardedAd — GameDistribution web provider routing
 *
 * On production web (not CrazyGames portal, not native) with
 * NEXT_PUBLIC_GD_ADS_ENABLED=true + a configured game id, the rewarded waterfall
 * routes to GameDistribution — the AdSense-rejection fallback for own-domain
 * rewarded fill. It sits ABOVE the dead H5 path.
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const awardWatchedAd = vi.fn().mockResolvedValue({ awarded: 30 });

let gdCallbacks: { onReward?: () => void; onError?: (r: string) => void } | null = null;

vi.mock('howler', () => ({ Howler: { mute: vi.fn() } }));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
}));

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isAvailable: false, isOnCrazyGamesPlatform: false }),
}));

vi.mock('@/hooks/useAdMob', () => ({
  useAdMob: () => ({ isAvailable: false, showRewarded: vi.fn(), prepareRewarded: vi.fn() }),
}));

vi.mock('@/hooks/useH5GamesAds', () => ({
  useH5GamesAds: () => ({ isAvailable: false, showRewarded: vi.fn(), initialize: vi.fn() }),
}));

vi.mock('@/hooks/useGameDistributionAds', () => ({
  useGameDistributionAds: () => ({
    isAvailable: true,
    initialize: vi.fn(),
    showRewarded: (onReward: () => void, onError?: (r: string) => void) => {
      gdCallbacks = { onReward, onError };
    },
  }),
}));

vi.mock('@/lib/ads/gameDistributionAds', () => ({
  getGdGameId: () => 'gid123hash',
}));

vi.mock('@/contexts/CoinContext', () => ({
  useCoinContext: () => ({ awardWatchedAd, rewards: { WATCH_AD: 30 } }),
}));

import { useRewardedAd } from '../useRewardedAd';

describe('useRewardedAd — GameDistribution web routing', () => {
  beforeEach(() => {
    gdCallbacks = null;
    awardWatchedAd.mockClear();
    process.env.NEXT_PUBLIC_GD_ADS_ENABLED = 'true';
    (window as unknown as { __gdAdsTest?: boolean }).__gdAdsTest = true;
  });
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_GD_ADS_ENABLED;
    delete (window as unknown as { __gdAdsTest?: boolean }).__gdAdsTest;
  });

  it('routes to GameDistribution and shows the ad on enabled web', () => {
    const { result } = renderHook(() => useRewardedAd());
    act(() => { result.current.showAd(); });
    expect(gdCallbacks).not.toBeNull();
    expect(result.current.status).toBe('showing');
  });

  it('grants coins when the GD ad is fully watched', async () => {
    const { result } = renderHook(() => useRewardedAd());
    act(() => { result.current.showAd(); });
    await act(async () => { gdCallbacks!.onReward?.(); });
    expect(awardWatchedAd).toHaveBeenCalledWith('gamedistribution');
    expect(result.current.status).toBe('completed');
  });

  it('routes to error when the GD ad is dismissed/unfilled', () => {
    const { result } = renderHook(() => useRewardedAd());
    act(() => { result.current.showAd(); });
    act(() => { gdCallbacks!.onError?.('gd-dismissed'); });
    expect(result.current.status).toBe('error');
    expect(awardWatchedAd).not.toHaveBeenCalled();
  });

  it('stays in placeholder (no GD) when the env flag is off', () => {
    delete process.env.NEXT_PUBLIC_GD_ADS_ENABLED;
    const { result } = renderHook(() => useRewardedAd());
    expect(result.current.isPlaceholder).toBe(true);
  });
});
