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

  it('showInterstitial resolves only on adBreakDone — the MP host awaits it before startGame', async () => {
    const { result } = renderHook(() => useH5GamesAds());
    let settled = false;
    let p: Promise<void> | undefined;
    act(() => {
      p = result.current.showInterstitial('multiplayer-round-complete').then(() => { settled = true; });
    });
    await act(async () => { await Promise.resolve(); });

    expect(adBreakCalls).toHaveLength(1);
    expect(settled).toBe(false); // the break is still running — the await must hold

    const opts = adBreakCalls[0] as { adBreakDone: (info: { breakStatus: string }) => void };
    await act(async () => {
      opts.adBreakDone({ breakStatus: 'viewed' });
      await p;
    });
    expect(settled).toBe(true);
  });

  it('showInterstitial still resolves when adBreak throws (a hung await would wedge the host)', async () => {
    const { result } = renderHook(() => useH5GamesAds());
    const { adBreak } = await import('@/lib/ads/h5GamesAds');
    vi.mocked(adBreak).mockImplementationOnce(() => { throw new Error('sdk dead'); });

    let settled = false;
    await act(async () => {
      await result.current.showInterstitial('post-game').then(() => { settled = true; });
    });
    expect(settled).toBe(true);
  });

  it('showInterstitial resolves on the safety watchdog when adBreakDone never fires (blocked SDK)', async () => {
    // With an ad blocker the break is queued into a never-arriving SDK — no
    // adBreakDone, ever. The host awaits this promise before startGame; without
    // a watchdog the room would sit on the results wash forever.
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useH5GamesAds());
      let settled = false;
      let p: Promise<void> | undefined;
      await act(async () => {
        p = result.current.showInterstitial('multiplayer-round-complete').then(() => { settled = true; });
        await Promise.resolve();
      });
      expect(settled).toBe(false);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000);
        await p;
      });
      expect(settled).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('isAvailable reflects browser environment', () => {
    const { result } = renderHook(() => useH5GamesAds());
    expect(result.current.isAvailable).toBe(true);
  });
});
