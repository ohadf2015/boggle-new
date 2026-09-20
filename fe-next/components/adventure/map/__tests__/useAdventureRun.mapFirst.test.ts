import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
vi.mock('@/utils/authFetch', () => ({ fetchWithAuth: (url: string, init?: RequestInit) => fetch(url, init) }));

import { useAdventureRun } from '../../play/useAdventureRun';
import { runStorageKey } from '../../play/runStorage';
import { getPlayLevel } from '@/lib/adventure/play/levels';

const grid = [['c', 'a'], ['t', 's']];
const isWord = async () => true;
const map = {
  world: 1, rows: 8,
  nodes: [
    { id: 'r0l0', row: 0, lane: 0, kind: 'fight', level: 1 },
    { id: 'r1l0', row: 1, lane: 0, kind: 'shop' },
  ],
  edges: [{ from: 'r0l0', to: 'r1l0' }],
};
const pubRun = (over: Record<string, unknown> = {}) => ({
  v: 2, w: 1, step: 1, node: 'r0l0', path: ['r0l0'], hp: 5, maxHp: 5,
  relics: [], potions: { heal: 1, time: 0, cleanse: 0, insight: 0 }, gold: 0, ...over,
});

function mockApi() {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(init.body as string) : null;
    calls.push({ url, body });
    if (url.includes('/node')) {
      return new Response(JSON.stringify({
        runToken: 'rt-node', run: pubRun(), currentNode: 'r0l0', reachable: ['r1l0'], map, node: null,
      }));
    }
    if (url.includes('/start')) {
      return new Response(JSON.stringify({
        token: 'tok', grid, language: 'en', level: getPlayLevel(1, 1), nodeKind: 'fight',
        run: pubRun(), runToken: 'rt-start', currentNode: 'r0l0', reachable: ['r1l0'], map, hints: [],
      }));
    }
    return new Response(JSON.stringify({ success: true, won: true, stars: 1, rewards: [], score: 10, validWords: [], bestStars: 1, totalStars: 1 }));
  }) as unknown as typeof fetch;
  return calls;
}

const hook = () => renderHook(() => useAdventureRun({ world: 1, level: 1, language: 'en', isWord, mapFirst: true }));

describe('useAdventureRun — map-first entry', () => {
  beforeEach(() => { sessionStorage.clear(); });

  it('Given no stored run, when the screen opens map-first, then it opens the MAP instead of dealing a board', async () => {
    const calls = mockApi();
    const { result } = hook();
    await waitFor(() => expect(result.current.phase).toBe('map'));
    expect(calls.every((c) => !c.url.includes('/start'))).toBe(true);
    expect(result.current.map?.rows).toBe(8);
    expect(result.current.reachable).toEqual(['r1l0']);
  });

  it('Given a run in progress, when the screen opens, then the STORED token is sent — a fresh run is never minted over it', async () => {
    sessionStorage.setItem(runStorageKey(1), JSON.stringify({ runToken: 'rt-live', run: pubRun() }));
    const calls = mockApi();
    const { result } = hook();
    await waitFor(() => expect(result.current.phase).toBe('map'));
    expect(calls[0].url).toContain('/node');
    expect(calls[0].body.runToken).toBe('rt-live');
  });

  it('Given a fight node on the map, when it is chosen, then the board is dealt for THAT node', async () => {
    const calls = mockApi();
    const { result } = hook();
    await waitFor(() => expect(result.current.phase).toBe('map'));
    await act(async () => { await result.current.chooseNode('r0l0'); });
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    const start = calls.find((c) => c.url.includes('/start'))!;
    expect(start.body.nodeId).toBe('r0l0');
    expect(start.body.runToken).toBe('rt-node');
  });

  it('Given a non-play node, when it is chosen, then it resolves on the map endpoint, never on /start', async () => {
    const calls = mockApi();
    const { result } = hook();
    await waitFor(() => expect(result.current.phase).toBe('map'));
    await act(async () => { await result.current.chooseNode('r1l0'); });
    await waitFor(() => expect(calls.filter((c) => c.url.includes('/node')).length).toBe(2));
    expect(calls.some((c) => c.url.includes('/start'))).toBe(false);
    expect(calls[1].body.nodeId).toBe('r1l0');
  });

  it('Given a node that was just cleared, when the run continues, then the NEXT run token goes back to the map (the draft first)', async () => {
    mockApi();
    const { result } = hook();
    await waitFor(() => expect(result.current.phase).toBe('map'));
    // What /complete stored for the next node: a token plus a pending draft.
    sessionStorage.setItem(runStorageKey(1), JSON.stringify({
      runToken: 'rt-next', run: pubRun({ step: 2, offer: [{ type: 'gold', amount: 5 }] }),
    }));
    act(() => { result.current.retry(); });
    await waitFor(() => expect(result.current.phase).toBe('draft'));
    act(() => { result.current.choosePick(null); });
    await waitFor(() => expect(result.current.phase).toBe('map'));
  });
});
