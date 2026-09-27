import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
vi.mock('@/utils/authFetch', () => ({ fetchWithAuth: (url: string, init?: RequestInit) => fetch(url, init) }));

import { useAdventureRun } from '../useAdventureRun';
import { getPlayLevel } from '@/lib/adventure/play/levels';
import { wordPoints } from '@/lib/adventure/play/scoreRun';

const grid = [
  ['c', 'a', 't', 's'],
  ['o', 'x', 'x', 'x'],
  ['d', 'o', 'g', 'x'],
  ['x', 'x', 'x', 'x'],
];
const dict = new Set(['cat', 'cats', 'dog']);
const isWord = async (w: string) => dict.has(w);

function mockFetch(completeBody: Record<string, unknown> = { success: true, stars: 1, won: true, rewards: [], score: 10, validWords: ['cat'], bestStars: 1, totalStars: 1 }) {
  const calls: Array<{ url: string; body: unknown }> = [];
  global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(init.body as string) : null;
    calls.push({ url, body });
    if (url.includes('/start')) {
      return new Response(JSON.stringify({ token: 'tok', grid, language: 'en', level: getPlayLevel(1, 1) }));
    }
    return new Response(JSON.stringify(completeBody));
  }) as unknown as typeof fetch;
  return calls;
}

describe('useAdventureRun', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it('given a started run, when valid words are submitted, then score rises once per word', async () => {
    mockFetch();
    const { result } = renderHook(() => useAdventureRun({ world: 1, level: 1, language: 'en', isWord }));
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    act(() => result.current.begin());

    let r1 = '';
    let r2 = '';
    await act(async () => { r1 = await result.current.submitWord('CAT'); });
    await act(async () => { r2 = await result.current.submitWord('cat'); });
    expect(r1).toBe('ok');
    expect(r2).toBe('dup');
    expect(result.current.score).toBe(wordPoints('cat'));
  });

  it('given invalid words, when submitted, then they are rejected without scoring', async () => {
    mockFetch();
    const { result } = renderHook(() => useAdventureRun({ world: 1, level: 1, language: 'en', isWord }));
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    act(() => result.current.begin());
    let a = '';
    let b = '';
    let c = '';
    await act(async () => { a = await result.current.submitWord('at'); });
    await act(async () => { b = await result.current.submitWord('zzz'); });
    await act(async () => { c = await result.current.submitWord('god'); });
    expect([a, b, c]).toEqual(['short', 'invalid', 'invalid']);
    expect(result.current.score).toBe(0);
  });

  it('given the clock runs out, when time ends, then the word list is sent to /complete with the token', async () => {
    const calls = mockFetch();
    const { result } = renderHook(() => useAdventureRun({ world: 1, level: 1, language: 'en', isWord }));
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    act(() => result.current.begin());
    await act(async () => { await result.current.submitWord('dog'); });

    await act(async () => { vi.advanceTimersByTime(getPlayLevel(1, 1).seconds * 1000 + 500); });
    await waitFor(() => expect(result.current.phase).toBe('done'));
    const complete = calls.find((c) => c.url.includes('/complete'));
    expect(complete?.body).toEqual({ token: 'tok', words: ['dog'], at: [expect.any(Number)], /* the fight's rival landed 2 undefended hits */ hpLeft: 3, potionsUsed: {}, died: false, reviveUsed: false });
    expect(result.current.result?.stars).toBe(1);
  });

  it('given a boss level, when damage reaches HP, then the run ends early as a win', async () => {
    const boss = getPlayLevel(1, 7);
    global.fetch = vi.fn(async (url: string) =>
      url.includes('/start')
        ? new Response(JSON.stringify({ token: 't', grid, language: 'en', level: { ...boss, bossHp: wordPoints('cat') } }))
        : new Response(JSON.stringify({ success: true, stars: 3, won: true, rewards: ['boss-trophy-w1'], score: 10, validWords: ['cat'], bestStars: 3, totalStars: 3 })),
    ) as unknown as typeof fetch;
    const { result } = renderHook(() => useAdventureRun({ world: 1, level: 7, language: 'en', isWord }));
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    act(() => result.current.begin());
    expect(result.current.bossHp).toBe(wordPoints('cat'));
    await act(async () => { await result.current.submitWord('cat'); });
    await waitFor(() => expect(result.current.phase).toBe('done'));
    expect(result.current.bossHp).toBe(0);
  });

  it('given /start fails, when loading, then phase is error', async () => {
    global.fetch = vi.fn(async () => new Response('{}', { status: 403 })) as unknown as typeof fetch;
    const { result } = renderHook(() => useAdventureRun({ world: 1, level: 2, language: 'en', isWord }));
    await waitFor(() => expect(result.current.phase).toBe('error'));
  });
});
