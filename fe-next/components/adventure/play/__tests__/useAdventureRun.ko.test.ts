import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
vi.mock('@/utils/authFetch', () => ({ fetchWithAuth: (url: string, init?: RequestInit) => fetch(url, init) }));

import { useAdventureRun, FOE_KO_FINISH_MS } from '../useAdventureRun';
import { getPlayLevel } from '@/lib/adventure/play/levels';

// The foe on a normal level has HP = the top-star score (FoeTarget). Once it is
// K.O.'d the level must end — no dead clock left to wait out.
const grid = [
  ['c', 'a', 't', 's'],
  ['o', 'x', 'x', 'x'],
  ['d', 'o', 'g', 'x'],
  ['x', 'x', 'x', 'x'],
];
const dict = new Set(['cat', 'cats', 'dog', 'toad']);
const isWord = async (w: string) => dict.has(w);
const run = { w: 1, step: 1, hp: 5, maxHp: 5, relics: [], potions: { heal: 0, time: 0, cleanse: 0, insight: 0 }, gold: 0 };

function mockApi(level: unknown, targets?: string[]) {
  const calls: string[] = [];
  global.fetch = vi.fn(async (url: string) => {
    calls.push(url);
    if (url.includes('/start')) return new Response(JSON.stringify({ token: 'tok', grid, level, run, runToken: 'rt', hints: [], targets }));
    return new Response(JSON.stringify({ success: true, won: true, stars: 3, rewards: [], score: 1, validWords: [], bestStars: 3, totalStars: 3 }));
  }) as unknown as typeof fetch;
  return calls;
}

describe('useAdventureRun — foe K.O. ends a normal level', () => {
  beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); localStorage.clear(); });
  afterEach(() => vi.useRealTimers());

  it('given a classic level, when the score reaches the top star, then the level saves after the K.O. beat', async () => {
    const calls = mockApi({ ...getPlayLevel(1, 1), stars: [5, 8, 10] });
    const { result } = renderHook(() => useAdventureRun({ world: 1, level: 1, language: 'en', isWord }));
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    act(() => result.current.begin());
    await act(async () => { await result.current.submitWord('cats'); });
    await act(async () => { await result.current.submitWord('toad'); });
    expect(result.current.score).toBeGreaterThanOrEqual(10);
    expect(calls.some((u) => u.includes('/complete'))).toBe(false);
    await act(async () => { vi.advanceTimersByTime(FOE_KO_FINISH_MS + 50); });
    await waitFor(() => expect(calls.some((u) => u.includes('/complete'))).toBe(true));
  });

  it('given a classic level below the top star, when time passes, then it keeps playing', async () => {
    const calls = mockApi({ ...getPlayLevel(1, 1), stars: [5, 8, 999] });
    const { result } = renderHook(() => useAdventureRun({ world: 1, level: 1, language: 'en', isWord }));
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    act(() => result.current.begin());
    await act(async () => { await result.current.submitWord('cats'); });
    await act(async () => { vi.advanceTimersByTime(FOE_KO_FINISH_MS + 50); });
    expect(result.current.phase).toBe('playing');
    expect(calls.some((u) => u.includes('/complete'))).toBe(false);
  });

  it('given a hunt level at the top star, when the hunt goal is not met, then it keeps playing', async () => {
    const calls = mockApi({ ...getPlayLevel(1, 2), stars: [5, 8, 10], huntCount: 2 }, ['toad', 'dog', 'cat']);
    const { result } = renderHook(() => useAdventureRun({ world: 1, level: 2, language: 'en', isWord }));
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    act(() => result.current.begin());
    await act(async () => { await result.current.submitWord('cats'); });
    await act(async () => { await result.current.submitWord('toad'); });
    await act(async () => { vi.advanceTimersByTime(FOE_KO_FINISH_MS + 50); });
    expect(result.current.phase).toBe('playing');
    expect(calls.some((u) => u.includes('/complete'))).toBe(false);
  });
});
