/**
 * Daily-challenge leaderboards must be scoped to a SINGLE language.
 *
 * Each language plays a DIFFERENT board/target word, so merging languages into one
 * leaderboard means a player sees (and is told they "missed") words from boards they
 * never played. The fix filters every per-puzzle leaderboard query by `language`.
 *
 * These tests pin that filter on all three daily leaderboard routes (Word Hunt,
 * Word Wheel, classic daily puzzle) so the cross-language regression cannot return.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { type Router } from 'express';
import request from 'supertest';

// Recording Supabase mock (built inside vi.hoisted so it exists before the hoisted
// vi.mock factory runs). Every builder method returns the same chainable builder and
// records its `eq(field, value)` calls; the builder is thenable so `await query`
// resolves to an empty result set / zero count.
const h = vi.hoisted(() => {
  const queries: Array<{ table: string; eqs: Array<[string, unknown]> }> = [];
  function makeBuilder(table: string) {
    const record = { table, eqs: [] as Array<[string, unknown]> };
    queries.push(record);
    const b: Record<string, unknown> = {};
    const mk = (name: string) => (...args: unknown[]) => {
      if (name === 'eq') record.eqs.push(args as [string, unknown]);
      return b;
    };
    for (const n of ['select', 'eq', 'not', 'is', 'gt', 'lt', 'order', 'limit', 'maybeSingle', 'single']) {
      b[n] = mk(n);
    }
    b.then = (resolve: (v: unknown) => unknown) => resolve({ data: [], error: null, count: 0 });
    return b;
  }
  return { queries, supabaseMock: { from: vi.fn((t: string) => makeBuilder(t)) } };
});

vi.mock('../../../modules/supabaseServer', () => ({
  getSupabase: vi.fn(() => h.supabaseMock),
  isSupabaseConfigured: vi.fn(() => true),
}));

// Classic route reads/writes a redis-backed leaderboard cache. Force a miss + no-op
// write so the route falls through to the DB query we want to assert on.
vi.mock('../../../redisClient', async (orig) => {
  const actual = await (orig() as Promise<Record<string, unknown>>);
  return {
    ...actual,
    getCachedDailyPuzzle: vi.fn(() => Promise.resolve(null)),
    getCachedDailyLeaderboard: vi.fn(() => Promise.resolve(null)),
    cacheDailyLeaderboard: vi.fn(() => Promise.resolve()),
  };
});

import wordHuntRoutes from '../wordHuntRoutes';
import wordWheelRoutes from '../wordWheelRoutes';
import dailyChallengeRoutes from '../../dailyChallenge';

const LANG = 'sv';
const DATE = '2026-06-27';

async function getLeaderboard(router: Router) {
  const app = express();
  app.use(express.json());
  app.use('/', router);
  return request(app).get(`/leaderboard/${DATE}/${LANG}`);
}

function viewQuery(viewTable: string) {
  const match = h.queries.find(q => q.table === viewTable);
  expect(match, `expected a query against ${viewTable}`).toBeTruthy();
  return match!;
}

describe('daily-challenge leaderboards are language-scoped', () => {
  beforeEach(() => {
    h.queries.length = 0;
    h.supabaseMock.from.mockClear();
  });

  it('Word Hunt leaderboard filters the view by language', async () => {
    await getLeaderboard(wordHuntRoutes);
    const q = viewQuery('daily_word_hunt_leaderboard');
    expect(q.eqs).toContainEqual(['language', LANG]);
    expect(q.eqs).toContainEqual(['puzzle_date', DATE]);
  });

  it('Word Hunt participant counts are language-scoped', async () => {
    await getLeaderboard(wordHuntRoutes);
    const counts = h.queries.filter(q => q.table === 'daily_word_hunt_attempts');
    expect(counts.length).toBeGreaterThan(0);
    for (const c of counts) {
      expect(c.eqs).toContainEqual(['language', LANG]);
    }
  });

  it('Word Wheel leaderboard filters the view by language', async () => {
    await getLeaderboard(wordWheelRoutes);
    expect(viewQuery('daily_word_wheel_leaderboard').eqs).toContainEqual(['language', LANG]);
  });

  it('classic daily leaderboard filters the view by language', async () => {
    await getLeaderboard(dailyChallengeRoutes);
    expect(viewQuery('daily_puzzle_leaderboard').eqs).toContainEqual(['language', LANG]);
  });
});
