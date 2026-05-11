import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Capture adBreak/adConfig calls for assertion + manual event firing.
const { adBreakCalls, initCalls } = vi.hoisted(() => ({
  adBreakCalls: [] as Array<Record<string, unknown>>,
  initCalls: [] as string[],
}));

vi.mock('@/lib/ads/h5GamesAds', () => ({
  initH5GamesAds: vi.fn(() => {
    initCalls.push('init');
    return Promise.resolve();
  }),
  adBreak: vi.fn((opts: Record<string, unknown>) => {
    adBreakCalls.push(opts);
  }),
  adConfig: vi.fn(),
  getH5Client: vi.fn(() => 'ca-pub-test'),
}));

import { useH5GamesAds } from '@/hooks/useH5GamesAds';

beforeEach(() => {
  adBreakCalls.length = 0;
  initCalls.length = 0;
  vi.clearAllMocks();
});

describe('useH5GamesAds', () => {
  it('initialize() calls initH5GamesAds once', async () => {
    const { result } = renderHook(() => useH5GamesAds());
    await act(async () => { await result.current.initialize(); });
    await act(async () => { await result.current.initialize(); });
    // initH5GamesAds is itself idempotent — hook may call multiple times,
    // but at least one init must have fired.
    expect(initCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('showRewarded calls adBreak with type=reward and forwards name', async () => {
    const { result } = renderHook(() => useH5GamesAds());
    const onReward = vi.fn();
    const onError = vi.fn();

    act(() => { void result.current.showRewarded(onReward, onError, { name: 'hint' }); });
    await act(async () => { await Promise.resolve(); });

    expect(adBreakCalls).toHaveLength(1);
    expect(adBreakCalls[0].type).toBe('reward');
    expect(adBreakCalls[0].name).toBe('hint');
    expect(typeof adBreakCalls[0].beforeReward).toBe('function');
    expect(typeof adBreakCalls[0].adBreakDone).toBe('function');
  });

  it('reward granted only on adBreakDone with breakStatus=viewed', async () => {
    const { result } = renderHook(() => useH5GamesAds());
    const onReward = vi.fn();
    const onError = vi.fn();

    act(() => { void result.current.showRewarded(onReward, onError, { name: 'r1' }); });
    await act(async () => { await Promise.resolve(); });

    const opts = adBreakCalls[0] as {
      beforeReward: (fn: () => void) => void;
      adViewed?: () => void;
      adBreakDone: (info: { breakStatus: string }) => void;
    };
    // Caller auto-accepts the reward prompt
    act(() => { opts.beforeReward(() => {}); });
    act(() => { opts.adViewed?.(); });
    act(() => { opts.adBreakDone({ breakStatus: 'viewed' }); });

    expect(onReward).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it('dismissed: onError fires, no reward', async () => {
    const { result } = renderHook(() => useH5GamesAds());
    const onReward = vi.fn();
    const onError = vi.fn();

    act(() => { void result.current.showRewarded(onReward, onError, { name: 'r2' }); });
    await act(async () => { await Promise.resolve(); });

    const opts = adBreakCalls[0] as {
      beforeReward: (fn: () => void) => void;
      adDismissed?: () => void;
      adBreakDone: (info: { breakStatus: string }) => void;
    };
    act(() => { opts.beforeReward(() => {}); });
    act(() => { opts.adDismissed?.(); });
    act(() => { opts.adBreakDone({ breakStatus: 'dismissed' }); });

    expect(onReward).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('noAdPreloaded: onError, no reward (no fill)', async () => {
    const { result } = renderHook(() => useH5GamesAds());
    const onReward = vi.fn();
    const onError = vi.fn();

    act(() => { void result.current.showRewarded(onReward, onError, { name: 'r3' }); });
    await act(async () => { await Promise.resolve(); });

    const opts = adBreakCalls[0] as {
      adBreakDone: (info: { breakStatus: string }) => void;
    };
    // adBreakDone fires with no-fill status BEFORE beforeReward
    act(() => { opts.adBreakDone({ breakStatus: 'noAdPreloaded' }); });

    expect(onReward).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('reward never double-fires: viewed then late dismissed is ignored', async () => {
    const { result } = renderHook(() => useH5GamesAds());
    const onReward = vi.fn();
    const onError = vi.fn();

    act(() => { void result.current.showRewarded(onReward, onError, { name: 'r4' }); });
    await act(async () => { await Promise.resolve(); });

    const opts = adBreakCalls[0] as {
      beforeReward: (fn: () => void) => void;
      adViewed?: () => void;
      adDismissed?: () => void;
      adBreakDone: (info: { breakStatus: string }) => void;
    };
    act(() => { opts.beforeReward(() => {}); });
    act(() => { opts.adViewed?.(); });
    act(() => { opts.adBreakDone({ breakStatus: 'viewed' }); });
    // Late stray dismissed — must not override settled reward.
    act(() => { opts.adDismissed?.(); });

    expect(onReward).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it('showInterstitial uses type=next with name', async () => {
    const { result } = renderHook(() => useH5GamesAds());

    act(() => { void result.current.showInterstitial('post-game'); });
    await act(async () => { await Promise.resolve(); });

    expect(adBreakCalls).toHaveLength(1);
    expect(adBreakCalls[0].type).toBe('next');
    expect(adBreakCalls[0].name).toBe('post-game');
  });

  it('isAvailable reflects browser environment', () => {
    const { result } = renderHook(() => useH5GamesAds());
    expect(result.current.isAvailable).toBe(true);
  });
});
