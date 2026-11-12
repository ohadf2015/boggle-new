import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const auth = vi.hoisted(() => ({
  value: { user: { id: 'u1' } as { id: string } | null, isAuthenticated: true, loading: false },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth.value }));

import {
  useDailyPlayedStatus,
  revalidateDailyPlayedStatus,
  __resetDailyPlayedStatusStore,
} from '../useDailyPlayedStatus';

const ALL = { wordHunt: true, wordWheel: true, wordTower: true, connections: true };
const NONE = { wordHunt: false, wordWheel: false, wordTower: false, connections: false };
const answer = (date: string, today: typeof ALL) => ({
  date,
  today,
  streak: { current: 9, longest: 9 },
  allCompletedDates: [date],
  freezeCount: 0,
  loading: false,
  fromServer: true,
});

/**
 * The bug: an app left open overnight (Android WebView fires no focus or
 * visibility event on resume) kept yesterday's "all four played" answer as
 * today's, so the hub showed a finished day and its prize boxes, and the
 * server refused to open them.
 */
describe('useDailyPlayedStatus — a new UTC day never reuses yesterday', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetDailyPlayedStatusStore();
    auth.value = { user: { id: 'u1' }, isAuthenticated: true, loading: false };
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-11T21:10:00Z'));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('given yesterday was all played, when the page re-renders after midnight with no event, then it asks the server for today and stops reporting a finished day', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const day = new URL(url, 'https://x').searchParams.get('day') ?? '';
      return new Response(JSON.stringify(answer(day, day === '2026-11-11' ? ALL : NONE)), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result, rerender } = renderHook(() => useDailyPlayedStatus());
    await waitFor(() => expect(result.current.today).toEqual(ALL));

    vi.setSystemTime(new Date('2026-11-12T06:31:00Z'));
    rerender();

    expect(result.current.today).toEqual(NONE);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(String(fetchMock.mock.calls[1][0])).toContain('day=2026-11-12');
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.today).toEqual(NONE);
  });

  it('asks with no-store so a stored HTTP copy is never reused', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(answer('2026-11-11', NONE)), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    renderHook(() => useDailyPlayedStatus());
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: 'no-store' });
  });

  it('drops a server answer stamped with another day', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(answer('2026-11-10', ALL)), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useDailyPlayedStatus());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.today).toEqual(NONE);
  });

  it('revalidateDailyPlayedStatus() re-asks for the signed-in player', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(answer('2026-11-11', NONE)), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useDailyPlayedStatus());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await revalidateDailyPlayedStatus();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain('userId=u1');
  });

  it('given a request that never answers (app frozen mid-request), then a later ask after the stuck window starts a fresh one', async () => {
    let calls = 0;
    const fetchMock = vi.fn(() => {
      calls += 1;
      if (calls === 1) return new Promise<Response>(() => {});
      return Promise.resolve(new Response(JSON.stringify(answer('2026-11-11', NONE)), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    renderHook(() => useDailyPlayedStatus());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    vi.setSystemTime(new Date('2026-11-11T21:10:30Z'));
    await revalidateDailyPlayedStatus();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('given a signed-in session whose profile has not loaded, then it still asks the server', async () => {
    auth.value = { user: { id: 'u1' }, isAuthenticated: false, loading: false };
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(answer('2026-11-11', ALL)), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useDailyPlayedStatus());
    await waitFor(() => expect(result.current.fromServer).toBe(true));
    expect(result.current.today).toEqual(ALL);
  });
});
