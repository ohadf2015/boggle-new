/**
 * Tests for useAdminDashboard polling + tab visibility gating.
 * Goal: stop the 30s background poll when the admin tab is hidden so we
 * don't burn server load + bandwidth on dashboards no one is looking at.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAdminDashboard } from '../useAdminDashboard';

const okJson = (body: unknown) => Promise.resolve({
  ok: true,
  json: () => Promise.resolve(body),
});

const STATS = {
  overview: { totalPlayers: 1, totalGames: 1, totalWords: 1, totalGameTimeHours: 1 },
  activity: { gamesToday: 1, uniquePlayersToday: 1, uniquePlayersWeek: 1, uniquePlayersMonth: 1, signupsToday: 1, signupsWeek: 1 },
  languages: { en: 1 },
};
const HEALTH = { redis: 'ok', database: 'ok', process: { heapMB: 100, uptimeSeconds: 60 } };

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (hidden ? 'hidden' : 'visible') });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('useAdminDashboard — tab visibility gate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/system/health')) return okJson(HEALTH);
      return okJson(STATS);
    }) as unknown as typeof fetch;
    setHidden(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does an initial fetch and starts the 30s poll', async () => {
    renderHook(() => useAdminDashboard('tok'));
    // initial fetch fires synchronously inside useEffect
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

    // advance 30s — should fetch again (stats + health)
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(4);
  });

  it('skips the scheduled fetch while document.hidden', async () => {
    renderHook(() => useAdminDashboard('tok'));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

    setHidden(true);
    await act(async () => {
      vi.advanceTimersByTime(30_000);
      vi.advanceTimersByTime(30_000);
    });

    // Still only the initial 2 calls — no scheduled refresh while hidden.
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2);
  });

  it('refetches immediately when the tab becomes visible again', async () => {
    renderHook(() => useAdminDashboard('tok'));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

    setHidden(true);
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2);

    setHidden(false);
    // Becoming visible should trigger one more refresh (stats + health).
    await waitFor(() => {
      expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(4);
    });
  });
});
