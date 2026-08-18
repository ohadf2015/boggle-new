/**
 * Wheel-Rush Mode Validation Test
 * Tests: Client-side word set validation (shipped in config.words)
 * Requirements: word in the preset list + must use center letter + each letter used only once
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../quickPlayRound', () => ({
  buildQuickRound: vi.fn().mockResolvedValue({
    mode: 'wheel-rush',
    seed: 'test-seed',
    durationSec: 60,
    language: 'en',
    grid: [], // Wheel mode has no grid
    wheel: {
      centerLetter: 'A', // Must be in every word
      outerLetters: ['G', 'I', 'N', 'G', 'E', 'R'],
      allLetters: ['A', 'G', 'I', 'N', 'G', 'E', 'R'],
      puzzleDate: 'quick-test-seed',
      language: 'en',
      puzzleNumber: 0,
    },
    // Preset valid words (what gets shipped to client)
    words: ['age', 'anger', 'anger', 'aging', 'ager', 'rain', 'range', 'rang', 'rag', 'rig', 'ring'],
    perfectScore: 500,
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
  chain.single = vi.fn().mockResolvedValue({ data: { sum: 500 }, error: null });
  const rpc = vi.fn((name: string) => {
    if (name === 'quick_play_percentile_today') return Promise.resolve({ data: 50, error: null });
    return Promise.resolve({ data: null, error: null });
  });
  return { db: { rpc, from: vi.fn(() => chain) } as never };
}

describe('Wheel-Rush Mode — server score guard (NOT word validation: the dictionary and adjacency checks are client-side)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('accepts score for valid words from the preset set', async () => {
    const { db } = makeDb();
    // Client found valid words from the preset set
    const result = await processQuickSubmit(db, {
      userId: 'user1',
      mode: 'wheel-rush',
      language: 'en',
      seed: 'test-seed',
      score: 250, // Found some valid words
      wordsFound: 5,
      durationMs: 60000,
    });
    expect(result.scorePct).toBe(50); // 250/500 = 50%
  });

  it('accepts perfect score', async () => {
    const { db } = makeDb();
    const result = await processQuickSubmit(db, {
      userId: 'user1',
      mode: 'wheel-rush',
      language: 'en',
      seed: 'test-seed',
      score: 500, // Perfect
      wordsFound: 11,
      durationMs: 60000,
    });
    expect(result.scorePct).toBe(100);
  });

  it('rejects score exceeding perfect', async () => {
    const { db } = makeDb();
    // Wheel-Rush does NOT allow score > perfect (no 3x multiplier)
    // NOTE: This assumes client-side validation prevented fake words
    // Server validation only checks if score is plausible for the board
    await expect(
      processQuickSubmit(db, {
        userId: 'user1',
        mode: 'wheel-rush',
        language: 'en',
        seed: 'test-seed',
        score: 600, // Over perfect
        wordsFound: 12,
        durationMs: 60000,
      })
    ).rejects.toThrow(/implausible score/i);
  });

  it('rejects negative scores', async () => {
    const { db } = makeDb();
    await expect(
      processQuickSubmit(db, {
        userId: 'user1',
        mode: 'wheel-rush',
        language: 'en',
        seed: 'test-seed',
        score: -50,
        wordsFound: 0,
        durationMs: 60000,
      })
    ).rejects.toThrow(/implausible score/i);
  });

  it('accepts zero score (no words found)', async () => {
    const { db } = makeDb();
    const result = await processQuickSubmit(db, {
      userId: 'user1',
      mode: 'wheel-rush',
      language: 'en',
      seed: 'test-seed',
      score: 0,
      wordsFound: 0,
      durationMs: 60000,
    });
    expect(result.scorePct).toBe(0);
  });
});
