/**
 * Blast Mode Validation Test
 * Tests: Client-side dictionary cache (O(1) lookup), no path validation
 * Blast allows cascading cascades: up to 3x perfect score
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../quickPlayRound', () => ({
  buildQuickRound: vi.fn().mockResolvedValue({
    mode: 'blast',
    seed: 'test-seed',
    durationSec: 60,
    language: 'en',
    grid: [
      ['B', 'L', 'A'],
      ['S', 'T', 'X'],
      ['Y', 'Z', 'W'],
    ],
    words: ['blast', 'last', 'salt', 'sat', 'tab'],
    perfectScore: 1000,
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
  chain.single = vi.fn().mockResolvedValue({ data: { sum: 1000 }, error: null });
  const rpc = vi.fn((name: string) => {
    if (name === 'quick_play_percentile_today') return Promise.resolve({ data: 50, error: null });
    return Promise.resolve({ data: null, error: null });
  });
  return { db: { rpc, from: vi.fn(() => chain) } as never };
}

describe('Blast Mode - Word Validation (Dictionary Only)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('accepts score up to perfect', async () => {
    const { db } = makeDb();
    const result = await processQuickSubmit(db, {
      userId: 'user1',
      mode: 'blast',
      language: 'en',
      seed: 'test-seed',
      score: 1000, // Perfect score
      wordsFound: 5,
      durationMs: 60000,
    });
    expect(result.scorePct).toBe(100);
  });

  it('accepts score up to 3x perfect (cascade overshoot)', async () => {
    const { db } = makeDb();
    // Perfect is 1000, 3x is 3000 (allowed for blast cascades)
    const result = await processQuickSubmit(db, {
      userId: 'user1',
      mode: 'blast',
      language: 'en',
      seed: 'test-seed',
      score: 3000, // 3x perfect - should be capped at 100%
      wordsFound: 10,
      durationMs: 60000,
    });
    expect(result.scorePct).toBe(100); // Capped at 100%
  });

  it('rejects score exceeding 3x perfect', async () => {
    const { db } = makeDb();
    // Perfect is 1000, 3x is 3000, 3001 should fail
    await expect(
      processQuickSubmit(db, {
        userId: 'user1',
        mode: 'blast',
        language: 'en',
        seed: 'test-seed',
        score: 3001, // Over 3x limit
        wordsFound: 10,
        durationMs: 60000,
      })
    ).rejects.toThrow(/implausible score/i);
  });

  it('accepts score between perfect and 3x', async () => {
    const { db } = makeDb();
    // Score between perfect (1000) and 3x (3000)
    const result = await processQuickSubmit(db, {
      userId: 'user1',
      mode: 'blast',
      language: 'en',
      seed: 'test-seed',
      score: 1500, // 150% (still capped at 100%)
      wordsFound: 7,
      durationMs: 60000,
    });
    expect(result.scorePct).toBe(100); // Capped at 100%
  });

  it('rejects negative scores', async () => {
    const { db } = makeDb();
    await expect(
      processQuickSubmit(db, {
        userId: 'user1',
        mode: 'blast',
        language: 'en',
        seed: 'test-seed',
        score: -100,
        wordsFound: 0,
        durationMs: 60000,
      })
    ).rejects.toThrow(/implausible score/i);
  });
});
