import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BlastResultsData } from '../../types';

const publishLevelUp = vi.hoisted(() => vi.fn());
vi.mock('@/lib/avatar/revealTrigger', () => ({ publishLevelUp }));
vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({ auth: { getSession: async () => ({ data: { session: { access_token: 't', user: { id: 'u1' } } } }) } }),
}));

import { saveBlastResult } from '../saveBlastResult';

const results = {
  finalScore: 500, tilesCleared: 20, totalTiles: 25, clearPercentage: 80,
  wordsFound: ['hello'], bestWord: 'hello', maxCombo: 3, stars: 2,
} as unknown as BlastResultsData;

describe('saveBlastResult — level-ups', () => {
  beforeEach(() => {
    publishLevelUp.mockClear();
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  it('announces the level-up the server returned', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ levelUp: { oldLevel: 4, newLevel: 5 } }), { status: 200 }),
    );
    await saveBlastResult(results, 'medium', 'en');
    expect(publishLevelUp).toHaveBeenCalledWith({ oldLevel: 4, newLevel: 5 }, 'blast');
  });

  it('announces nothing without a level-up', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ levelUp: null }), { status: 200 }));
    await saveBlastResult(results, 'medium', 'en');
    expect(publishLevelUp).not.toHaveBeenCalled();
  });

  it('hands the server XP to the results screen', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ xpAwarded: 18, newTotalXp: 640 }), { status: 200 }));
    const patch = await saveBlastResult(results, 'medium', 'en');
    expect(patch?.xp).toEqual({ gained: 18, total: 640 });
  });
});
