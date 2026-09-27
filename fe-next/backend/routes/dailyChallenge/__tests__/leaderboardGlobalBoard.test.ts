/**
 * The daily boards must be able to show EVERYONE who played today.
 *
 * Symptoms this pins:
 *  - a signed-in player who solved today's Hebrew hunt opened the hub in another
 *    UI locale and saw an empty board (the board was scoped to the UI language);
 *  - a player who failed the hunt was dropped entirely (`solved = true` filter);
 *  - Word Wheel guests were recorded but hidden (`player_id IS NOT NULL` filter),
 *    while Word Hunt guests were shown — two routes, two contracts.
 *
 * `language = 'all'` requests the cross-language board. A concrete language keeps
 * the per-language filter (see leaderboardLanguageFilter.test.ts).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { type Router } from 'express';
import request from 'supertest';

const h = vi.hoisted(() => {
  type Call = { method: string; args: unknown[] };
  const queries: Array<{ table: string; calls: Call[] }> = [];
  function makeBuilder(table: string) {
    const record = { table, calls: [] as Call[] };
    queries.push(record);
    const b: Record<string, unknown> = {};
    const mk = (name: string) => (...args: unknown[]) => {
      record.calls.push({ method: name, args });
      return b;
    };
    for (const n of ['select', 'eq', 'not', 'is', 'gt', 'lt', 'order', 'limit', 'maybeSingle', 'single', 'in']) {
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

import wordHuntRoutes from '../wordHuntRoutes';
import wordWheelRoutes from '../wordWheelRoutes';
import { dedupeByPlayerKeepBest } from '../leaderboardSort';

const DATE = '2026-09-07';

async function getLeaderboard(router: Router, language: string) {
  const app = express();
  app.use(express.json());
  app.use('/', router);
  return request(app).get(`/leaderboard/${DATE}/${language}`);
}

function viewQuery(viewTable: string) {
  const match = h.queries.find(q => q.table === viewTable);
  expect(match, `expected a query against ${viewTable}`).toBeTruthy();
  return match!;
}

const eqs = (q: { calls: Array<{ method: string; args: unknown[] }> }) =>
  q.calls.filter(c => c.method === 'eq').map(c => c.args as [string, unknown]);

describe('daily boards: language=all is the cross-language board', () => {
  beforeEach(() => {
    h.queries.length = 0;
    h.supabaseMock.from.mockClear();
  });

  it('Word Hunt: accepts "all" and drops the language filter', async () => {
    const res = await getLeaderboard(wordHuntRoutes, 'all');
    expect(res.status).toBe(200);
    expect(res.body.language).toBe('all');
    const q = viewQuery('daily_word_hunt_leaderboard');
    expect(eqs(q).find(([field]) => field === 'language')).toBeUndefined();
    expect(eqs(q).find(([field]) => field === 'puzzle_date')?.[1]).toBe(DATE);
  });

  it('Word Hunt: the count queries are also cross-language', async () => {
    await getLeaderboard(wordHuntRoutes, 'all');
    const attemptQueries = h.queries.filter(q => q.table === 'daily_word_hunt_attempts');
    expect(attemptQueries.length).toBeGreaterThan(0);
    for (const q of attemptQueries) {
      expect(eqs(q).find(([field]) => field === 'language')).toBeUndefined();
    }
  });

  it('Word Hunt: players who failed today still appear (no solved=true filter)', async () => {
    await getLeaderboard(wordHuntRoutes, 'he');
    const q = viewQuery('daily_word_hunt_leaderboard');
    expect(eqs(q).find(([field]) => field === 'solved')).toBeUndefined();
  });

  it('Word Wheel: accepts "all" and drops the language filter', async () => {
    const res = await getLeaderboard(wordWheelRoutes, 'all');
    expect(res.status).toBe(200);
    expect(res.body.language).toBe('all');
    const q = viewQuery('daily_word_wheel_leaderboard');
    expect(eqs(q).find(([field]) => field === 'language')).toBeUndefined();
  });

  it('Word Wheel: guests are shown, matching Word Hunt', async () => {
    await getLeaderboard(wordWheelRoutes, 'he');
    const q = viewQuery('daily_word_wheel_leaderboard');
    const authOnly = q.calls.find(c => c.method === 'not' && c.args[0] === 'player_id');
    expect(authOnly).toBeUndefined();
  });

  it('still rejects an unknown language code', async () => {
    const res = await getLeaderboard(wordHuntRoutes, 'xx');
    expect(res.status).toBe(400);
  });
});

describe('dedupeByPlayerKeepBest: guests collapse by fingerprint on a global board', () => {
  it('keeps one row per guest fingerprint (best first)', () => {
    const rows = [
      { player_id: null, guest_fingerprint: 'fp-1', score: 9 },
      { player_id: null, guest_fingerprint: 'fp-1', score: 4 },
      { player_id: null, guest_fingerprint: 'fp-2', score: 3 },
    ];
    const out = dedupeByPlayerKeepBest(rows);
    expect(out).toHaveLength(2);
    expect(out[0].score).toBe(9);
    expect(out[1].guest_fingerprint).toBe('fp-2');
  });

  it('rows with neither id nor fingerprint are never collapsed', () => {
    const rows = [
      { player_id: null, guest_fingerprint: null, score: 5 },
      { player_id: null, guest_fingerprint: null, score: 4 },
    ];
    expect(dedupeByPlayerKeepBest(rows)).toHaveLength(2);
  });
});
