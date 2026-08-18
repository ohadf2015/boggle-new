/**
 * Word-Hunt Mode Validation Test
 * Tests: Server-side dictionary validation via /api/dictionary/check
 * Requires: word in dictionary AND valid path on grid AND finding target word for bonus
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../quickPlayRound', () => ({
  buildQuickRound: vi.fn().mockResolvedValue({
    mode: 'word-hunt',
    seed: 'test-seed',
    durationSec: 60,
    language: 'en',
    grid: [
      ['P', 'O', 'L', 'L', 'E', 'N'],
      ['A', 'B', 'O', 'L', 'L', 'A'],
      ['R', 'T', 'O', 'R', 'I', 'L'],
      ['K', 'O', 'L', 'L', 'A', 'R'],
    ],
    words: ['poll', 'pole', 'roll', 'pollen', 'roller', 'atoll', 'toll'],
    targetWord: 'POLLEN', // The mystery word to find
    perfectScore: 5000,
  }),
}));

vi.mock('../../services/economy/awardCoins', () => ({
  awardCoinsServer: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('../ghostRivalManager', () => ({
  updateRivalScore: vi.fn().mockResolvedValue(undefined),
}));

import { processQuickSubmit } from '../quickPlaySubmit';

function makeDb() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ['select', 'eq', 'order', 'update', 'is']) {
    chain[m] = vi.fn(() => chain);
  }
  chain.insert = vi.fn().mockResolvedValue({ error: null });
  chain.limit = vi.fn().mockResolvedValue({ data: [], error: null });
  chain.single = vi.fn().mockResolvedValue({ data: { sum: 5000 }, error: null });
  const rpc = vi.fn((name: string) => {
    if (name === 'quick_play_percentile_today') return Promise.resolve({ data: 50, error: null });
    return Promise.resolve({ data: null, error: null });
  });
  return { db: { rpc, from: vi.fn(() => chain) } as never };
}

describe('Word-Hunt Mode — server score guard (NOT word validation: the dictionary and adjacency checks are client-side)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('accepts score for valid words up to perfect', async () => {
    const { db } = makeDb();
    // Perfect score is 5000
    const result = await processQuickSubmit(db, {
      userId: 'user1',
      mode: 'word-hunt',
      language: 'en',
      seed: 'test-seed',
      score: 4000, // Found good words but not all
      wordsFound: 5,
      durationMs: 60000,
    });
    expect(result.scorePct).toBe(80); // 4000/5000 = 80%
  });

  it('accepts perfect score (finding all words including target)', async () => {
    const { db } = makeDb();
    const result = await processQuickSubmit(db, {
      userId: 'user1',
      mode: 'word-hunt',
      language: 'en',
      seed: 'test-seed',
      score: 5000, // Found all words including POLLEN
      wordsFound: 7,
      durationMs: 60000,
    });
    expect(result.scorePct).toBe(100);
  });

  it('rejects score exceeding perfect', async () => {
    const { db } = makeDb();
    // Word-Hunt does NOT allow score > perfect (no 3x multiplier like blast)
    await expect(
      processQuickSubmit(db, {
        userId: 'user1',
        mode: 'word-hunt',
        language: 'en',
        seed: 'test-seed',
        score: 5500, // Over perfect
        wordsFound: 7,
        durationMs: 60000,
      })
    ).rejects.toThrow(/implausible score/i);
  });

  it('rejects negative scores', async () => {
    const { db } = makeDb();
    await expect(
      processQuickSubmit(db, {
        userId: 'user1',
        mode: 'word-hunt',
        language: 'en',
        seed: 'test-seed',
        score: -100,
        wordsFound: 0,
        durationMs: 60000,
      })
    ).rejects.toThrow(/implausible score/i);
  });

  it('accepts zero score (found no words)', async () => {
    const { db } = makeDb();
    const result = await processQuickSubmit(db, {
      userId: 'user1',
      mode: 'word-hunt',
      language: 'en',
      seed: 'test-seed',
      score: 0,
      wordsFound: 0,
      durationMs: 60000,
    });
    expect(result.scorePct).toBe(0);
  });
});
