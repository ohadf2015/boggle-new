import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
vi.mock('@/utils/authFetch', () => ({ fetchWithAuth: (url: string, init?: RequestInit) => fetch(url, init) }));

import { useAdventureRun } from '../useAdventureRun';
import { getPlayLevel } from '@/lib/adventure/play/levels';

const grid = [
  ['c', 'a', 't', 's'],
  ['o', 'x', 'x', 'x'],
  ['d', 'o', 'g', 'x'],
  ['x', 'x', 'x', 'x'],
];
const dict = new Set(['cat', 'cats', 'dog']);
const isWord = async (w: string) => dict.has(w);

function mockApi(targets: string[], hints: string[]) {
  global.fetch = vi.fn(async (url: string) => {
    if (url.includes('/start')) {
      return new Response(JSON.stringify({
        token: 'tok', grid, language: 'en', level: getPlayLevel(1, 2), runToken: 'rt',
        run: { w: 1, step: 2, hp: 5, maxHp: 5, relics: [], potions: { heal: 0, time: 0, cleanse: 0, insight: 0 }, gold: 0 },
        hints, targets,
      }));
    }
    return new Response(JSON.stringify({ success: true, won: false, stars: 0, rewards: [], score: 0, validWords: [], bestStars: 0, totalStars: 0, runOver: true }));
  }) as unknown as typeof fetch;
}

describe('useAdventureRun — hints on a hunt level', () => {
  beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); sessionStorage.clear(); });
  afterEach(() => vi.useRealTimers());

  it('given unfound hunt targets, when a hint is taken, then it points at a target, not a side word', async () => {
    mockApi(['cats', 'dog'], ['cat', 'dog']);
    const { result } = renderHook(() => useAdventureRun({ world: 1, level: 2, language: 'en', isWord }));
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    act(() => result.current.begin());
    let h: string | null = null;
    act(() => { h = result.current.takeHint(); });
    expect(h).toBe('cats');
    await act(async () => { await result.current.submitWord('cats'); });
    act(() => { h = result.current.takeHint(); });
    expect(h).toBe('dog');
  });

  it('given every target found, when a hint is taken, then it falls back to the hint pool', async () => {
    mockApi(['cats'], ['cat', 'dog']);
    const { result } = renderHook(() => useAdventureRun({ world: 1, level: 2, language: 'en', isWord }));
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    act(() => result.current.begin());
    await act(async () => { await result.current.submitWord('cats'); });
    let h: string | null = null;
    act(() => { h = result.current.takeHint(); });
    expect(h).toBe('cat');
  });
});

describe('useAdventureRun — bonus hint (deed drop)', () => {
  beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); sessionStorage.clear(); });
  afterEach(() => vi.useRealTimers());

  it('given a level in play, when a bonus hint is granted, then one more charge is available', async () => {
    mockApi(['cats'], ['cat', 'dog']);
    const { result } = renderHook(() => useAdventureRun({ world: 1, level: 2, language: 'en', isWord }));
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    const before = result.current.hintsLeft;
    act(() => { result.current.grantHint(); });
    expect(result.current.hintsLeft).toBe(before); // not playing yet: no drop
    act(() => result.current.begin());
    act(() => { result.current.grantHint(); });
    expect(result.current.hintsLeft).toBe(before + 1);
  });
});
