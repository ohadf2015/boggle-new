/**
 * Guest habit-layer tests for Word Hunt: a guest should show up on the daily
 * leaderboard and be able to read their streak, on the same rules as an
 * authenticated player.
 *
 * Regression coverage for two bugs:
 * 1. The leaderboard route used to filter `.not('player_id', 'is', null)`,
 *    silently dropping every guest row even though they were already written
 *    and counted (guestPlayerCount). That filter must be gone.
 * 2. /check-played only read word_hunt_player_stats (current_streak /
 *    longest_streak) when a playerId was present, so a guest's row — which
 *    the update_word_hunt_player_stats() DB trigger maintains identically for
 *    guest_fingerprint (migrations 020, 067) — was never read back.
 *
 * Also covers the new standalone GET /streak endpoint, which reads a streak
 * without requiring an attempt on today's specific date.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Recording Supabase mock: each table gets its own canned resolver so a single
// test can make e.g. `word_hunt_player_stats` return a specific streak while
// `daily_word_hunt_attempts` returns a specific existing row. Every builder
// method is chainable and records `eq`/`not`/`is` calls so tests can assert on
// exactly what the route asked the DB for.
const h = vi.hoisted(() => {
  const queries: Array<{ table: string; eqs: Array<[string, unknown]>; nots: Array<[string, unknown, unknown]> }> = [];
  const resolvers: Record<string, () => { data: unknown; error: unknown; count?: number }> = {};

  function makeBuilder(table: string) {
    const record = { table, eqs: [] as Array<[string, unknown]>, nots: [] as Array<[string, unknown, unknown]> };
    queries.push(record);
    const b: Record<string, unknown> = {};
    const chain = (name: string) => (...args: unknown[]) => {
      if (name === 'eq') record.eqs.push(args as [string, unknown]);
      if (name === 'not') record.nots.push(args as [string, unknown, unknown]);
      return b;
    };
    for (const n of ['select', 'eq', 'not', 'is', 'gt', 'lt', 'order', 'limit']) {
      b[n] = chain(n);
    }
    const resolve = () => {
      const r = resolvers[table];
      return r ? r() : { data: null, error: null, count: 0 };
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

describe('Word Hunt leaderboard includes guests', () => {
  beforeEach(() => {
    h.queries.length = 0;
    Object.keys(h.resolvers).forEach((k) => delete h.resolvers[k]);
    h.supabaseMock.from.mockClear();
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
    h.queries.length = 0;
    Object.keys(h.resolvers).forEach((k) => delete h.resolvers[k]);
    h.supabaseMock.from.mockClear();

    h.resolvers['daily_word_hunt_attempts'] = () => ({
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
    });
    h.resolvers['word_hunt_player_stats'] = () => ({
      data: { current_streak: 3, longest_streak: 5, last_played_date: '2026-08-30' },
      error: null,
    });
  });

  it('reads the guest_fingerprint row and returns its streak, not a zeroed default', async () => {
    const res = await request(app())
      .get('/check-played/2026-08-30/en')
      .query({ guestFingerprint: 'guest-abc' });

    expect(res.status).toBe(200);
    expect(res.body.hasPlayed).toBe(true);
    expect(res.body.streak).toEqual({ currentStreak: 3, longestStreak: 5 });

    const statsQuery = tableQueries('word_hunt_player_stats')[0];
    expect(statsQuery.eqs).toContainEqual(['guest_fingerprint', 'guest-abc']);
  });
});

describe('GET /streak', () => {
  beforeEach(() => {
    h.queries.length = 0;
    Object.keys(h.resolvers).forEach((k) => delete h.resolvers[k]);
    h.supabaseMock.from.mockClear();
  });

  it('requires either playerId or guestFingerprint', async () => {
    const res = await request(app()).get('/streak');
    expect(res.status).toBe(400);
  });

  it('reads a streak for a guest without any attempt row for today', async () => {
    h.resolvers['word_hunt_player_stats'] = () => ({
      data: { current_streak: 2, longest_streak: 4, last_played_date: '2026-08-29' },
      error: null,
    });

    const res = await request(app()).get('/streak').query({ guestFingerprint: 'guest-xyz' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ currentStreak: 2, longestStreak: 4, lastPlayedDate: '2026-08-29' });

    const statsQuery = tableQueries('word_hunt_player_stats')[0];
    expect(statsQuery.eqs).toContainEqual(['guest_fingerprint', 'guest-xyz']);
  });

  it('reads a streak for an authenticated player by player_id', async () => {
    h.resolvers['word_hunt_player_stats'] = () => ({
      data: { current_streak: 7, longest_streak: 7, last_played_date: '2026-08-30' },
      error: null,
    });

    const res = await request(app()).get('/streak').query({ playerId: 'player-123' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ currentStreak: 7, longestStreak: 7, lastPlayedDate: '2026-08-30' });

    const statsQuery = tableQueries('word_hunt_player_stats')[0];
    expect(statsQuery.eqs).toContainEqual(['player_id', 'player-123']);
  });

  it('defaults to zero when no stats row exists yet', async () => {
    h.resolvers['word_hunt_player_stats'] = () => ({ data: null, error: null });

    const res = await request(app()).get('/streak').query({ guestFingerprint: 'brand-new-guest' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ currentStreak: 0, longestStreak: 0, lastPlayedDate: null });
  });
});
