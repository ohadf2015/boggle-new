import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/posthog', () => ({ getPostHogServer: () => ({ capture: vi.fn() }) }));
vi.mock('@/lib/blastLeaderboard', async (orig) => ({
  ...(await orig<typeof import('@/lib/blastLeaderboard')>()),
  addToWeeklyLeaderboard: vi.fn().mockResolvedValue(undefined),
  getLeaderboardPercentile: vi.fn().mockResolvedValue(42),
  getWeeklyStanding: vi.fn().mockResolvedValue(null),
  getWeeklyScoresAbove: vi.fn().mockResolvedValue([]),
}));

import { processBlastCompletion, type BlastResultData } from '../processCompletion';
import { getWeeklyStanding, getWeeklyScoresAbove } from '@/lib/blastLeaderboard';

const data: BlastResultData = {
  score: 500,
  tilesCleared: 20,
  totalTiles: 25,
  clearPercentage: 80,
  wordsFound: ['hello', 'world'],
  bestWord: 'hello',
  maxCombo: 3,
  stars: 2,
  difficulty: 'medium',
  language: 'en',
};

function makeSupabase({
  insertError = null as { code?: string; message?: string } | null,
  existingBests = null as Record<string, number> | null,
} = {}) {
  const rpc = vi.fn().mockResolvedValue({ data: [{ xp_granted: 40 }], error: null });
  const from = vi.fn((table: string) => {
    if (table === 'blast_results') {
      return { insert: vi.fn().mockResolvedValue({ error: insertError }) };
    }
    if (table === 'blast_personal_bests') {
      return {
        select: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: existingBests, error: null }) }) }) }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      };
    }
    if (table === 'profiles') {
      return {
        select: () => ({
          eq: () => ({ single: () => Promise.resolve({ data: { total_score: 0, total_games: 0, total_words: 0 }, error: null }) }),
          in: () => Promise.resolve({ data: [{ id: 'rival-1', username: 'zoe', display_name: 'Zoe' }], error: null }),
        }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      };
    }
    return {};
  });
  return { from, rpc };
}

describe('processBlastCompletion', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns ok with personal bests + awards on success', async () => {
    const result = await processBlastCompletion(data, 'u1', { supabase: makeSupabase() });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.body.personalBests?.bestScore).toBe(500);
      expect(result.body.isNewBestScore).toBe(true);
      expect(result.body.xpAwarded).toBe(40);
      expect(result.body.percentile).toBe(42);
    }
  });

  it('returns a RETRYABLE failure (status 500) on a real insert error', async () => {
    const result = await processBlastCompletion(data, 'u1', {
      supabase: makeSupabase({ insertError: { code: 'INTERNAL', message: 'DB down' } }),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(500); // → AwardError(retryable=true) on the sync path
      expect(result.error).toContain('Failed to save result');
    }
  });

  it('treats a pending migration (PGRST205) as ok (no retry, nothing to persist)', async () => {
    const result = await processBlastCompletion(data, 'u1', {
      supabase: makeSupabase({ insertError: { code: 'PGRST205', message: 'table not found' } }),
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.body.migrationPending).toBe(true);
  });

  it('returns weekly rank, previous rank and the rival just above', async () => {
    vi.mocked(getWeeklyStanding)
      .mockResolvedValueOnce({ rank: 9, total: 40, score: 300 })
      .mockResolvedValueOnce({ rank: 4, total: 40, score: 500 });
    vi.mocked(getWeeklyScoresAbove).mockResolvedValueOnce([{ userId: 'rival-1', score: 640 }]);

    const result = await processBlastCompletion(data, 'u1', { supabase: makeSupabase() });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.body.rank).toBe(4);
      expect(result.body.previousRank).toBe(9);
      expect(result.body.totalPlayers).toBe(40);
      expect(result.body.rival).toEqual({ name: 'Zoe', score: 640 });
      expect(getWeeklyScoresAbove).toHaveBeenCalledWith(500, 'en', 'medium', 1);
    }
  });

  it('leaves rank fields null when the board is unavailable', async () => {
    const result = await processBlastCompletion(data, 'u1', { supabase: makeSupabase() });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.body.rank).toBeNull();
      expect(result.body.previousRank).toBeNull();
      expect(result.body.rival).toBeNull();
    }
  });
});
