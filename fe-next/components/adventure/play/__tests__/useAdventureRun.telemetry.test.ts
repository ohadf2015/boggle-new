// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const trackGameEnd = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGameStart: vi.fn(),
  trackGameEnd: (...a: unknown[]) => trackGameEnd(...a),
  trackGrowthEvent: vi.fn(),
}));
vi.mock('@/utils/authFetch', () => ({ fetchWithAuth: (url: string, init?: RequestInit) => fetch(url, init) }));

import { useAdventureRun } from '../useAdventureRun';
import { getPlayLevel } from '@/lib/adventure/play/levels';

const grid = [['c', 'a', 't', 's'], ['o', 'x', 'x', 'x'], ['d', 'o', 'g', 'x'], ['x', 'x', 'x', 'x']];
const pubRun = { v: 2, w: 1, step: 1, node: 'r0l0', path: ['r0l0'], hp: 5, maxHp: 5, relics: [], potions: { heal: 0, time: 0, cleanse: 0, insight: 0 }, gold: 0 };

function mockApi(complete: Record<string, unknown>) {
  global.fetch = vi.fn(async (url: string) => {
    if (url.includes('/start')) {
      return new Response(JSON.stringify({ token: 'tok', grid, level: getPlayLevel(1, 1), run: pubRun, runToken: 'rt', hints: [] }));
    }
    return new Response(JSON.stringify(complete));
  }) as unknown as typeof fetch;
}

async function playAndFinish(complete: Record<string, unknown>) {
  mockApi(complete);
  const { result } = renderHook(() => useAdventureRun({ world: 1, level: 1, language: 'en', isWord: async () => true }));
  await waitFor(() => expect(result.current.phase).toBe('ready'));
  act(() => result.current.begin());
  await act(async () => { await result.current.finish(); });
  await waitFor(() => expect(result.current.phase).toBe('done'));
}

describe('useAdventureRun — game end telemetry', () => {
  beforeEach(() => { localStorage.clear(); trackGameEnd.mockClear(); });
  afterEach(() => vi.restoreAllMocks());

  it('given a lost fight, when it settles, then it logs a completed game with isWinner false (not an abandon)', async () => {
    await playAndFinish({ success: true, won: false, stars: 0, bestStars: 0, totalStars: 0, score: 5, rewards: [], validWords: ['cat'], runOver: true });
    expect(trackGameEnd).toHaveBeenCalledTimes(1);
    const [, , , completed, , extras] = trackGameEnd.mock.calls[0];
    expect(completed).toBe(true);
    expect(extras).toMatchObject({ isWinner: false });
  });

  it('given a won fight, when it settles, then it logs a completed game with isWinner true', async () => {
    await playAndFinish({ success: true, won: true, stars: 2, bestStars: 2, totalStars: 2, score: 50, rewards: [], validWords: ['cat'] });
    const [, , , completed, , extras] = trackGameEnd.mock.calls[0];
    expect(completed).toBe(true);
    expect(extras).toMatchObject({ isWinner: true });
  });
});
