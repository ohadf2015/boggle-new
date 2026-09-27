/**
 * useRewardedAd — CrazyGames lifecycle wrapping
 *
 * CrazyGames full-launch requires gameplayStop() before and gameplayStart()
 * after every ad, plus audio muting during ad playback. The direct
 * showRewardedAd call in the CG branch was missing both.
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const gameplayStart = vi.fn();
const gameplayStop = vi.fn();
const howlerMute = vi.fn();

let capturedCallbacks: { adStarted?: () => void; adFinished?: () => void; adError?: (e: string) => void } | null = null;

vi.mock('howler', () => ({
  Howler: { mute: (v: boolean) => howlerMute(v) },
}));

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({
    isAvailable: true,
    isOnCrazyGamesPlatform: true,
    gameplayStart,
    gameplayStop,
    showRewardedAd: (cbs: typeof capturedCallbacks) => { capturedCallbacks = cbs; },
    hasAdblock: async () => false,
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

describe('useRewardedAd — CrazyGames lifecycle wrapping (full-launch QA)', () => {
  beforeEach(() => {
    gameplayStart.mockClear();
    gameplayStop.mockClear();
    howlerMute.mockClear();
    capturedCallbacks = null;
  });

  it('calls gameplayStop before showing rewarded ad on CG', () => {
    const { result } = renderHook(() => useRewardedAd());
    act(() => { result.current.showAd(); });
    expect(gameplayStop).toHaveBeenCalledTimes(1);
  });

  it('mutes Howler when ad starts and unmutes after ad finishes', async () => {
    const { result } = renderHook(() => useRewardedAd());
    act(() => { result.current.showAd(); });
    expect(capturedCallbacks).not.toBeNull();

    act(() => { capturedCallbacks!.adStarted?.(); });
    expect(howlerMute).toHaveBeenCalledWith(true);

    await act(async () => { capturedCallbacks!.adFinished?.(); });
    expect(howlerMute).toHaveBeenCalledWith(false);
  });

  it('calls gameplayStart after rewarded ad finishes', async () => {
    const { result } = renderHook(() => useRewardedAd());
    act(() => { result.current.showAd(); });
    act(() => { capturedCallbacks!.adStarted?.(); });
    await act(async () => { capturedCallbacks!.adFinished?.(); });
    expect(gameplayStart).toHaveBeenCalledTimes(1);
  });

  it('calls gameplayStart and unmutes even if ad errors', () => {
    const { result } = renderHook(() => useRewardedAd());
    act(() => { result.current.showAd(); });
    act(() => { capturedCallbacks!.adError?.('unfilled'); });
    expect(gameplayStart).toHaveBeenCalledTimes(1);
    expect(howlerMute).toHaveBeenCalledWith(false);
  });
});
