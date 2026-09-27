import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/posthog', () => ({ getPostHogServer: () => ({ capture: vi.fn() }) }));
vi.mock('@/lib/blastLeaderboard', () => ({
  addToWeeklyLeaderboard: vi.fn().mockResolvedValue(undefined),
  getLeaderboardPercentile: vi.fn().mockResolvedValue(42),
}));

import { processBlastCompletion, type BlastResultData } from '../processCompletion';

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
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { total_score: 0, total_games: 0, total_words: 0 }, error: null }) }) }),
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
});
