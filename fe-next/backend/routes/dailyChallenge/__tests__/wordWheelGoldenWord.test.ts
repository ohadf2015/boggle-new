import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { generateWordWheelPuzzle } from '../../../../utils/dailyChallenge/wordWheelGeneration';
import { goldenWordKey } from '../../../../utils/dailyChallenge/wordWheelGolden';

const h = vi.hoisted(() => {
  const state = {
    inserted: [] as Record<string, unknown>[],
    insertError: null as null | { code: string; message: string },
    resolve: { ok: true, playerId: null } as { ok: true; playerId: string | null } | { ok: false; status: 401 },
    statsScores: [] as number[],
    count: 0,
  };
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  Object.assign(builder, {
    select: chain, update: chain, eq: chain, neq: chain, gt: chain, not: chain, is: chain, order: chain, limit: chain,
    insert: (row: Record<string, unknown>) => { state.inserted.push(row); return builder; },
    single: () => Promise.resolve(state.insertError
      ? { data: null, error: state.insertError }
      : { data: { id: 1 }, error: null }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null, count: state.count }).then(resolve),
  });
  return {
    state,
    supabase: { from: () => builder },
    awardCoinsServer: vi.fn().mockResolvedValue({ success: true, newBalance: 10 }),
  };
});

vi.mock('../resolveDailyPlayer', () => ({ resolveDailyPlayer: async () => h.state.resolve }));
vi.mock('../../../modules/supabaseServer', () => ({ isSupabaseConfigured: () => true, getSupabase: () => h.supabase }));
vi.mock('../../../services/economy/awardCoins', () => ({ awardCoinsServer: (...a: unknown[]) => h.awardCoinsServer(...a) }));
vi.mock('../../../modules/dailyMissionsManager', () => ({ completeDailyQuestsForResult: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../../modules/weeklyQuestManager', () => ({ updateQuestProgress: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../profileStats', () => ({
  updateDailyProfileStats: vi.fn(async ({ scoreToAdd }: { scoreToAdd: number }) => { h.state.statsScores.push(scoreToAdd); }),
}));
vi.mock('../../../modules/supabase/leaderboard', () => ({ updateLeaderboardEntry: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../../modules/leaderboardScoring', () => ({ leaderboardPointsForGame: (_m: string, s: number) => s }));
const dict = vi.hoisted(() => ({ words: new Set<string>() }));
vi.mock('../../../dictionary', () => ({
  ensureLanguageLoaded: vi.fn().mockResolvedValue(undefined),
  isValidWord: (w: string) => dict.words.has(w.toUpperCase()),
}));
vi.mock('../../../utils/logger', () => ({ default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

import router from '../wordWheelRoutes';
import { resetGoldenWordCache } from '../wheelGoldenWord';

const app = express();
app.use(express.json());
app.use('/', router);

const TODAY = '2026-11-05';
const puzzle = generateWordWheelPuzzle(TODAY, 'en');
const GOLDEN = puzzle.allLetters.join('').toUpperCase();
const short = `${puzzle.centerLetter}${puzzle.outerLetters[0]}${puzzle.outerLetters[1]}`;

const submit = (words: string[], over: Record<string, unknown> = {}) => request(app).post('/submit').send({
  puzzleDate: TODAY, puzzleNumber: puzzle.puzzleNumber, language: 'en', playerId: 'p1',
  score: 100, wordsFound: words, timeSeconds: 60, isCatchup: false, ...over,
});
const wotdAwards = () => h.awardCoinsServer.mock.calls.filter((c) => c[2] === 'wotd_complete');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(`${TODAY}T12:00:00Z`));
  h.state.inserted.length = 0;
  h.state.insertError = null;
  h.state.count = 0;
  h.state.resolve = { ok: true, playerId: 'p1' };
  h.awardCoinsServer.mockClear();
  dict.words = new Set([GOLDEN]);
  resetGoldenWordCache();
});
afterEach(() => vi.useRealTimers());

describe('daily Word Wheel golden word', () => {
  it('Given a signed-in player who found the golden word, Then the 50-coin word-of-the-day award is paid once and the response says so', async () => {
    const res = await submit([short, GOLDEN]);
    expect(res.status).toBe(200);
    expect(res.body.goldenWordFound).toBe(true);
    expect(wotdAwards()).toHaveLength(1);
    expect(wotdAwards()[0].slice(0, 3)).toEqual(['p1', 50, 'wotd_complete']);
  });

  it('Given the golden word was not found, Then no word-of-the-day coins', async () => {
    const res = await submit([short]);
    expect(res.body.goldenWordFound).toBe(false);
    expect(wotdAwards()).toHaveLength(0);
  });

  it('Given a guest, Then nothing is paid even with the golden word', async () => {
    h.state.resolve = { ok: true, playerId: null };
    await submit([GOLDEN], { playerId: undefined, guestFingerprint: 'fp-1' });
    expect(wotdAwards()).toHaveLength(0);
  });

  it('Given a repeat submit for the same day, Then nothing is paid again', async () => {
    h.state.insertError = { code: '23505', message: 'dup' };
    await submit([GOLDEN]);
    expect(wotdAwards()).toHaveLength(0);
  });

  it("Given the player already played another language's wheel today, Then the award stays once per day", async () => {
    h.state.count = 1;
    await submit([GOLDEN]);
    expect(wotdAwards()).toHaveLength(0);
  });

  it('Given a wheel with no 7-letter word, Then there is no golden word that day', async () => {
    dict.words = new Set();
    const res = await submit([GOLDEN]);
    expect(res.body.goldenWordFound).toBe(false);
    expect(wotdAwards()).toHaveLength(0);
  });
});

describe('GET /golden/:date/:language', () => {
  it('returns a key for the golden word, never the word itself', async () => {
    const res = await request(app).get(`/golden/${TODAY}/en`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ key: goldenWordKey(GOLDEN, TODAY, 'en') });
    expect(JSON.stringify(res.body)).not.toContain(GOLDEN);
  });

  it('returns a null key on a day without a golden word, and 400 outside the playable window', async () => {
    dict.words = new Set();
    expect((await request(app).get(`/golden/${TODAY}/en`)).body).toEqual({ key: null });
    expect((await request(app).get('/golden/2026-10-01/en')).status).toBe(400);
  });
});
