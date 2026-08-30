/**
 * Word Wheel — the daily-quest seam actually fires.
 *
 * Bug: this route bumped the WEEKLY `dailyChallengesCompleted` counter but never
 * called `completeDailyQuestsForResult`, so finishing the daily Word Wheel moved
 * no daily mission at all. The hub advertised "Daily Missions" above a game that
 * could not advance one.
 *
 * A unit test of the pure `questResultForWordWheel` helper does NOT protect this:
 * delete the call in the route and the helper's tests still pass. That is exactly
 * the silent-no-op class in .claude/rules/60-recurring-pitfalls.md, so this test
 * drives the real HTTP route and asserts the seam was invoked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import * as dailyMissionsManager from '../../../modules/dailyMissionsManager';
import * as weeklyQuestManager from '../../../modules/weeklyQuestManager';

vi.mock('../../../modules/dailyMissionsManager', () => ({
  completeDailyQuestsForResult: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../modules/weeklyQuestManager', () => ({
  updateQuestProgress: vi.fn().mockResolvedValue(undefined),
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

/**
 * Minimal PostgREST-ish stub. The submit path inserts a row and selects it back;
 * every builder method returns `this` so any chain length resolves.
 */
function makeSupabaseStub() {
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
  return { from: () => builder };
}

vi.mock('../../../modules/supabaseServer', () => ({
  isSupabaseConfigured: () => true,
  getSupabase: () => makeSupabaseStub(),
}));

async function makeApp() {
  const { default: router } = await import('../wordWheelRoutes');
  const app = express();
  app.use(express.json());
  app.use('/api/daily-challenge/word-wheel', router);
  return app;
}

const submission = {
  puzzleDate: '2026-05-18',
  puzzleNumber: 240,
  language: 'en',
  playerId: 'player-1',
  score: 64,
  wordCount: 3,
  wordsFound: ['CAT', 'BRIDGE', 'TRAIN'],
  longestWord: 'BRIDGE',
  timeSeconds: 120,
  centerLetter: 'R',
};

describe('POST /submit — daily quest credit', () => {
  beforeEach(() => {
    vi.mocked(dailyMissionsManager.completeDailyQuestsForResult).mockClear();
    vi.mocked(weeklyQuestManager.updateQuestProgress).mockClear();
  });

  it('credits TODAY\'s quests, not just the weekly counter', async () => {
    const app = await makeApp();

    await request(app).post('/api/daily-challenge/word-wheel/submit').send(submission);

    expect(dailyMissionsManager.completeDailyQuestsForResult).toHaveBeenCalledTimes(1);

    const [playerId, result] = vi.mocked(dailyMissionsManager.completeDailyQuestsForResult).mock.calls[0];
    expect(playerId).toBe('player-1');
    expect(result).toMatchObject({
      mode: 'word-wheel',
      score: 64,
      wordsFound: 3,
      longestWordLength: 6, // BRIDGE
    });
  });

  it('still credits the weekly counter — the original behaviour is intact', async () => {
    const app = await makeApp();

    await request(app).post('/api/daily-challenge/word-wheel/submit').send(submission);

    expect(weeklyQuestManager.updateQuestProgress).toHaveBeenCalledWith('player-1', { dailyChallengesCompleted: 1 });
  });

  it('credits nothing for a guest — there is no account to credit', async () => {
    const app = await makeApp();

    await request(app)
      .post('/api/daily-challenge/word-wheel/submit')
      .send({ ...submission, playerId: undefined, guestFingerprint: 'guest-abc' });

    expect(dailyMissionsManager.completeDailyQuestsForResult).not.toHaveBeenCalled();
  });
});
