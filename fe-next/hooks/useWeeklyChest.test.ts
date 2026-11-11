/**
 * useWeeklyChest Hook Tests
 *
 * Focus: request de-duplication. The homepage mounts this hook from multiple
 * components (LandingView + HomeDailyHero) in the same render pass. Without
 * dedup, each instance fires its own GET /api/daily/weekly-chest/status,
 * producing a burst of identical requests that each trigger a re-render and
 * pile main-thread long tasks during hydration.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// getWithAuth delegates to global.fetch so we can count calls.
vi.mock('@/utils/authFetch', () => ({
  getWithAuth: (...a: unknown[]) => (global.fetch as (...x: unknown[]) => unknown)(...a),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true, loading: false }),
}));

const okStatus = () => ({
  ok: true,
  json: () => Promise.resolve({ daysCompleted: 3, currentStreak: 3, isClaimable: false }),
});

describe('useWeeklyChest request de-duplication', () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn(() => Promise.resolve(okStatus())) as unknown as typeof fetch;
  });

  it('fires ONE status request when two instances mount together', async () => {
    const { useWeeklyChest } = await import('./useWeeklyChest');

    const a = renderHook(() => useWeeklyChest());
    const b = renderHook(() => useWeeklyChest());

    await waitFor(() => {
      expect(a.result.current.loading).toBe(false);
      expect(b.result.current.loading).toBe(false);
    });

    const statusCalls = (global.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls
      .filter(c => String(c[0]).includes('/api/daily/weekly-chest/status'));
    expect(statusCalls.length).toBe(1);
    // both instances still receive the data
    expect(a.result.current.daysCompleted).toBe(3);
    expect(b.result.current.daysCompleted).toBe(3);
  });

  it('still serves cached data to a late mount without refetching within TTL', async () => {
    const { useWeeklyChest } = await import('./useWeeklyChest');

    const a = renderHook(() => useWeeklyChest());
    await waitFor(() => expect(a.result.current.loading).toBe(false));

    const b = renderHook(() => useWeeklyChest());
    await waitFor(() => expect(b.result.current.loading).toBe(false));

    const statusCalls = (global.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls
      .filter(c => String(c[0]).includes('/api/daily/weekly-chest/status'));
    expect(statusCalls.length).toBe(1);
    expect(b.result.current.daysCompleted).toBe(3);
  });
});

describe('useWeeklyChest refreshes after a daily is played', () => {
  const statusCalls = () =>
    (global.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls.filter(c =>
      String(c[0]).includes('/api/daily/weekly-chest/status'),
    );

  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn(() => Promise.resolve(okStatus())) as unknown as typeof fetch;
  });

  it('refetches (bypassing the cache) when the retention streak records a play', async () => {
    const { useWeeklyChest } = await import('./useWeeklyChest');
    const { recordRetentionPlay, __resetRetentionStreakCache } = await import('@/lib/retention/streak');
    __resetRetentionStreakCache();
    const hook = renderHook(() => useWeeklyChest());
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    expect(statusCalls().length).toBe(1);

    act(() => {
      recordRetentionPlay('2099-01-01');
    });
    await waitFor(() => expect(statusCalls().length).toBe(2));
  });

  it('refetches when the tab becomes visible again', async () => {
    const { useWeeklyChest } = await import('./useWeeklyChest');
    const hook = renderHook(() => useWeeklyChest());
    await waitFor(() => expect(hook.result.current.loading).toBe(false));

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitFor(() => expect(statusCalls().length).toBe(2));
  });
});

describe('useWeeklyChest shares one account state', () => {
  it('a refresh in one instance updates every other mounted instance', async () => {
    vi.resetModules();
    let n = 0;
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ daysCompleted: 3, currentStreak: 3, isClaimable: n++ > 0 }),
      }),
    ) as unknown as typeof fetch;
    const { useWeeklyChest } = await import('./useWeeklyChest');
    const a = renderHook(() => useWeeklyChest());
    const b = renderHook(() => useWeeklyChest());
    await waitFor(() => expect(b.result.current.loading).toBe(false));
    expect(b.result.current.isClaimable).toBe(false);

    act(() => a.result.current.refresh(true));
    await waitFor(() => expect(b.result.current.isClaimable).toBe(true));
  });
});
