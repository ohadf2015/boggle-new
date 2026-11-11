import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BlastResultsData } from '../../types';

const announceLevelUp = vi.hoisted(() => vi.fn());
vi.mock('@/lib/levelUp/levelUpBus', () => ({ announceLevelUp }));
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
    announceLevelUp.mockClear();
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  it('announces the level-up the server returned', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ levelUp: { oldLevel: 4, newLevel: 5 } }), { status: 200 }),
    );
    await saveBlastResult(results, 'medium', 'en');
    expect(announceLevelUp).toHaveBeenCalledWith({ oldLevel: 4, newLevel: 5 }, 'blast');
  });

  it('announces nothing without a level-up', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ levelUp: null }), { status: 200 }));
    await saveBlastResult(results, 'medium', 'en');
    expect(announceLevelUp).not.toHaveBeenCalled();
  });
});
