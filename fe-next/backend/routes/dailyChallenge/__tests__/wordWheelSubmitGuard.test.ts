import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { generateWordWheelPuzzle } from '../../../../utils/dailyChallenge/wordWheelGeneration';
import { goldLetterFor, scoreWord } from '../../../../utils/dailyChallenge/wordWheelScoring';

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
vi.mock('../../../utils/logger', () => ({ default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

import router from '../wordWheelRoutes';

const app = express();
app.use(express.json());
app.use('/', router);

const TODAY = '2026-11-05';
const puzzle = generateWordWheelPuzzle(TODAY, 'en');
const [c, o0, o1, o2] = [puzzle.centerLetter, ...puzzle.outerLetters];
const w3 = `${c}${o0}${o1}`;
const w4 = `${o2}${c}${o0}${o1}`;

const body = (over: Record<string, unknown> = {}) => ({
  puzzleDate: TODAY, puzzleNumber: 999, language: 'en', guestFingerprint: 'fp-1',
  score: 5000, wordCount: 99, wordsFound: [w3, w3, w4, 'ZZZZZ', 'NOCENTER'], longestWord: 'NOCENTER',
  timeSeconds: 99999, centerLetter: 'Q', isCatchup: false, ...over,
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(`${TODAY}T12:00:00Z`));
  h.state.inserted.length = 0;
  h.state.statsScores.length = 0;
  h.state.insertError = null;
  h.state.count = 0;
  h.state.resolve = { ok: true, playerId: null };
  h.awardCoinsServer.mockClear();
});
afterEach(() => vi.useRealTimers());

describe('POST /submit guards', () => {
  it('401s when the body playerId does not match the session', async () => {
    h.state.resolve = { ok: false, status: 401 };
    const res = await request(app).post('/submit').send(body({ playerId: 'victim', guestFingerprint: undefined }));
    expect(res.status).toBe(401);
    expect(h.state.inserted).toHaveLength(0);
  });

  it('rejects a date outside the submittable window', async () => {
    const res = await request(app).post('/submit').send(body({ puzzleDate: '2026-10-01' }));
    expect(res.status).toBe(400);
    const future = await request(app).post('/submit').send(body({ puzzleDate: '2026-11-06' }));
    expect(future.status).toBe(400);
  });

  it('rejects an unknown language', async () => {
    const res = await request(app).post('/submit').send(body({ language: 'xx' }));
    expect(res.status).toBe(400);
  });

  it('keeps only deduped words built from the wheel, clamps score and time, uses server puzzle facts', async () => {
    const res = await request(app).post('/submit').send(body());
    expect(res.status).toBe(200);
    const row = h.state.inserted[0];
    expect(row.words_found).toEqual([w3, w4]);
    expect(row.word_count).toBe(2);
    expect(row.longest_word).toBe(w4);
    const gold = goldLetterFor(puzzle);
    const cap = [w3, w4].reduce((s, w) => s + Math.round(scoreWord(w) * (gold && w.includes(gold) ? 1.5 : 1) * 2), 0);
    expect(row.score).toBe(cap);
    expect(row.center_letter).toBe(puzzle.centerLetter);
    expect(row.puzzle_number).toBe(puzzle.puzzleNumber);
    expect(row.time_seconds).toBeLessThanOrEqual(300);
  });

  it('keeps an honest lower score', async () => {
    await request(app).post('/submit').send(body({ score: 10 }));
    expect(h.state.inserted[0].score).toBe(10);
  });

  it('feeds the clamped score to profile stats', async () => {
    h.state.resolve = { ok: true, playerId: 'p1' };
    await request(app).post('/submit').send(body({ playerId: 'p1', guestFingerprint: undefined }));
    expect(h.state.statsScores[0]).toBe(h.state.inserted[0].score);
    expect(h.state.inserted[0].player_id).toBe('p1');
  });

  it('derives catch-up from the date, not the client flag', async () => {
    await request(app).post('/submit').send(body({ isCatchup: true }));
    expect(h.state.inserted[0].is_catchup).toBe(false);
    await request(app).post('/submit').send(body({ puzzleDate: '2026-11-03', isCatchup: false }));
    expect(h.state.inserted[1].is_catchup).toBe(true);
  });

  it('a run that straddles midnight UTC stays a normal play', async () => {
    vi.setSystemTime(new Date(`${TODAY}T00:03:00Z`));
    await request(app).post('/submit').send(body({ puzzleDate: '2026-11-04', isCatchup: false }));
    expect(h.state.inserted[0].is_catchup).toBe(false);
  });
});

describe('gold-letter coins', () => {
  const goldDay = (() => {
    for (let d = 1; d <= 28; d++) {
      const date = `2026-11-${String(d).padStart(2, '0')}`;
      const p = generateWordWheelPuzzle(date, 'en');
      const g = goldLetterFor(p);
      if (g) return { date, p, g };
    }
    throw new Error('no gold day');
  })();
  const goldWord = (() => {
    const { p, g } = goldDay;
    const rest = p.outerLetters.filter(l => l !== g);
    return `${p.centerLetter}${g}${rest[0]}`;
  })();

  beforeEach(() => vi.setSystemTime(new Date(`${goldDay.date}T12:00:00Z`)));

  it('awards coins once to an authed player on a fresh row', async () => {
    h.state.resolve = { ok: true, playerId: 'p1' };
    await request(app).post('/submit').send(body({ puzzleDate: goldDay.date, playerId: 'p1', guestFingerprint: undefined, wordsFound: [goldWord] }));
    expect(h.awardCoinsServer).toHaveBeenCalledTimes(1);
    expect(h.awardCoinsServer.mock.calls[0][0]).toBe('p1');
    expect(h.awardCoinsServer.mock.calls[0][1]).toBe(2);
  });

  it('pays nothing for a second language on the same day', async () => {
    h.state.resolve = { ok: true, playerId: 'p1' };
    h.state.count = 1;
    await request(app).post('/submit').send(body({ puzzleDate: goldDay.date, playerId: 'p1', guestFingerprint: undefined, wordsFound: [goldWord] }));
    expect(h.awardCoinsServer).not.toHaveBeenCalled();
  });

  it('never awards on a resubmit or to a guest', async () => {
    await request(app).post('/submit').send(body({ puzzleDate: goldDay.date, wordsFound: [goldWord] }));
    h.state.resolve = { ok: true, playerId: 'p1' };
    h.state.insertError = { code: '23505', message: 'dup' };
    await request(app).post('/submit').send(body({ puzzleDate: goldDay.date, playerId: 'p1', guestFingerprint: undefined, wordsFound: [goldWord] }));
    expect(h.awardCoinsServer).not.toHaveBeenCalled();
  });
});

describe('every wheel language', () => {
  it.each(['en', 'he', 'sv', 'ja', 'es', 'ru'])('%s: a word built from the server-generated puzzle is kept', async (lang) => {
    const p = generateWordWheelPuzzle(TODAY, lang as never);
    const word = `${p.centerLetter}${p.outerLetters[0]}${p.outerLetters[1]}`;
    const res = await request(app).post('/submit').send(body({ language: lang, wordsFound: [word], score: 1 }));
    expect(res.status).toBe(200);
    expect(h.state.inserted.at(-1)?.words_found).toEqual([word.toUpperCase()]);
  });
});
