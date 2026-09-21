import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
vi.mock('@/utils/authFetch', () => ({ fetchWithAuth: (url: string, init?: RequestInit) => fetch(url, init) }));

import { useAdventureRun } from '../useAdventureRun';
import { getPlayLevel } from '@/lib/adventure/play/levels';
import { eliteTrophy } from '@/lib/adventure/play/trophy';

const grid = [
  ['c', 'a', 't', 's'],
  ['o', 'a', 'x', 'x'],
  ['d', 'o', 'g', 'x'],
  ['x', 'x', 'x', 'x'],
];
const dict = new Set(["cat", "cats", "dog", "toad", "coats"]);
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
const hook = (level = 4) => renderHook(() => useAdventureRun({ world: 1, level, language: 'en', isWord }));

describe('useAdventureRun — combat feed', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    localStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it('given an elite fight, when a word lands, then combatFx logs its damage so the stage can react', async () => {
    mockApi({ level: getPlayLevel(1, 4), run: pubRun({ step: 4 }) });
    const { result } = hook();
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    act(() => result.current.begin());
    expect(result.current.combatFx).toEqual([]);
    await act(async () => { await result.current.submitWord('cat'); });
    const last = result.current.combatFx[result.current.combatFx.length - 1];
    expect(last.fx).toContain('damage');
    expect(last.id).toBeGreaterThan(0);
  });

  it('given many ticks, when fx pile up, then the feed keeps only the latest entries with rising ids', async () => {
    mockApi({ level: getPlayLevel(1, 4), run: pubRun({ step: 4 }) });
    const { result } = hook();
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    act(() => result.current.begin());
    for (const w of ['cat', 'cats', 'dog', 'toad', 'coats']) await act(async () => { await result.current.submitWord(w); });
    const feed = result.current.combatFx;
    expect(feed.length).toBeLessThanOrEqual(8);
    expect(feed.map((e) => e.id)).toEqual([...feed.map((e) => e.id)].sort((a, b) => a - b));
  });

  it('given a fight with no frozen tiles, when the clock ticks, then `frozen` keeps its identity (the board memo holds)', async () => {
    mockApi({ level: getPlayLevel(1, 4), run: pubRun({ step: 4 }) });
    const { result } = hook();
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    act(() => result.current.begin());
    const before = result.current.frozen;
    const combatBefore = result.current.combat;
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(result.current.combat).not.toBe(combatBefore); // the fight did tick
    expect(result.current.frozen).toBe(before);
  });

  it('given an ordinary fight, when a word lands, then it hits the rival (a non-lethal foe script)', async () => {
    mockApi({ level: getPlayLevel(1, 1) });
    const { result } = hook(1);
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    act(() => result.current.begin());
    expect(result.current.combat?.script.id).toBe('foe-w1');
    expect(result.current.combat?.script.rules?.nonLethal).toBe(true);
    await act(async () => { await result.current.submitWord('cat'); });
    expect(result.current.combatFx.flatMap((e) => e.fx)).toContain('damage');
  });
});

describe('useAdventureRun — kill trophy', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    localStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it('given an elite, when the killing word lands, then the minted trophy is exposed and joins the shown relics', async () => {
    const minted = eliteTrophy(1, ['magnet']);
    mockApi({
      level: { ...getPlayLevel(1, 4), bossHp: 3, enemyHp: 3 }, run: pubRun({ step: 4, relics: ['magnet'] }),
      complete: { success: true, won: true, stars: 1, rewards: [], score: 3, validWords: ['cats'], bestStars: 1, totalStars: 1, trophy: minted },
    });
    const { result } = hook();
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    act(() => result.current.begin());
    expect(result.current.trophy).toBeNull();
    await act(async () => { await result.current.submitWord('cats'); });
    expect(result.current.combat?.defeated).toBe(true);
    expect(result.current.trophy).toBe(minted);
    expect(result.current.runShown?.relics).toEqual(['magnet', minted]);
  });

  it('given the server rejects the kill (lost), when the result lands, then the trophy is withdrawn', async () => {
    mockApi({
      level: { ...getPlayLevel(1, 4), bossHp: 3, enemyHp: 3 }, run: pubRun({ step: 4 }),
      complete: { success: true, won: false, stars: 0, rewards: [], score: 0, validWords: [], bestStars: 0, totalStars: 0, runOver: true },
    });
    const { result } = hook();
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    act(() => result.current.begin());
    await act(async () => { await result.current.submitWord('cats'); });
    await waitFor(() => expect(result.current.phase).toBe('done'));
    expect(result.current.trophy).toBeNull();
    expect(result.current.runShown?.relics).toEqual([]);
  });

  it('given a boss, when it falls, then no relic is minted (the run ends)', async () => {
    mockApi({ level: { ...getPlayLevel(1, 7), bossHp: 3, enemyHp: 3 }, run: pubRun({ step: 7 }) });
    const { result } = hook(7);
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    act(() => result.current.begin());
    await act(async () => { await result.current.submitWord('cats'); });
    expect(result.current.trophy).toBeNull();
  });
});
