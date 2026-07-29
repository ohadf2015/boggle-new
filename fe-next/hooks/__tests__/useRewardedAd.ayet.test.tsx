/**
 * useRewardedAd — ayeT-Studios web provider routing
 *
 * On production web (not CrazyGames, not native) with
 * NEXT_PUBLIC_AYET_ADS_ENABLED=true + a configured placement id, the rewarded
 * waterfall routes to ayeT — the primary post-AdSense-rejection web path (no
 * traffic minimum, own-domain). It sits ABOVE GameDistribution and the dead H5.
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const awardWatchedAd = vi.fn().mockResolvedValue({ awarded: 30 });
let ayetCallbacks: { onReward?: () => void; onError?: (r: string) => void } | null = null;

vi.mock('howler', () => ({ Howler: { mute: vi.fn() } }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
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
  useGameDistributionAds: () => ({ isAvailable: true, initialize: vi.fn(), showRewarded: vi.fn() }),
}));
vi.mock('@/lib/ads/gameDistributionAds', () => ({ getGdGameId: () => '' }));
vi.mock('@/hooks/useAyetVideoAds', () => ({
  useAyetVideoAds: () => ({
    isAvailable: true,
    initialize: vi.fn(),
    showRewarded: (onReward: () => void, onError?: (r: string) => void) => {
      ayetCallbacks = { onReward, onError };
    },
  }),
}));
vi.mock('@/lib/ads/ayetVideoAds', () => ({ getAyetPlacementId: () => '99999' }));
vi.mock('@/contexts/CoinContext', () => ({
  useCoinContext: () => ({ awardWatchedAd, rewards: { WATCH_AD: 30 } }),
}));

import { useRewardedAd } from '../useRewardedAd';

describe('useRewardedAd — ayeT web routing', () => {
  beforeEach(() => {
    ayetCallbacks = null;
    awardWatchedAd.mockClear();
    process.env.NEXT_PUBLIC_AYET_ADS_ENABLED = 'true';
    (window as unknown as { __ayetAdsTest?: boolean }).__ayetAdsTest = true;
  });
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_AYET_ADS_ENABLED;
    delete (window as unknown as { __ayetAdsTest?: boolean }).__ayetAdsTest;
  });

  it('routes to ayeT and shows the ad on enabled web', () => {
    const { result } = renderHook(() => useRewardedAd());
    act(() => { result.current.showAd(); });
    expect(ayetCallbacks).not.toBeNull();
    expect(result.current.status).toBe('showing');
  });

  it('grants coins tagged ayet when the video is fully watched', async () => {
    const { result } = renderHook(() => useRewardedAd());
    act(() => { result.current.showAd(); });
    await act(async () => { ayetCallbacks!.onReward?.(); });
    expect(awardWatchedAd).toHaveBeenCalledWith('ayet');
    expect(result.current.status).toBe('completed');
  });

  it('routes to error when the ayeT video is dismissed/unfilled', () => {
    const { result } = renderHook(() => useRewardedAd());
    act(() => { result.current.showAd(); });
    act(() => { ayetCallbacks!.onError?.('ayet-dismissed'); });
    expect(result.current.status).toBe('error');
    expect(awardWatchedAd).not.toHaveBeenCalled();
  });

  it('stays in placeholder when the ayeT env flag is off', () => {
    delete process.env.NEXT_PUBLIC_AYET_ADS_ENABLED;
    const { result } = renderHook(() => useRewardedAd());
    expect(result.current.isPlaceholder).toBe(true);
  });
});
