import { describe, it, expect, vi, beforeEach } from 'vitest';

// NOTE: test lives in __tests__/ — mock paths are relative to THIS file ('../x'),
// matching how quickPlaySubmit.ts ('./x') resolves. Known repo gotcha.
vi.mock('../quickPlayRound', () => ({
  buildQuickRound: vi.fn().mockResolvedValue({
    mode: 'classic', seed: 's', durationSec: 60, grid: [['a']], words: ['cat'], perfectScore: 1000,
  }),
}));
vi.mock('../../services/economy/awardCoins', () => ({
  awardCoinsServer: vi.fn().mockResolvedValue({ success: true, newBalance: 500 }),
}));
vi.mock('../ghostRivalManager', () => ({
  updateRivalScore: vi.fn().mockResolvedValue(undefined),
}));

import { processQuickSubmit, quickPlayCoinsFor } from '../quickPlaySubmit';
import { awardCoinsServer } from '../../services/economy/awardCoins';

function makeDb() {
  const historyRows = [{ score_pct: 40 }, { score_pct: 50 }];
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ['select', 'eq', 'order', 'update', 'is']) {
    chain[m] = vi.fn(() => chain);
  }
  chain.insert = vi.fn().mockResolvedValue({ error: null });
  chain.limit = vi.fn().mockResolvedValue({ data: historyRows, error: null });
  chain.single = vi.fn().mockResolvedValue({ data: { sum: 468 }, error: null });
  const rpc = vi.fn((name: string) => {
    if (name === 'quick_play_percentile_today') return Promise.resolve({ data: 73, error: null });
    return Promise.resolve({ data: null, error: null });
  });
  return { db: { rpc, from: vi.fn(() => chain) } as never, rpc, chain };
}

const baseInput = {
  userId: 'u1', mode: 'classic' as const, language: 'en', seed: 's',
  score: 680, wordsFound: 9, durationMs: 60000,
};

beforeEach(() => vi.clearAllMocks());

describe('processQuickSubmit', () => {
  it('rejects score above recomputed perfect', async () => {
    const { db } = makeDb();
    await expect(processQuickSubmit(db, { ...baseInput, score: 5000 }))
      .rejects.toThrow(/score/i);
  });

  it('blast tolerates cascade overshoot up to 3x, caps pct at 100', async () => {
    const { db } = makeDb();
    const out = await processQuickSubmit(db, { ...baseInput, mode: 'blast', score: 1400 });
    expect(out.scorePct).toBe(100);
    await expect(processQuickSubmit(db, { ...baseInput, mode: 'blast', score: 3001 }))
      .rejects.toThrow(/score/i);
  });

  it('computes scorePct and returns percentile + history', async () => {
    const { db } = makeDb();
    const out = await processQuickSubmit(db, baseInput);
    expect(out.scorePct).toBe(68);
    expect(out.percentileToday).toBe(73);
    expect(out.history).toEqual([40, 50]);
  });

  it('awards coins once, scaled by scorePct, capped at 200', async () => {
    const { db } = makeDb();
    const out = await processQuickSubmit(db, { ...baseInput, score: 1000 });
    expect(out.coins).toBe(quickPlayCoinsFor(100));
    expect(out.coins).toBeLessThanOrEqual(200);
    expect(vi.mocked(awardCoinsServer)).toHaveBeenCalledTimes(1);
  });

  it('grants XP via increment_player_xp RPC', async () => {
    const { db, rpc } = makeDb();
    const out = await processQuickSubmit(db, baseInput);
    expect(out.xp).toBeGreaterThan(0);
    expect(rpc).toHaveBeenCalledWith('increment_player_xp',
      expect.objectContaining({ p_player_id: 'u1' }));
  });

  it('returns cumulative rank points (all-time sum of score_pct)', async () => {
    const { db } = makeDb();
    const out = await processQuickSubmit(db, baseInput);
    expect(out.totalPoints).toBe(468);
  });

  it('challenge acceptance updates the challenge row', async () => {
    const { db, chain } = makeDb();
    await processQuickSubmit(db, { ...baseInput, challengeId: 'ch1' });
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ accepted_by: 'u1', accepted_score: 680 }));
  });
});

describe('quickPlayCoinsFor', () => {
  it('flat completion + pct, capped 200', () => {
    expect(quickPlayCoinsFor(0)).toBe(25);
    expect(quickPlayCoinsFor(68)).toBe(93);
    expect(quickPlayCoinsFor(100)).toBe(125);
  });
});
