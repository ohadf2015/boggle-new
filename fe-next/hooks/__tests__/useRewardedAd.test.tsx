/**
 * useRewardedAd — placeholder gating
 *
 * Bug: in production with no real ad provider available, the hook fires the
 * placeholder branch (immediate coin grant, no UI). The "Watch Ad" button still
 * renders because callers only check canShowAd/isDailyLimitReached. Result:
 * users tap "Watch Ad", see nothing, get coins — broken UX.
 *
 * Fix: expose isPlaceholder, and have canShowAd return false in
 * production+placeholder mode so all 14+ consumers hide their buttons via the
 * existing canShowAd gate.
 */
import { renderHook, act } from '@testing-library/react';

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({
    isAvailable: false,
    isOnCrazyGamesPlatform: false,
    showRewardedAd: vi.fn(),
  }),
}));

vi.mock('@/hooks/useAdMob', () => ({
  useAdMob: () => ({ isAvailable: false, showRewarded: vi.fn() }),
}));


vi.mock('@/contexts/CoinContext', () => ({
  useCoinContext: () => ({
    awardWatchedAd: vi.fn().mockResolvedValue({ awarded: 30 }),
    rewards: { WATCH_AD: 30 },
  }),
}));

import { useRewardedAd } from '../useRewardedAd';

describe('useRewardedAd — placeholder mode (no ad provider, NODE_ENV=test)', () => {
  it('exposes isPlaceholder=true when no real ad provider is wired', () => {
    const { result } = renderHook(() => useRewardedAd());
    expect(result.current.isPlaceholder).toBe(true);
  });

  it('gates canShowAd=false in placeholder mode outside development', () => {
    const { result } = renderHook(() => useRewardedAd());
    // NODE_ENV='test' in vitest → isDev=false → placeholder must hide button
    expect(result.current.canShowAd).toBe(false);
  });

  it('refuses to grant feature unlock in placeholder + non-dev (web prod)', async () => {
    // Bulletproof guarantee: even if a callsite ignores canShowAd and calls
    // showAd anyway, no feature unlock fires until a real ad provider exists.
    const onUnlock = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useRewardedAd({ rewardKind: 'feature', onRewardEarned: onUnlock, onAdError: onError }),
    );
    await act(async () => {
      result.current.showAd();
      await Promise.resolve();
    });
    expect(onUnlock).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
  });

  it('refuses to grant coin reward in placeholder + non-dev (web prod)', async () => {
    const onReward = vi.fn();
    const { result } = renderHook(() => useRewardedAd({ onRewardEarned: onReward }));
    await act(async () => {
      result.current.showAd();
      await Promise.resolve();
    });
    expect(onReward).not.toHaveBeenCalled();
  });
});
