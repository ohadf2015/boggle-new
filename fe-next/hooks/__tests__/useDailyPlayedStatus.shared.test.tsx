import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { DAILY_STREAK_KEY, getWordHuntResultKey } from '@/utils/dailyChallenge/constants';

const auth = vi.hoisted(() => ({
  value: { user: { id: 'u1' } as { id: string } | null, isAuthenticated: true, loading: false },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth.value }));

import { useDailyPlayedStatus, __resetDailyPlayedStatusStore } from '../useDailyPlayedStatus';

const answer = (today: Partial<Record<'wordHunt' | 'wordWheel' | 'wordTower' | 'connections', boolean>>, current = 3) => ({
  today: { wordHunt: false, wordWheel: false, wordTower: false, connections: false, ...today },
  streak: { current, longest: 9 },
  allCompletedDates: ['2026-10-29'],
  freezeCount: 0,
  loading: false,
  fromServer: true,
});

function stubFetch(...bodies: object[]) {
  const queue = [...bodies];
  const fn = vi.fn(async () => {
    const body = queue.length > 1 ? queue.shift() : queue[0];
    return new Response(JSON.stringify(body), { status: 200 });
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('useDailyPlayedStatus — one shared status for every consumer', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetDailyPlayedStatusStore();
    auth.value = { user: { id: 'u1' }, isAuthenticated: true, loading: false };
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('given the hub header and the hub body both mount, then /api/daily/status is fetched once', async () => {
    const fetchMock = stubFetch(answer({ wordWheel: true }));
    const a = renderHook(() => useDailyPlayedStatus());
    const b = renderHook(() => useDailyPlayedStatus());
    await waitFor(() => expect(a.result.current.loading).toBe(false));
    await waitFor(() => expect(b.result.current.loading).toBe(false));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(b.result.current.today.wordWheel).toBe(true);
  });

  it('given auth is still resolving, then it stays loading and neither fetches nor reports guest flags', async () => {
    localStorage.setItem(getWordHuntResultKey('en', new Date().toISOString().slice(0, 10)), '{}');
    auth.value = { user: null, isAuthenticated: false, loading: true };
    const fetchMock = stubFetch(answer({}));
    const { result, rerender } = renderHook(() => useDailyPlayedStatus());
    expect(result.current.loading).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();

    auth.value = { user: { id: 'u1' }, isAuthenticated: true, loading: false };
    rerender();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('given a resolved status, when refresh() runs, then it never flips back to loading and every consumer sees the new answer', async () => {
    stubFetch(answer({}), answer({ wordHunt: true }, 4));
    const a = renderHook(() => useDailyPlayedStatus());
    const b = renderHook(() => useDailyPlayedStatus());
    await waitFor(() => expect(a.result.current.loading).toBe(false));

    const seenLoading: boolean[] = [];
    let pending: Promise<void> | undefined;
    act(() => { pending = a.result.current.refresh(); });
    seenLoading.push(a.result.current.loading, b.result.current.loading);
    await act(async () => { await pending; });

    expect(seenLoading).toEqual([false, false]);
    expect(b.result.current.today.wordHunt).toBe(true);
    expect(b.result.current.streak.current).toBe(4);
  });

  it('given a refresh fails after a good answer, then the last good answer stays on screen', async () => {
    const fetchMock = stubFetch(answer({ wordWheel: true }, 5));
    const { result } = renderHook(() => useDailyPlayedStatus());
    await waitFor(() => expect(result.current.loading).toBe(false));
    fetchMock.mockImplementation(async () => new Response('{}', { status: 500 }));
    await act(async () => { await result.current.refresh(); });
    expect(result.current.today.wordWheel).toBe(true);
    expect(result.current.streak.current).toBe(5);
  });

  it('given the tab comes back on a new UTC day, then yesterday\'s played flags are dropped', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-30T23:59:00Z'));
    auth.value = { user: null, isAuthenticated: false, loading: false };
    localStorage.setItem(getWordHuntResultKey('en', '2026-10-30'), '{}');
    const { result } = renderHook(() => useDailyPlayedStatus());
    expect(result.current.today.wordHunt).toBe(true);

    act(() => {
      vi.setSystemTime(new Date('2026-10-31T00:01:00Z'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current.today.wordHunt).toBe(false);
  });

  it('given a guest who has never finished a daily, hasPlayedBefore is false; after one, true', () => {
    auth.value = { user: null, isAuthenticated: false, loading: false };
    const fresh = renderHook(() => useDailyPlayedStatus());
    expect(fresh.result.current.hasPlayedBefore).toBe(false);
    fresh.unmount();

    localStorage.setItem(DAILY_STREAK_KEY, JSON.stringify({ currentStreak: 0, longestStreak: 1, lastPlayedDate: '2026-01-01', totalDailiesCompleted: 1 }));
    const returning = renderHook(() => useDailyPlayedStatus());
    expect(returning.result.current.hasPlayedBefore).toBe(true);
  });
});
