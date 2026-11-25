import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, isAuthenticated: true }),
}));

import { useDailyPlayedStatus, __resetDailyPlayedStatusStore } from '../useDailyPlayedStatus';

/*
 * An authed player starts on `loading: true` (the results CTA shows a skeleton
 * rather than guessing). A failed status fetch used to return without ever
 * clearing it, so the CTA stayed a skeleton forever.
 */
describe('useDailyPlayedStatus — failed fetch', () => {
  beforeEach(() => __resetDailyPlayedStatusStore());
  afterEach(() => vi.unstubAllGlobals());

  it('given the status endpoint answers non-OK, stops loading', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })));
    const { result } = renderHook(() => useDailyPlayedStatus());
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('given the status fetch throws, stops loading and says it failed', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    const { result } = renderHook(() => useDailyPlayedStatus());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.failed).toBe(true);
  });

  it('given a failed fetch, refresh asks again and a real answer clears the failure', async () => {
    const answer = {
      date: new Date().toISOString().slice(0, 10),
      today: { wordHunt: true, wordWheel: false, wordTower: false, connections: false },
      streak: { current: 4, longest: 9 },
      allCompletedDates: [],
      freezeCount: 0,
      fromServer: true,
    };
    const fetchMock = vi.fn(async () => { throw new DOMException('signal timed out', 'TimeoutError'); });
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useDailyPlayedStatus());
    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.streak.current).toBe(0);

    fetchMock.mockImplementation(async () => new Response(JSON.stringify(answer), { status: 200 }));
    await act(() => result.current.refresh());
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.failed).toBe(false);
    expect(result.current.streak.current).toBe(4);
  });
});
