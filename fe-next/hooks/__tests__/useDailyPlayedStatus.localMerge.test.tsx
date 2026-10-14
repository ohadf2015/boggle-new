import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { getDailyChallengeDate } from '@/utils/dailyChallenge/dateUtils';
import { dailyBestKey } from '@/lib/wordTower/dailyBest';
import { utcDateKey } from '@/lib/wordTower/dailySeed';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, isAuthenticated: true }),
}));

import { useDailyPlayedStatus } from '../useDailyPlayedStatus';

const serverAnswer = (today: Partial<Record<'wordHunt' | 'wordWheel' | 'wordTower' | 'connections', boolean>>) => ({
  today: { wordHunt: false, wordWheel: false, wordTower: false, connections: false, ...today },
  streak: { current: 4, longest: 9 },
  allCompletedDates: [],
  freezeCount: 0,
  loading: false,
  fromServer: true,
});

/*
 * "Played today" is monotonic: once this device has a result for a mode, the
 * player HAS played it, whatever a lagging server write says. The server
 * answer used to REPLACE the local flags outright, so a just-finished Word
 * Tower / Connections (whose score post is fire-and-forget) was offered again
 * by the next-quest CTA and shown as unplayed on the hub.
 */
describe('useDailyPlayedStatus — authed: server answer merged with this device', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('given the server has not recorded a Word Tower climb this device made, still reports Word Tower as played', async () => {
    localStorage.setItem(dailyBestKey(utcDateKey()), '7');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(serverAnswer({ wordWheel: true })), { status: 200 })));
    const { result } = renderHook(() => useDailyPlayedStatus());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.today).toEqual({ wordHunt: false, wordWheel: true, wordTower: true, connections: false });
    expect(result.current.streak.current).toBe(4);
  });

  it('given the server says a mode is played that this device never saw, keeps the server answer', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(serverAnswer({ connections: true })), { status: 200 })));
    const { result } = renderHook(() => useDailyPlayedStatus());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.today.connections).toBe(true);
    expect(result.current.today.wordHunt).toBe(false);
  });

  it('given this device saved today\'s Connections, reports it even when the server lags', async () => {
    localStorage.setItem('connections-daily-played', getDailyChallengeDate());
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(serverAnswer({})), { status: 200 })));
    const { result } = renderHook(() => useDailyPlayedStatus());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.today.connections).toBe(true);
  });
});
