/**
 * Integration seams BETWEEN the level half of a run and the map half: what the
 * hook carries forward once a node is settled. These only bite when the run
 * moves on WITHOUT remounting (map → node → map), which is the real flow.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
vi.mock('@/utils/authFetch', () => ({ fetchWithAuth: (url: string, init?: RequestInit) => fetch(url, init) }));

import { useAdventureRun } from '../useAdventureRun';
import { getPlayLevel } from '@/lib/adventure/play/levels';
import { runStorageKey } from '../runStorage';

const grid = [
  ['c', 'a', 't', 's'],
  ['o', 'x', 'x', 'x'],
  ['d', 'o', 'g', 'x'],
  ['x', 'x', 'x', 'x'],
];
const isWord = async (w: string) => new Set(['cat', 'cats', 'dog']).has(w);
const pubRun = (over: Record<string, unknown> = {}) => ({
  v: 2, w: 1, step: 1, node: 'r0l0', path: ['r0l0'], hp: 5, maxHp: 5,
  relics: [], potions: { heal: 0, time: 0, cleanse: 0, insight: 0 }, gold: 0, ...over,
});
const map = {
  world: 1, rows: 8,
  nodes: [
    { id: 'r0l0', row: 0, lane: 0, kind: 'fight', level: 1 },
    { id: 'r1l0', row: 1, lane: 0, kind: 'shop' },
  ],
  edges: [{ from: 'r0l0', to: 'r1l0' }],
};

function mockApi(complete: Record<string, unknown>) {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(init.body as string) : null;
    calls.push({ url, body });
    if (url.includes('/node')) {
      return new Response(JSON.stringify({
        runToken: 'rt-node', run: pubRun({ node: null }), currentNode: null, reachable: ['r0l0'], map, node: null,
      }));
    }
    if (url.includes('/start')) {
      return new Response(JSON.stringify({
        token: 'tok', grid, language: 'en', level: getPlayLevel(1, 1), run: pubRun(),
        runToken: 'rt-start', currentNode: 'r0l0', reachable: ['r1l0'], map, hints: ['cat'],
      }));
    }
    return new Response(JSON.stringify(complete));
  }) as unknown as typeof fetch;
  return calls;
}

const won = {
  success: true, won: true, stars: 2, bestStars: 2, totalStars: 2, score: 10, rewards: [], validWords: ['cat'],
  nextRunToken: 'rt-next', nextRun: pubRun({ gold: 45 }), offer: [{ type: 'relic', id: 'short-sword' }],
};
const lost = { success: true, won: false, stars: 0, bestStars: 0, totalStars: 0, score: 1, rewards: [], validWords: [], runOver: true };

const play = async () => {
  const { result } = renderHook(() => useAdventureRun({ world: 1, level: 1, language: 'en', isWord }));
  await waitFor(() => expect(result.current.phase).toBe('ready'));
  act(() => result.current.begin());
  return result;
};

describe('useAdventureRun — level → map handover', () => {
  beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); sessionStorage.clear(); });
  afterEach(() => vi.useRealTimers());

  it('given a cleared node, when the map is opened without a remount, then it carries the NEXT run token', async () => {
    const calls = mockApi(won);
    const result = await play();
    await act(async () => { await result.current.finish(); });
    await waitFor(() => expect(result.current.phase).toBe('done'));

    calls.length = 0;
    await act(async () => { result.current.openMap(); });
    await waitFor(() => expect(result.current.phase).toBe('map'));
    expect(calls[0].url).toContain('/node');
    expect(calls[0].body.runToken).toBe('rt-next');
  });

  it('given a lost run, when the map is opened, then no dead run token is sent and a fresh run is minted', async () => {
    const calls = mockApi(lost);
    const result = await play();
    await act(async () => { await result.current.finish({ died: true }); });
    await waitFor(() => expect(result.current.phase).toBe('done'));
    expect(sessionStorage.getItem(runStorageKey(1))).toBeNull();

    calls.length = 0;
    await act(async () => { result.current.openMap(); });
    await waitFor(() => expect(result.current.phase).toBe('map'));
    expect(calls[0].body.runToken).toBeUndefined();
  });

  it('given any run, when newRun() is called, then the stored run is dropped and a fresh one is minted', async () => {
    const calls = mockApi(won);
    const result = await play();
    await waitFor(() => expect(sessionStorage.getItem(runStorageKey(1))).not.toBeNull());

    calls.length = 0;
    await act(async () => { result.current.newRun(); });
    await waitFor(() => expect(result.current.phase).toBe('map'));
    expect(calls[0].url).toContain('/node');
    expect(calls[0].body.runToken).toBeUndefined();
  });
});

/**
 * Run over → "New run" happens IN PLACE (no remount). Before this, `newRun()`
 * reset a hand-picked subset of the run and left the per-level state behind:
 * the dead run's words and score showed up on the first board of the new run,
 * and `finishingRef` stayed latched, so that board's K.O. never settled —
 * a live dead end with no result screen and no way forward.
 */
describe('useAdventureRun — new run after a run over', () => {
  beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); sessionStorage.clear(); });
  afterEach(() => vi.useRealTimers());

  it('given a settled run, when newRun() mints a fresh one, then the last level leaves no words or score behind', async () => {
    mockApi(lost);
    const result = await play();
    await act(async () => { await result.current.submitWord('cat'); });
    expect(result.current.words).toEqual(['cat']);
    await act(async () => { await result.current.finish(); });
    await waitFor(() => expect(result.current.phase).toBe('done'));

    await act(async () => { result.current.newRun(); });
    await waitFor(() => expect(result.current.phase).toBe('map'));
    expect(result.current.words).toEqual([]);
    expect(result.current.score).toBe(0);
    expect(result.current.result).toBeNull();
  });

  it('given a settled run, when newRun() mints a fresh one, then the next node can still be finished', async () => {
    mockApi(lost);
    const result = await play();
    await act(async () => { await result.current.finish(); });
    await waitFor(() => expect(result.current.phase).toBe('done'));

    await act(async () => { result.current.newRun(); });
    await waitFor(() => expect(result.current.phase).toBe('map'));
    await act(async () => { await result.current.chooseNode('r0l0'); });
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    act(() => result.current.begin());
    await act(async () => { await result.current.finish(); });
    await waitFor(() => expect(result.current.phase).toBe('done'));
  });
});
