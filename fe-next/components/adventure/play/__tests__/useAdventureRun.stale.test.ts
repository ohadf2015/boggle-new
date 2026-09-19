import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
vi.mock('@/utils/authFetch', () => ({ fetchWithAuth: (url: string, init?: RequestInit) => fetch(url, init) }));

import { useAdventureRun, STALE_DEAL_MS } from '../useAdventureRun';
import { getPlayLevel } from '@/lib/adventure/play/levels';

// The server's attempt clock starts at /start (the deal); the player's clock starts
// at Start. A player who lingers on the chapter / rule cards would otherwise save
// past the server window (409 'expired') and lose the level.
const grid = [['c', 'a', 't', 's'], ['o', 'x', 'x', 'x'], ['d', 'o', 'g', 'x'], ['x', 'x', 'x', 'x']];
const isWord = async (w: string) => ['cat', 'dog'].includes(w);
const run = { w: 1, step: 1, hp: 5, maxHp: 5, relics: [], potions: { heal: 0, time: 0, cleanse: 0, insight: 0 }, gold: 0 };

function mockApi() {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  let deal = 0;
  global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(init.body as string) : {};
    calls.push({ url, body });
    if (url.includes('/start')) {
      deal += 1;
      return new Response(JSON.stringify({ token: `tok-${deal}`, grid, level: getPlayLevel(1, 1), run, runToken: `rt-${deal}`, hints: [] }));
    }
    return new Response(JSON.stringify({ success: true, won: true, stars: 1, rewards: [], score: 1, validWords: [], bestStars: 1, totalStars: 1 }));
  }) as unknown as typeof fetch;
  return calls;
}

describe('useAdventureRun — stale deal', () => {
  beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); sessionStorage.clear(); });
  afterEach(() => vi.useRealTimers());

  it('given the intro lingered past the stale window, when Start is tapped, then the level is re-dealt on the same run and then plays', async () => {
    const calls = mockApi();
    const { result } = renderHook(() => useAdventureRun({ world: 1, level: 1, language: 'en', isWord }));
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    await act(async () => { vi.advanceTimersByTime(STALE_DEAL_MS + 1000); });
    act(() => result.current.begin());
    await waitFor(() => expect(result.current.phase).toBe('playing'));
    const starts = calls.filter((c) => c.url.includes('/start'));
    expect(starts).toHaveLength(2);
    expect(starts[1].body.runToken).toBe('rt-1');
    expect(starts[1].body.pick).toBeUndefined();
    await act(async () => { await result.current.submitWord('cat'); });
    await act(async () => { await result.current.finish(); });
    expect(calls.find((c) => c.url.includes('/complete'))!.body.token).toBe('tok-2');
  });

  it('given a quick Start, when tapped, then it plays the dealt board without a second /start', async () => {
    const calls = mockApi();
    const { result } = renderHook(() => useAdventureRun({ world: 1, level: 1, language: 'en', isWord }));
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    act(() => result.current.begin());
    expect(result.current.phase).toBe('playing');
    expect(calls.filter((c) => c.url.includes('/start'))).toHaveLength(1);
  });
});
