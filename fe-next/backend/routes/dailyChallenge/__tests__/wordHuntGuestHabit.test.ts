/**
 * Guest habit-layer tests for Word Hunt: a guest should show up on the daily
 * leaderboard and be able to read their streak, on the same rules as an
 * authenticated player.
 *
 * Regression coverage:
 * 1. The leaderboard route used to filter `.not('player_id', 'is', null)`,
 *    silently dropping every guest row even though they were already written
 *    and counted (guestPlayerCount). That filter must be gone.
 * 2. /check-played only read a streak when a playerId was present. The read
 *    it used to do — word_hunt_player_stats.current_streak — turned out to be
 *    dead in production (verified directly against the live DB: the table
 *    doesn't exist, no trigger writes it), so it was already broken for
 *    authenticated players too. The fix reads the same cross-mode streak the
 *    authenticated weekly-chest endpoint already computes from live attempt
 *    tables (fetchDailyStreak / computeCurrentStreak), keyed by idColumn so a
 *    guest_fingerprint works exactly like a player_id.
 *
 * Also covers the new standalone GET /streak endpoint, which reads a streak
 * without requiring an attempt on today's specific date.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// fetchDailyStreak() anchors "today" on `new Date()`. Pin it so the fixture
// dates below (chosen relative to 2026-08-30) produce deterministic streaks
// regardless of the real calendar date the suite runs on.
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-08-30T12:00:00.000Z'));
});
afterEach(() => {
  vi.useRealTimers();
});

// Recording Supabase mock: each table gets its own resolver, given the
// recorded query (select/eq/not calls) so a single table queried two
// different ways in the same request (e.g. daily_word_hunt_attempts: once
// for "does today's row exist", once for "every solved date ever") can return
// two different shapes. Every builder method is chainable and records what
// was asked for, so tests can assert on exactly what the route queried.
const h = vi.hoisted(() => {
  type QueryRecord = {
    table: string;
    select: string;
    eqs: Array<[string, unknown]>;
    nots: Array<[string, unknown, unknown]>;
  };
  const queries: QueryRecord[] = [];
  const resolvers: Record<string, (record: QueryRecord) => { data: unknown; error: unknown; count?: number }> = {};

  function makeBuilder(table: string) {
    const record: QueryRecord = { table, select: '', eqs: [], nots: [] };
    queries.push(record);
    const b: Record<string, unknown> = {};
    const chain = (name: string) => (...args: unknown[]) => {
      if (name === 'select') record.select = String(args[0] ?? '');
      if (name === 'eq') record.eqs.push(args as [string, unknown]);
      if (name === 'not') record.nots.push(args as [string, unknown, unknown]);
      return b;
    };
    for (const n of ['select', 'eq', 'not', 'is', 'gt', 'lt', 'order', 'limit']) {
      b[n] = chain(n);
    }
    const resolve = () => {
      const r = resolvers[table];
      return r ? r(record) : { data: null, error: null, count: 0 };
    };
    b.single = () => Promise.resolve(resolve());
    b.maybeSingle = () => Promise.resolve(resolve());
    b.then = (onFulfilled: (v: unknown) => unknown) => Promise.resolve(resolve()).then(onFulfilled);
    return b;
  }

  return {
    queries,
    resolvers,
    supabaseMock: { from: vi.fn((t: string) => makeBuilder(t)) },
  };
});

vi.mock('../../../modules/supabaseServer', () => ({
  getSupabase: vi.fn(() => h.supabaseMock),
  isSupabaseConfigured: vi.fn(() => true),
}));

import wordHuntRoutes from '../wordHuntRoutes';

function app() {
  const a = express();
  a.use(express.json());
  a.use('/', wordHuntRoutes);
  return a;
}

function tableQueries(table: string) {
  return h.queries.filter((q) => q.table === table);
}

function resetMock() {
  h.queries.length = 0;
  Object.keys(h.resolvers).forEach((k) => delete h.resolvers[k]);
  h.supabaseMock.from.mockClear();
}

// The three tables fetchDailyStreak() combines, all empty by default.
function stubEmptyStreakTables() {
  h.resolvers['daily_puzzle_attempts'] = () => ({ data: [], error: null });
  h.resolvers['daily_word_hunt_attempts'] = () => ({ data: [], error: null });
  h.resolvers['daily_word_wheel_attempts'] = () => ({ data: [], error: null });
}

describe('Word Hunt leaderboard includes guests', () => {
  beforeEach(() => {
    resetMock();
    h.resolvers['daily_word_hunt_leaderboard'] = () => ({ data: [], error: null });
    h.resolvers['daily_word_hunt_attempts'] = () => ({ data: [], error: null, count: 0 });
  });

  it('does not filter the ranked query by player_id (guests stay in)', async () => {
    await request(app()).get('/leaderboard/2026-08-30/en');

    const leaderboardQuery = tableQueries('daily_word_hunt_leaderboard')[0];
    expect(leaderboardQuery).toBeTruthy();
    expect(leaderboardQuery.nots.some(([field]) => field === 'player_id')).toBe(false);
  });

  it('does not filter the solved-count query by player_id either', async () => {
    await request(app()).get('/leaderboard/2026-08-30/en');

    // Multiple `daily_word_hunt_attempts` count queries fire (solved count,
    // total players, total solved, guest-solved). None of the counts that
    // feed totalParticipants should exclude guests via a player_id filter —
    // only the dedicated guestSolvedCount query is expected to filter on
    // player_id (with `.is`, not `.not`), and that one is intentional.
    const counts = tableQueries('daily_word_hunt_attempts');
    expect(counts.length).toBeGreaterThan(0);
    for (const q of counts) {
      expect(q.nots.some(([field]) => field === 'player_id')).toBe(false);
    }
  });
});

describe('GET /check-played includes a guest streak', () => {
  beforeEach(() => {
    resetMock();
    stubEmptyStreakTables();

    // daily_word_hunt_attempts is queried twice in this flow: once for
    // "does today's row exist" (select includes 'id'), once inside
    // fetchDailyStreak for "every solved date ever" (select is 'puzzle_date').
    // Branch on that to give each call its own shape.
    h.resolvers['daily_word_hunt_attempts'] = (record) => {
      if (record.select.includes('id')) {
        return {
          data: {
            id: 'attempt-1',
            solved: true,
            attempts_used: 4,
            efficiency_score: 80,
            words_discovered: [],
            life_remaining: 1,
            target_word: 'WORD',
            attempt_words: [],
            completed_at: '2026-08-30T12:00:00.000Z',
            clue_tokens_earned: 0,
            clue_tokens_spent: 0,
            hints_unlocked: 0,
          },
          error: null,
        };
      }
      return { data: [{ puzzle_date: '2026-08-30' }, { puzzle_date: '2026-08-29' }, { puzzle_date: '2026-08-28' }], error: null };
    };
  });

  it('reads the guest_fingerprint identity and returns a real cross-mode streak, not a zeroed default', async () => {
    const res = await request(app())
      .get('/check-played/2026-08-30/en')
      .query({ guestFingerprint: 'guest-abc' });

    expect(res.status).toBe(200);
    expect(res.body.hasPlayed).toBe(true);
    expect(res.body.streak).toEqual({ currentStreak: 3 });

    const huntQueries = tableQueries('daily_word_hunt_attempts');
    const streakQuery = huntQueries.find((q) => !q.select.includes('id'));
    expect(streakQuery?.eqs).toContainEqual(['guest_fingerprint', 'guest-abc']);
  });
});

describe('GET /streak', () => {
  beforeEach(() => {
    resetMock();
    stubEmptyStreakTables();
  });

  it('requires either playerId or guestFingerprint', async () => {
    const res = await request(app()).get('/streak');
    expect(res.status).toBe(400);
  });

  it('reads a streak for a guest without any attempt row for today', async () => {
    h.resolvers['daily_word_hunt_attempts'] = () => ({
      data: [{ puzzle_date: '2026-08-29' }, { puzzle_date: '2026-08-28' }],
      error: null,
    });

    const res = await request(app()).get('/streak').query({ guestFingerprint: 'guest-xyz' });

    expect(res.status).toBe(200);
    // "today" is computed server-side as new Date() at test time, so last
    // played yesterday still counts as an active (grace) streak of 2.
    expect(res.body).toEqual({ currentStreak: 2, lastPlayedDate: '2026-08-29' });

    const huntQuery = tableQueries('daily_word_hunt_attempts')[0];
    expect(huntQuery.eqs).toContainEqual(['guest_fingerprint', 'guest-xyz']);
  });

  it('reads a streak for an authenticated player by player_id', async () => {
    h.resolvers['daily_puzzle_attempts'] = () => ({ data: [{ puzzle_date: '2026-08-30' }], error: null });

    const res = await request(app()).get('/streak').query({ playerId: 'player-123' });

    expect(res.status).toBe(200);
    expect(res.body.lastPlayedDate).toBe('2026-08-30');
    expect(res.body.currentStreak).toBeGreaterThanOrEqual(1);

    const puzzleQuery = tableQueries('daily_puzzle_attempts')[0];
    expect(puzzleQuery.eqs).toContainEqual(['player_id', 'player-123']);
  });

  it('defaults to zero/null when no attempts exist yet', async () => {
    const res = await request(app()).get('/streak').query({ guestFingerprint: 'brand-new-guest' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ currentStreak: 0, lastPlayedDate: null });
  });
});
