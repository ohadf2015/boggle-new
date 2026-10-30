import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { getScoreBreakdown } from '../../../../utils/aiHintScoring';
import { getPuzzleNumber } from '../../../../utils/dailyChallenge';

const h = vi.hoisted(() => {
  type Write = { table: string; op: 'insert' | 'update'; payload: Record<string, unknown> };
  const writes: Write[] = [];
  const state: { existing: Record<string, unknown> | null } = { existing: null };

  function makeBuilder(table: string) {
    const b: Record<string, unknown> = {};
    let op: Write['op'] | null = null;
    let payload: Record<string, unknown> = {};
    const chain = () => b;
    for (const n of ['select', 'eq', 'not', 'is', 'gt', 'lt', 'order', 'limit', 'in']) b[n] = chain;
    b.insert = (p: Record<string, unknown>) => { op = 'insert'; payload = p; writes.push({ table, op, payload }); return b; };
    b.update = (p: Record<string, unknown>) => { op = 'update'; payload = p; writes.push({ table, op, payload }); return b; };
    const resolve = () => {
      if (table === 'daily_word_hunt_attempts' && !op) return { data: state.existing, error: null };
      if (op) return { data: { id: 'row-1', ...payload }, error: null };
      return { data: [], error: null };
    };
    b.single = () => Promise.resolve(resolve());
    b.maybeSingle = () => Promise.resolve(resolve());
    b.then = (f: (v: unknown) => unknown) => Promise.resolve(op ? resolve() : { data: [], error: null }).then(f);
    return b;
  }

  return {
    writes,
    state,
    supabase: { from: (t: string) => makeBuilder(t) },
    resolveDailyPlayer: vi.fn(),
    leaderboardPointsForGame: vi.fn((_mode: string, score: number) => score),
    updateDailyProfileStats: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('../../../modules/supabaseServer', () => ({
  getSupabase: () => h.supabase,
  isSupabaseConfigured: () => true,
}));
vi.mock('../resolveDailyPlayer', () => ({ resolveDailyPlayer: h.resolveDailyPlayer }));
vi.mock('../../../redisClient', () => ({ getCachedDailyPuzzle: async () => ({ targetWord: 'PLANET' }) }));
vi.mock('../../../dictionary', () => ({ ensureLanguageLoaded: async () => {}, isDictionaryWord: () => true }));
vi.mock('../../../modules/communityWordManager', () => ({ isWordCommunityValid: () => false }));
vi.mock('../../../modules/dailyMissionsManager', () => ({ completeDailyQuestsForResult: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../../modules/weeklyQuestManager', () => ({ updateQuestProgress: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../profileStats', () => ({ updateDailyProfileStats: h.updateDailyProfileStats }));
vi.mock('../../../modules/supabase/leaderboard', () => ({ updateLeaderboardEntry: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../../modules/leaderboardScoring', () => ({ leaderboardPointsForGame: h.leaderboardPointsForGame }));
vi.mock('../../../utils/logger', () => ({ default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

import wordHuntRoutes from '../wordHuntRoutes';

const TODAY = '2026-10-30';

function app() {
  const a = express();
  a.use(express.json());
  a.use('/', wordHuntRoutes);
  return a;
}

function body(overrides: Record<string, unknown> = {}) {
  const puzzleDate = (overrides.puzzleDate as string) ?? TODAY;
  return {
    puzzleDate,
    puzzleNumber: getPuzzleNumber(puzzleDate),
    language: 'en',
    playerId: 'me',
    displayName: 'Me',
    solved: true,
    attemptsUsed: 2,
    targetWord: 'PLANET',
    attemptWords: [{ word: 'PLANES', feedback: [] }, { word: 'PLANET', feedback: [] }],
    wordsDiscovered: [{ word: 'CAT' }, { word: 'DOG' }, { word: 'DOG' }],
    lifeRemaining: 50,
    efficiencyScore: 999999,
    ...overrides,
  };
}

function attemptWrites() {
  return h.writes.filter((w) => w.table === 'daily_word_hunt_attempts');
}

describe('Word Hunt submit hardening', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${TODAY}T12:00:00.000Z`));
    h.writes.length = 0;
    h.state.existing = null;
    h.resolveDailyPlayer.mockReset();
    h.resolveDailyPlayer.mockResolvedValue({ ok: true, playerId: 'me' });
    h.leaderboardPointsForGame.mockClear();
  });
  afterEach(() => vi.useRealTimers());

  it('given a playerId that is not the caller, when submitted, then it is rejected with 401 and nothing is written', async () => {
    h.resolveDailyPlayer.mockResolvedValue({ ok: false, status: 401 });
    const res = await request(app()).post('/submit').send(body({ playerId: 'victim' }));
    expect(res.status).toBe(401);
    expect(attemptWrites()).toHaveLength(0);
  });

  it('given a guest with only a fingerprint, when submitted, then the guest row is written', async () => {
    h.resolveDailyPlayer.mockResolvedValue({ ok: true, playerId: null });
    const res = await request(app()).post('/submit').send(body({ playerId: null, guestFingerprint: 'fp-1' }));
    expect(res.status).toBe(200);
    expect(attemptWrites()[0].payload.guest_fingerprint).toBe('fp-1');
    expect(attemptWrites()[0].payload.player_id).toBeUndefined();
  });

  it('given an inflated efficiencyScore and life, when submitted, then both are clamped to what the run can earn', async () => {
    const res = await request(app()).post('/submit').send(body({ lifeRemaining: 5000 }));
    expect(res.status).toBe(200);
    const expected = getScoreBreakdown(100, 2, 2, true).total;
    expect(attemptWrites()[0].payload.efficiency_score).toBe(expected);
    expect(attemptWrites()[0].payload.life_remaining).toBe(100);
    expect(h.leaderboardPointsForGame).toHaveBeenCalledWith('daily', expected);
  });

  it('given an honest score, when submitted, then it is stored unchanged', async () => {
    const honest = getScoreBreakdown(42.6, 2, 2, true).total;
    await request(app()).post('/submit').send(body({ lifeRemaining: 42.6, efficiencyScore: honest }));
    expect(attemptWrites()[0].payload.efficiency_score).toBe(honest);
  });

  it('given an existing solved row, when re-submitted, then it reports alreadySubmitted and writes nothing', async () => {
    h.state.existing = { id: 'row-1', solved: true, extra_tries: 0, efficiency_score: 700 };
    const res = await request(app()).post('/submit').send(body());
    expect(res.status).toBe(200);
    expect(res.body.alreadySubmitted).toBe(true);
    expect(attemptWrites()).toHaveLength(0);
  });

  it('given an existing unsolved row with a higher score, when a retry lands lower, then the stored best is kept', async () => {
    h.state.existing = { id: 'row-1', solved: false, extra_tries: 0, efficiency_score: 900 };
    await request(app()).post('/submit').send(body({ solved: false, attemptWords: [{ word: 'PLANES', feedback: [] }], efficiencyScore: 0 }));
    const update = attemptWrites().find((w) => w.op === 'update');
    expect(update?.payload.efficiency_score).toBe(900);
  });

  it('given solved=true without the target among the attempts, when submitted, then the solve claim is refused', async () => {
    const res = await request(app()).post('/submit').send(body({ attemptWords: [{ word: 'PLANES', feedback: [] }] }));
    expect(res.status).toBe(400);
    expect(attemptWrites()).toHaveLength(0);
  });

  it('given a past date sent with isCatchup=false, when submitted, then the row is stored as catch-up', async () => {
    await request(app()).post('/submit').send(body({ puzzleDate: '2026-10-28', isCatchup: false }));
    expect(attemptWrites()[0].payload.is_catchup).toBe(true);
  });

  it('given today sent with isCatchup=true, when submitted, then the row is not catch-up', async () => {
    await request(app()).post('/submit').send(body({ isCatchup: true }));
    expect(attemptWrites()[0].payload.is_catchup).toBe(false);
  });

  it('given a run that straddled UTC midnight, when submitted moments later without the flag, then it stays a normal play', async () => {
    vi.setSystemTime(new Date(`${TODAY}T00:05:00.000Z`));
    await request(app()).post('/submit').send(body({ puzzleDate: '2026-10-29', isCatchup: false }));
    expect(attemptWrites()[0].payload.is_catchup).toBe(false);
  });
});
