/**
 * useRewardedAd — GameMonetize routing
 *
 * When NEXT_PUBLIC_GAMEMONETIZE_GAME_ID is set on production web (no CG, no
 * native, H5 disabled), useRewardedAd routes the reward request to the
 * useGameMonetize hook instead of placeholder rejection.
 *
 * Triple-gated like H5: GameMonetize game-id env present + production runtime
 * + browser env. Without the env var the placeholder still refuses rewards.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isAvailable: false, isOnCrazyGamesPlatform: false, showRewardedAd: vi.fn() }),
}));
vi.mock('@/hooks/useAdMob', () => ({
  useAdMob: () => ({ isAvailable: false, showRewarded: vi.fn(), prepareRewarded: vi.fn() }),
}));
vi.mock('@/hooks/useH5GamesAds', () => ({
  useH5GamesAds: () => ({ isAvailable: false, initialize: vi.fn(), showRewarded: vi.fn(), showInterstitial: vi.fn() }),
}));
vi.mock('@/contexts/CoinContext', () => ({
  useCoinContext: () => ({
    awardWatchedAd: vi.fn().mockResolvedValue({ awarded: 30 }),
    rewards: { WATCH_AD: 30 },
  }),
}));

const gmShowRewarded = vi.fn();
vi.mock('@/hooks/useGameMonetize', () => ({
  useGameMonetize: () => ({
    isAvailable: true,
    initialize: vi.fn(),
    showRewarded: gmShowRewarded,
  }),
}));

import { useRewardedAd } from '../useRewardedAd';

describe('useRewardedAd — GameMonetize routing', () => {
  beforeEach(() => {
    gmShowRewarded.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('routes to GameMonetize when env id set + production web (no other provider)', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_GAMEMONETIZE_GAME_ID', 'real-gid');

    const onReward = vi.fn();
    const { result } = renderHook(() => useRewardedAd({ onRewardEarned: onReward }));

    await act(async () => {
      result.current.showAd();
      await Promise.resolve();
    });

    expect(gmShowRewarded).toHaveBeenCalledTimes(1);
    expect(gmShowRewarded.mock.calls[0][2]).toEqual(expect.objectContaining({ name: 'generic' }));
  });

  it('still routes to GameMonetize via hardcoded fallback when env id NOT set', async () => {
    // After 2026-05-15 prod-verify: NEXT_PUBLIC_X with optional-chain
    // guards is NOT inlined by Next, so getGameMonetizeId() now ships a
    // hardcoded fallback. Placeholder mode is unreachable in production —
    // every web user gets the LexiClash GameMonetize publisher game-id.
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_GAMEMONETIZE_GAME_ID', '');

    const onReward = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() => useRewardedAd({ onRewardEarned: onReward, onAdError: onError }));

    await act(async () => {
      result.current.showAd();
      await Promise.resolve();
    });

    expect(gmShowRewarded).toHaveBeenCalledTimes(1);
  });

  it('grants reward when GameMonetize fires onReward callback (coin path)', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_GAMEMONETIZE_GAME_ID', 'real-gid');
    gmShowRewarded.mockImplementation((cb: () => void) => { cb(); });

    const onReward = vi.fn();
    const { result } = renderHook(() => useRewardedAd({ onRewardEarned: onReward }));

    await act(async () => {
      result.current.showAd();
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(onReward).toHaveBeenCalledWith(30);
  });

  it('reports error when GameMonetize fires onError (no-fill/dismiss)', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_GAMEMONETIZE_GAME_ID', 'real-gid');
    gmShowRewarded.mockImplementation((_cb: () => void, errCb: (m: string) => void) => {
      errCb('no-fill');
    });

    const onReward = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() => useRewardedAd({ onRewardEarned: onReward, onAdError: onError }));

    await act(async () => {
      result.current.showAd();
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(onReward).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
  });
});
