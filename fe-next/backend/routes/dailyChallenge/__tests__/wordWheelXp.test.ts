import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const { completeDailyQuestsForResult, updateQuestProgress, makeSupabaseStub } = vi.hoisted(() => {
  const row = { id: 1, score: 64, word_count: 3, words_found: ['CAT', 'BRIDGE', 'TRAIN'] };
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  Object.assign(builder, {
    select: chain, insert: chain, upsert: chain, update: chain, delete: chain,
    eq: chain, neq: chain, gt: chain, gte: chain, lt: chain, lte: chain,
    not: chain, is: chain, in: chain, order: chain, limit: chain, range: chain,
    single: () => Promise.resolve({ data: row, error: null }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: [row], error: null, count: 0 }).then(resolve),
  });
  return {
    completeDailyQuestsForResult: vi.fn().mockResolvedValue(undefined),
    updateQuestProgress: vi.fn().mockResolvedValue(undefined),
    makeSupabaseStub: () => ({ from: () => builder }),
  };
});

const grantSoloGameXp = vi.fn();
vi.mock('../../../modules/xpGrant', async (orig) => ({
  ...(await orig<typeof import('../../../modules/xpGrant')>()),
  grantSoloGameXp: (...args: unknown[]) => grantSoloGameXp(...args),
}));

vi.mock('../../../modules/dailyMissionsManager', () => ({
  completeDailyQuestsForResult: (...args: unknown[]) => completeDailyQuestsForResult(...args),
}));

vi.mock('../../../modules/weeklyQuestManager', () => ({
  updateQuestProgress: (...args: unknown[]) => updateQuestProgress(...args),
}));

vi.mock('../profileStats', () => ({
  updateDailyProfileStats: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../modules/supabase/leaderboard', () => ({
  updateLeaderboardEntry: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../modules/leaderboardScoring', () => ({
  leaderboardPointsForGame: () => 10,
}));

vi.mock('../../../utils/logger', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../../modules/supabaseServer', () => ({
  isSupabaseConfigured: () => true,
  getSupabase: () => makeSupabaseStub(),
}));

vi.mock('../resolveDailyPlayer', () => ({
  resolveDailyPlayer: async (_req: unknown, id: string | undefined) => ({ ok: true, playerId: id ?? null }),
}));

import wordWheelRoutes from '../wordWheelRoutes';
import { generateWordWheelPuzzle } from '../../../../utils/dailyChallenge/wordWheelGeneration';

const PUZZLE = generateWordWheelPuzzle('2026-05-18', 'en');
const [C, O] = [PUZZLE.centerLetter, PUZZLE.outerLetters];
const WORDS = [`${C}${O[0]}${O[1]}`, `${C}${O[0]}${O[1]}${O[2]}${O[3]}${O[4]}`, `${O[2]}${O[3]}${C}`];

function makeApp() {
  const app = express();
  app.use(express.json());
  // Mount at `/` like the other dailyChallenge route tests. Express 5 does not
  // match POST /api/.../submit against a router mounted at that prefix in this
  // suite (the handler never ran; supertest got 200 {}).
  app.use('/', wordWheelRoutes);
  return app;
}

const submission = {
  puzzleDate: '2026-05-18',
  puzzleNumber: 240,
  language: 'en',
  playerId: 'player-1',
  score: 64,
  wordCount: 3,
  wordsFound: WORDS,
  longestWord: WORDS[1],
  timeSeconds: 120,
  centerLetter: 'R',
};

describe('POST /submit — XP', () => {
  afterEach(() => vi.useRealTimers());
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-05-18T12:00:00Z'));
    grantSoloGameXp.mockReset().mockResolvedValue({ xpEarned: 60, newTotalXp: 900, oldLevel: 4, newLevel: 5, leveledUp: true, xpBreakdown: {} });
  });

  it('grants solo XP for the validated score and returns the level-up', async () => {
    const res = await request(makeApp()).post('/submit').send(submission);
    expect(grantSoloGameXp).toHaveBeenCalledTimes(1);
    const [, playerId, game] = grantSoloGameXp.mock.calls[0];
    expect(playerId).toBe('player-1');
    expect(game.score).toBeGreaterThan(0);
    expect(res.body).toMatchObject({ xpEarned: 60, newTotalXp: 900, levelUp: { oldLevel: 4, newLevel: 5 } });
  });

  it('grants nothing to a guest', async () => {
    const guest = { ...submission, playerId: undefined, guestFingerprint: 'g-1' };
    await request(makeApp()).post('/submit').send(guest);
    expect(grantSoloGameXp).not.toHaveBeenCalled();
  });

  it('still answers success when the grant throws', async () => {
    grantSoloGameXp.mockRejectedValueOnce(new Error('rpc down'));
    const res = await request(makeApp()).post('/submit').send(submission);
    expect(res.body.success).toBe(true);
    expect(res.body.xpEarned).toBeUndefined();
  });
});
