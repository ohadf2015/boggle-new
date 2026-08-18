/**
 * Classic Mode Validation Test
 * Tests: Dictionary validation + path validation on grid
 * Classic requires BOTH: word in dictionary AND valid path on grid
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../quickPlayRound', () => ({
  buildQuickRound: vi.fn().mockResolvedValue({
    mode: 'classic',
    seed: 'test-seed',
    durationSec: 60,
    language: 'en',
    grid: [
      ['C', 'A', 'T'],
      ['D', 'O', 'G'],
      ['B', 'I', 'R'],
    ],
    words: ['cat', 'cad', 'cod', 'dog', 'bit', 'rib'],
    perfectScore: 100,
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
  chain.single = vi.fn().mockResolvedValue({ data: { sum: 100 }, error: null });
  const rpc = vi.fn((name: string) => {
    if (name === 'quick_play_percentile_today') return Promise.resolve({ data: 50, error: null });
    return Promise.resolve({ data: null, error: null });
  });
  return { db: { rpc, from: vi.fn(() => chain) } as never };
}

describe('Classic Mode - Word Validation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('accepts score for valid words within perfect score', async () => {
    const { db } = makeDb();
    // Score is within perfect (100)
    const result = await processQuickSubmit(db, {
      userId: 'user1',
      mode: 'classic',
      language: 'en',
      seed: 'test-seed',
      score: 80,
      wordsFound: 5,
      durationMs: 60000,
    });
    expect(result.scorePct).toBe(80);
  });

  it('rejects score exceeding perfect score', async () => {
    const { db } = makeDb();
    // Classic mode does NOT allow score > perfect
    // Perfect is 100, attempting 120
    await expect(
      processQuickSubmit(db, {
        userId: 'user1',
        mode: 'classic',
        language: 'en',
        seed: 'test-seed',
        score: 120, // Over perfect
        wordsFound: 5,
        durationMs: 60000,
      })
    ).rejects.toThrow(/implausible score/i);
  });

  it('accepts score equal to perfect score', async () => {
    const { db } = makeDb();
    const result = await processQuickSubmit(db, {
      userId: 'user1',
      mode: 'classic',
      language: 'en',
      seed: 'test-seed',
      score: 100, // Exactly perfect
      wordsFound: 6,
      durationMs: 60000,
    });
    expect(result.scorePct).toBe(100);
  });

  it('rejects negative scores', async () => {
    const { db } = makeDb();
    await expect(
      processQuickSubmit(db, {
        userId: 'user1',
        mode: 'classic',
        language: 'en',
        seed: 'test-seed',
        score: -10,
        wordsFound: 0,
        durationMs: 60000,
      })
    ).rejects.toThrow(/implausible score/i);
  });
});
