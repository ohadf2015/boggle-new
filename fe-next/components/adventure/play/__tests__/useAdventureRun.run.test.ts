import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
vi.mock('@/utils/authFetch', () => ({ fetchWithAuth: (url: string, init?: RequestInit) => fetch(url, init) }));

import { useAdventureRun } from '../useAdventureRun';
import { getPlayLevel } from '@/lib/adventure/play/levels';
import { wordPoints } from '@/lib/adventure/play/scoreRun';
import { runStorageKey } from '../runStorage';

const grid = [
  ['c', 'a', 't', 's'],
  ['o', 'x', 'x', 'x'],
  ['d', 'o', 'g', 'x'],
  ['x', 'x', 'x', 'x'],
];
const dict = new Set(['cat', 'cats', 'dog', 'toad']);
const isWord = async (w: string) => dict.has(w);
const pubRun = (over: Record<string, unknown> = {}) => ({
  w: 1, step: 1, hp: 5, maxHp: 5, relics: [], potions: { heal: 1, time: 1, cleanse: 0, insight: 0 }, gold: 0, ...over,
});

interface MockOpts { level?: unknown; run?: unknown; complete?: Record<string, unknown>; hints?: string[]; targets?: string[] }
function mockApi(o: MockOpts = {}) {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(init.body as string) : null;
    calls.push({ url, body });
    if (url.includes('/start')) {
      return new Response(JSON.stringify({
        token: 'tok', grid, language: 'en', level: o.level ?? getPlayLevel(1, 1),
        run: o.run ?? pubRun(), runToken: 'rt-after-start', hints: o.hints ?? ['cat', 'dog', 'cats'], targets: o.targets,
      }));
    }
    return new Response(JSON.stringify(o.complete ?? { success: true, won: true, stars: 1, rewards: [], score: 1, validWords: [], bestStars: 1, totalStars: 1, runOver: true }));
  }) as unknown as typeof fetch;
  return calls;
}
const hook = (level = 1) => renderHook(() => useAdventureRun({ world: 1, level, language: 'en', isWord }));

describe('useAdventureRun — roguelike run', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    sessionStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it('given no stored run, when a level starts, then /start gets no runToken and the returned run is stored', async () => {
    const calls = mockApi();
    const { result } = hook();
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    expect(calls[0].body.runToken).toBeUndefined();
    expect(JSON.parse(sessionStorage.getItem(runStorageKey(1))!).runToken).toBe('rt-after-start');
    expect(result.current.run?.hp).toBe(5);
    expect(result.current.hintsLeft).toBe(2);
  });

  it('given a stored run with an offer for this level, when mounted, then it drafts first and sends the pick', async () => {
    sessionStorage.setItem(runStorageKey(1), JSON.stringify({ runToken: 'rt-2', run: pubRun({ step: 2, offer: [{ type: 'gold', amount: 5 }, { type: 'relic', id: 'magnet' }] }) }));
    const calls = mockApi({ level: getPlayLevel(1, 2), run: pubRun({ step: 2, relics: ['magnet'] }), targets: ['cats', 'toad', 'dog'] });
    const { result } = hook(2);
    await waitFor(() => expect(result.current.phase).toBe('draft'));
    expect(result.current.offer).toHaveLength(2);
    expect(calls).toHaveLength(0);
    act(() => result.current.choosePick(1));
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    expect(calls[0].body).toMatchObject({ runToken: 'rt-2', pick: 1, world: 1, level: 2 });
    expect(result.current.targets).toEqual(['cats', 'toad', 'dog']);
  });

  it('given relics in the run, when words land, then the HUD score uses the same relic formula as the server', async () => {
    mockApi({ run: pubRun({ relics: ['twin-ink'] }) });
    const { result } = hook();
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    act(() => result.current.begin());
    await act(async () => { await result.current.submitWord('dog'); });
    await act(async () => { await result.current.submitWord('cat'); });
    expect(result.current.score).toBe(wordPoints('dog') * 2 + wordPoints('cat'));
    expect(result.current.points).toEqual([wordPoints('dog') * 2, wordPoints('cat')]);
  });

  it('given a win with a next run, when completed, then the next run + offer are stored; a run-over clears storage', async () => {
    mockApi({ complete: { success: true, won: true, stars: 1, rewards: [], score: 1, validWords: ['dog'], bestStars: 1, totalStars: 1,
      nextRunToken: 'rt-next', nextRun: pubRun({ step: 2, offer: [{ type: 'gold', amount: 5 }] }), offer: [{ type: 'gold', amount: 5 }], runOver: false } });
    const { result } = hook();
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    act(() => result.current.begin());
    await act(async () => { await result.current.finish(); });
    await waitFor(() => expect(result.current.phase).toBe('done'));
    const stored = JSON.parse(sessionStorage.getItem(runStorageKey(1))!);
    expect(stored).toMatchObject({ runToken: 'rt-next', run: { step: 2 } });

    mockApi();
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    act(() => result.current.begin());
    await act(async () => { await result.current.finish(); });
    await waitFor(() => expect(result.current.phase).toBe('done'));
    expect(sessionStorage.getItem(runStorageKey(1))).toBeNull();
  });

  it('given an elite fight, when the enemy lands a lethal hit, then the run reports died', async () => {
    const calls = mockApi({ level: getPlayLevel(1, 4), run: pubRun({ step: 4, hp: 1 }) });
    const { result } = hook(4);
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    act(() => result.current.begin());
    expect(result.current.combat?.hp).toBe(1);
    await act(async () => { vi.advanceTimersByTime(90_000); });
    await waitFor(() => expect(calls.some((c) => c.url.includes('/complete'))).toBe(true));
    expect(calls.find((c) => c.url.includes('/complete'))?.body).toMatchObject({ died: true, hpLeft: 0 });
  });

  it('given hint charges, when a hint is taken, then it returns an unfound hint word and spends a charge', async () => {
    mockApi({ hints: ['cat', 'dog'] });
    const { result } = hook();
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    act(() => result.current.begin());
    await act(async () => { await result.current.submitWord('cat'); });
    let h: string | null = null;
    act(() => { h = result.current.takeHint(); });
    expect(h).toBe('dog');
    expect(result.current.hintsLeft).toBe(1);
  });

  it('given a time potion, when drunk, then the clock grows and the use is reported', async () => {
    const calls = mockApi();
    const { result } = hook();
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    act(() => result.current.begin());
    const before = result.current.msLeft;
    let ok = false;
    act(() => { ok = result.current.drinkPotion('time'); });
    expect(ok).toBe(true);
    await act(async () => { vi.advanceTimersByTime(400); });
    expect(result.current.msLeft).toBeGreaterThan(before);
    expect(result.current.potionsLeft.time).toBe(0);
    let again = true;
    act(() => { again = result.current.drinkPotion('time'); });
    expect(again).toBe(false);
    await act(async () => { await result.current.finish(); });
    expect(calls.find((c) => c.url.includes('/complete'))?.body.potionsUsed).toEqual({ time: 1 });
  });

  it('given a chain level, when a word does not chain, then it is rejected', async () => {
    mockApi({ level: getPlayLevel(2, 2) });
    const { result } = renderHook(() => useAdventureRun({ world: 2, level: 2, language: 'en', isWord }));
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    act(() => result.current.begin());
    let a = '';
    let b = '';
    await act(async () => { a = await result.current.submitWord('cat'); });
    await act(async () => { b = await result.current.submitWord('dog'); });
    expect([a, b]).toEqual(['ok', 'chain']);
    expect(result.current.chainLetter).toBe('t');
  });
});
