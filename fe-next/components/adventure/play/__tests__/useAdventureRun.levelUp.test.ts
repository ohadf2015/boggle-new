import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
vi.mock('@/utils/authFetch', () => ({ fetchWithAuth: (url: string, init?: RequestInit) => fetch(url, init) }));
const publishLevelUp = vi.fn();
vi.mock('@/lib/avatar/revealTrigger', async (orig) => ({ ...(await orig<object>()), publishLevelUp: (...a: unknown[]) => publishLevelUp(...a) }));

import { useAdventureRun } from '../useAdventureRun';
import { getPlayLevel } from '@/lib/adventure/play/levels';

const grid = [['c', 'a', 't', 's'], ['o', 'x', 'x', 'x'], ['d', 'o', 'g', 'x'], ['x', 'x', 'x', 'x']];
const isWord = async (w: string) => ['cat', 'dog'].includes(w);
const run = { v: 2, w: 1, step: 1, node: 'r0l0', path: ['r0l0'], hp: 5, maxHp: 5, relics: [], potions: { heal: 1, time: 1, cleanse: 0, insight: 0 }, gold: 0 };

function mockApi(complete: Record<string, unknown>) {
  global.fetch = vi.fn(async (url: string) => {
    if (url.includes('/start')) {
      return new Response(JSON.stringify({ token: 'tok', grid, language: 'en', level: getPlayLevel(1, 1), run, runToken: 'rt', hints: ['cat'] }));
    }
    return new Response(JSON.stringify({ success: true, won: true, stars: 1, rewards: [], score: 1, validWords: [], bestStars: 1, totalStars: 1, runOver: true, ...complete }));
  }) as unknown as typeof fetch;
}

async function finishLevel() {
  const { result } = renderHook(() => useAdventureRun({ world: 1, level: 1, language: 'en', isWord }));
  await waitFor(() => expect(result.current.phase).toBe('ready'));
  act(() => result.current.begin());
  await act(async () => { await result.current.finish(); });
  await waitFor(() => expect(result.current.phase).toBe('done'));
}

describe('useAdventureRun — level-up announcement', () => {
  beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); localStorage.clear(); publishLevelUp.mockClear(); });
  afterEach(() => vi.useRealTimers());

  it('given /complete reports a level-up, when the node finishes, then it is published as an adventure level-up', async () => {
    mockApi({ xpGained: 120, levelUp: { oldLevel: 4, newLevel: 5, levelsGained: 1, newTitles: [] } });
    await finishLevel();
    expect(publishLevelUp).toHaveBeenCalledWith({ oldLevel: 4, newLevel: 5 }, 'adventure');
  });

  it('given a level-up mid-run, when the node finishes, then it waits for the run to end and is announced once, merged', async () => {
    mockApi({ runOver: false, nextRunToken: 'rt2', nextRun: run, levelUp: { oldLevel: 4, newLevel: 5, levelsGained: 1, newTitles: [] } });
    await finishLevel();
    expect(publishLevelUp).not.toHaveBeenCalled();
    mockApi({ runComplete: true, levelUp: { oldLevel: 5, newLevel: 6, levelsGained: 1, newTitles: [] } });
    await finishLevel();
    expect(publishLevelUp).toHaveBeenCalledTimes(1);
    expect(publishLevelUp).toHaveBeenCalledWith({ oldLevel: 4, newLevel: 6 }, 'adventure');
  });

  it('given no level-up, when the node finishes, then nothing is announced', async () => {
    mockApi({ xpGained: 10 });
    await finishLevel();
    expect(publishLevelUp).not.toHaveBeenCalled();
  });
});
