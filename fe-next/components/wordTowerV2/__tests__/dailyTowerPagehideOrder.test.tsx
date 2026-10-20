/**
 * Real pagehide ordering for the daily tower.
 *
 * The abandon handler is installed at app mount (PostHogProvider), long before
 * Word Tower mounts. Chromium runs `window` listeners in registration order
 * even for capture listeners, so the daily lifecycle's own pagehide listener
 * ran AFTER the generic abandon: a daily climb with floors > 0 was logged as
 * `game_abandoned` and then `game_completed`. The completion must win.
 */
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const captureMock = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: { capture: (...args: unknown[]) => captureMock(...args) },
}));

const trackGameEnd = vi.fn();
vi.mock('@/utils/growthTracking', async () => {
  const abandon = await vi.importActual<typeof import('@/utils/abandonOnPagehide')>(
    '@/utils/abandonOnPagehide',
  );
  return {
    // Mirrors the real trackGameEnd: an end clears the active game.
    trackGameEnd: (...args: unknown[]) => {
      trackGameEnd(...args);
      abandon.markGameInactive();
    },
    trackGameStart: vi.fn(),
  };
});

import {
  __resetAbandonStateForTests,
  installAbandonOnPagehide,
  markGameActive,
} from '@/utils/abandonOnPagehide';
import { useDailyTowerLifecycle } from '../useDailyTowerLifecycle';

describe('daily tower pagehide vs generic abandon', () => {
  let uninstall: () => void;

  beforeEach(() => {
    captureMock.mockClear();
    trackGameEnd.mockClear();
    __resetAbandonStateForTests();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    // App mount: the abandon listener is registered first.
    uninstall = installAbandonOnPagehide();
    markGameActive('word-tower');
  });

  afterEach(() => {
    uninstall();
    vi.useRealTimers();
  });

  it('floors > 0: one game_completed, no game_abandoned', () => {
    const { unmount } = renderHook(() =>
      useDailyTowerLifecycle({ daily: true, floors: 2, peakM: 0, heightM: 6, score: 20 }),
    );
    vi.setSystemTime(new Date('2026-01-01T00:00:30Z'));
    window.dispatchEvent(new Event('pagehide'));
    unmount();

    expect(trackGameEnd).toHaveBeenCalledTimes(1);
    expect(trackGameEnd.mock.calls[0][3]).toBe(true);
    expect(captureMock.mock.calls.map((c) => c[0])).not.toContain('growth:game_abandoned');
  });

  it('Chromium order: the app-mount abandon handler runs first and must not log an abandon', () => {
    // Withhold the hook's own pagehide listener so only the abandon handler
    // (registered at app mount) sees the event — the order Chromium uses.
    const realAdd = window.addEventListener.bind(window);
    const addSpy = vi.spyOn(window, 'addEventListener').mockImplementation(((
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ) => {
      if (type === 'pagehide') return;
      realAdd(type, listener, options);
    }) as typeof window.addEventListener);
    const { unmount } = renderHook(() =>
      useDailyTowerLifecycle({ daily: true, floors: 3, peakM: 0, heightM: 9, score: 30 }),
    );
    addSpy.mockRestore();
    vi.setSystemTime(new Date('2026-01-01T00:00:30Z'));
    window.dispatchEvent(new Event('pagehide'));

    expect(captureMock.mock.calls.map((c) => c[0])).not.toContain('growth:game_abandoned');
    expect(trackGameEnd).toHaveBeenCalledTimes(1);
    expect(trackGameEnd.mock.calls[0][3]).toBe(true);
    expect(trackGameEnd.mock.calls[0][5]).toMatchObject({ daily: true, floors: 3, heightM: 9 });
    unmount();
    expect(trackGameEnd).toHaveBeenCalledTimes(1);
  });

  it('floors == 0: the generic abandon still fires', () => {
    const { unmount } = renderHook(() =>
      useDailyTowerLifecycle({ daily: true, floors: 0, peakM: 0, heightM: 0, score: 0 }),
    );
    vi.setSystemTime(new Date('2026-01-01T00:00:30Z'));
    window.dispatchEvent(new Event('pagehide'));
    unmount();

    expect(trackGameEnd).not.toHaveBeenCalled();
    expect(captureMock.mock.calls.map((c) => c[0])).toContain('growth:game_abandoned');
  });
});
