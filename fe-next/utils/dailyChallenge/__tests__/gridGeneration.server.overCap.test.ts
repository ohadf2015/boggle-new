import { describe, it, expect, vi, beforeEach } from 'vitest';

const updates: Array<Record<string, unknown>> = [];
const row = { target_word: 'GRAVITY', override_word: null, grid: [['G', 'R', 'A', 'V', 'I', 'T', 'Y']], grid_generated_at: null, meaning: 'pull' };

vi.mock('@/backend/dictionaryLoaders', () => ({
  loadNounList: vi.fn().mockResolvedValue(new Set()),
  createSafeReadFile: vi.fn(),
}));
vi.mock('@/backend/modules/supabase/client', () => {
  const chain = (result: unknown) => {
    const q: Record<string, unknown> = {};
    q.select = () => q; q.eq = () => q;
    q.single = () => Promise.resolve(result);
    q.then = (r: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(r);
    return q;
  };
  return {
    isSupabaseConfigured: () => true,
    getSupabase: () => ({
      from: () => ({
        select: () => chain({ data: { ...row, id: 1 }, error: null }),
        update: (u: Record<string, unknown>) => { updates.push(u); return chain({ error: null }); },
        insert: () => Promise.resolve({ error: null }),
      }),
    }),
  };
});

import { generateDailyPuzzleAsync } from '../gridGeneration.server';

describe('generateDailyPuzzleAsync with a stored target over the cap', () => {
  beforeEach(() => { updates.length = 0; });

  it('keeps today and past days as they were played, with no write', async () => {
    const puzzle = await generateDailyPuzzleAsync('2026-11-18', 'en');
    expect(puzzle.targetWord).toBe('GRAVITY');
    expect(updates).toEqual([]);
  });

  it('serves a future day a 6-letter-or-shorter target and stores it as the override so the row heals', async () => {
    const puzzle = await generateDailyPuzzleAsync('2099-01-01', 'en');
    expect(puzzle.targetWord.length).toBeLessThanOrEqual(6);
    expect(updates.at(-1)).toMatchObject({ override_word: puzzle.targetWord, meaning: null });
  });
});
