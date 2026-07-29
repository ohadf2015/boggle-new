/**
 * useRewardedAd — game-clock pause + idle-reset hygiene
 *
 * The hook centrally emits `rewardAdActiveChange` (via emitRewardAdActive)
 * around the ad lifecycle so ANY rewarded surface freezes a listening game
 * timer while the fullscreen ad is up — preventing the "timer ran to zero
 * behind the ad → premature game-over → reward too late" class of bug for
 * every surface, not just the one component that used to wire it by hand.
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const showRewardedMock = vi.fn();

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({
    isAvailable: false,
    isOnCrazyGamesPlatform: false,
    showRewardedAd: vi.fn(),
  }),
}));

vi.mock('@/hooks/useAdMob', () => ({
  useAdMob: () => ({ isAvailable: true, showRewarded: showRewardedMock, prepareRewarded: vi.fn() }),
}));

vi.mock('@/hooks/useH5GamesAds', () => ({
  useH5GamesAds: () => ({ isAvailable: false, showRewarded: vi.fn() }),
}));

vi.mock('@/contexts/CoinContext', () => ({
  useCoinContext: () => ({
    awardWatchedAd: vi.fn().mockResolvedValue({ awarded: 30 }),
    rewards: { WATCH_AD: 30 },
  }),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' },
}));

import { useRewardedAd } from '../useRewardedAd';

describe('useRewardedAd — central game-clock pause emit', () => {
  let events: boolean[];
  const listener = (e: Event) => events.push((e as CustomEvent<{ active: boolean }>).detail.active);

  beforeEach(() => {
    vi.useFakeTimers();
    showRewardedMock.mockReset();
    localStorage.clear();
    events = [];
    window.addEventListener('rewardAdActiveChange', listener);
  });
  afterEach(() => {
    window.removeEventListener('rewardAdActiveChange', listener);
    vi.useRealTimers();
  });

  it('emits active:true when the ad starts, regardless of surface/component', () => {
    showRewardedMock.mockImplementation(() => { /* hung */ });
    const { result } = renderHook(() => useRewardedAd({ surface: 'hint', rewardKind: 'feature' }));

    act(() => { result.current.showAd(); });

    expect(events).toContain(true);
  });

  it('emits active:false when the reward lands (clock resumes)', async () => {
    let capturedOnReward: (() => void) | null = null;
    showRewardedMock.mockImplementation((onReward: () => void) => { capturedOnReward = onReward; });
    const { result } = renderHook(() => useRewardedAd({ surface: 'retry', rewardKind: 'feature' }));

    act(() => { result.current.showAd(); });
    await act(async () => { capturedOnReward!(); await Promise.resolve(); });

    expect(events[events.length - 1]).toBe(false);
  });

  it('emits active:false when the ad errors (clock resumes)', () => {
    let capturedOnError: ((m: string) => void) | null = null;
    showRewardedMock.mockImplementation((_r: () => void, onError: (m: string) => void) => { capturedOnError = onError; });
    const { result } = renderHook(() => useRewardedAd({ surface: 'hint', rewardKind: 'feature' }));

    act(() => { result.current.showAd(); });
    act(() => { capturedOnError!('no fill'); });

    expect(events[events.length - 1]).toBe(false);
  });

  it('an IDLE instance unmounting does NOT release another instance\'s active pause', () => {
    showRewardedMock.mockImplementation(() => { /* hung — pause stays active */ });
    // Instance A starts an ad → global pause active.
    const a = renderHook(() => useRewardedAd({ surface: 'timeLow', rewardKind: 'feature' }));
    act(() => { a.result.current.showAd(); });
    // Instance B never showed an ad. Its unmount must NOT clear A's pause
    // (global non-refcounted boolean → unconditional emit(false) would).
    const b = renderHook(() => useRewardedAd({ surface: 'hint', rewardKind: 'feature' }));
    act(() => { b.unmount(); });

    expect(events[events.length - 1]).toBe(true); // A's pause still active
  });
});

describe('useRewardedAd — idle-reset hygiene', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    showRewardedMock.mockReset();
    localStorage.clear();
  });
  afterEach(() => { vi.useRealTimers(); });

  it('a stale completed→idle timer does not clobber a freshly started session', async () => {
    let capturedOnReward: (() => void) | null = null;
    showRewardedMock.mockImplementation((onReward: () => void) => { capturedOnReward = onReward; });
    const { result } = renderHook(() => useRewardedAd({ rewardKind: 'feature' }));

    // First session completes → schedules a 1500ms completed→idle reset.
    act(() => { result.current.showAd(); });
    await act(async () => { capturedOnReward!(); await Promise.resolve(); });
    expect(result.current.status).toBe('completed');

    // New session starts BEFORE the stale 1500ms reset fires.
    act(() => { vi.advanceTimersByTime(500); });
    act(() => { result.current.showAd(); });
    expect(result.current.status).toBe('showing');

    // The stale reset's original deadline passes — it must NOT flip the live
    // session back to 'idle'.
    act(() => { vi.advanceTimersByTime(1200); });
    expect(result.current.status).toBe('showing');
  });
});
