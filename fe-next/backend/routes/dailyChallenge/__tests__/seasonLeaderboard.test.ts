/**
 * Daily-challenge SEASON leaderboards.
 *
 * The `daily_word_hunt_season_leaderboard` / `daily_word_wheel_season_leaderboard`
 * views exist (migration 20260501061607) but had no consumer: the daily board
 * offered only "today" and "all time", so a strong month was invisible the day
 * after it ended. The views are partitioned per (season, language); the route
 * folds a player's languages into one global row, mirroring the all-time boards.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

import {
  aggregateSeasonRows,
  __resetSeasonCacheForTests,
  type SeasonViewRow,
} from '../seasonLeaderboard';

const h = vi.hoisted(() => {
  type Call = { method: string; args: unknown[] };
  const queries: Array<{ table: string; calls: Call[]; result: unknown }> = [];
  const results: Record<string, unknown> = {};
  function makeBuilder(table: string) {
    const record = { table, calls: [] as Call[], result: results[table] ?? { data: [], error: null, count: 0 } };
    queries.push(record);
    const b: Record<string, unknown> = {};
    const mk = (name: string) => (...args: unknown[]) => {
      record.calls.push({ method: name, args });
      return b;
    };
    for (const n of ['select', 'eq', 'not', 'is', 'gt', 'lt', 'lte', 'gte', 'order', 'limit', 'maybeSingle', 'single', 'in']) {
      b[n] = mk(n);
    }
    b.then = (resolve: (v: unknown) => unknown) => resolve(record.result);
    return b;
  }
  return { queries, results, supabaseMock: { from: vi.fn((t: string) => makeBuilder(t)) } };
});

vi.mock('../../../modules/supabaseServer', () => ({
  getSupabase: vi.fn(() => h.supabaseMock),
  isSupabaseConfigured: vi.fn(() => true),
}));

import wordHuntRoutes from '../wordHuntRoutes';
import wordWheelRoutes from '../wordWheelRoutes';
import dailyChallengeRoutes from '../../dailyChallenge';

const row = (over: Partial<SeasonViewRow>): SeasonViewRow => ({
  season_id: 6,
  player_id: 'p1',
  username: 'p1',
  avatar_emoji: '🎯',
  avatar_color: '#000',
  language: 'en',
  season_score: 0,
  attempts: 1,
  last_played_at: '2026-09-05T10:00:00Z',
  rank_position: 1,
  ...over,
});

describe('aggregateSeasonRows', () => {
  it('folds one player across languages into a single row and ranks by season score', () => {
    const rows = [
      row({ player_id: 'poly', language: 'he', season_score: 300, attempts: 3, solves: 2 }),
      row({ player_id: 'poly', language: 'en', season_score: 200, attempts: 2, solves: 1 }),
      row({ player_id: 'mono', language: 'en', season_score: 450, attempts: 4, solves: 4 }),
    ];
    const out = aggregateSeasonRows(rows, 'all');
    expect(out.map(r => r.player_id)).toEqual(['poly', 'mono']);
    expect(out[0]).toMatchObject({
      season_score: 500,
      days_played: 5,
      solves: 3,
      rank_position: 1,
    });
    expect(out[0].languages.sort()).toEqual(['en', 'he']);
    expect(out[1].rank_position).toBe(2);
  });

  it('keeps only the requested language when the scope is concrete', () => {
    const rows = [
      row({ player_id: 'poly', language: 'he', season_score: 300 }),
      row({ player_id: 'poly', language: 'en', season_score: 200 }),
      row({ player_id: 'sv-only', language: 'sv', season_score: 999 }),
    ];
    const out = aggregateSeasonRows(rows, 'en');
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ player_id: 'poly', season_score: 200, languages: ['en'] });
  });

  it('parses bigint columns that PostgREST returns as strings', () => {
    const rows = [row({ player_id: 'a', season_score: '120' as unknown as number, attempts: '7' as unknown as number, solves: '5' as unknown as number })];
    const out = aggregateSeasonRows(rows, 'all');
    expect(out[0]).toMatchObject({ season_score: 120, days_played: 7, solves: 5 });
  });

  it('breaks score ties by solves, then by who got there first', () => {
    const rows = [
      row({ player_id: 'late', season_score: 100, solves: 1, last_played_at: '2026-09-06T00:00:00Z' }),
      row({ player_id: 'early', season_score: 100, solves: 1, last_played_at: '2026-09-02T00:00:00Z' }),
      row({ player_id: 'solver', season_score: 100, solves: 3, last_played_at: '2026-09-07T00:00:00Z' }),
    ];
    expect(aggregateSeasonRows(rows, 'all').map(r => r.player_id)).toEqual(['solver', 'early', 'late']);
  });

  it('drops zero-score carry-only rows so a fresh season does not list ghosts', () => {
    const rows = [
      row({ player_id: 'ghost', season_score: 0, attempts: 0 }),
      row({ player_id: 'real', season_score: 10, attempts: 1 }),
    ];
    expect(aggregateSeasonRows(rows, 'all').map(r => r.player_id)).toEqual(['real']);
  });
});

async function get(path: string, router = dailyChallengeRoutes) {
  const app = express();
  app.use(express.json());
  app.use('/', router);
  return request(app).get(path);
}

describe('season leaderboard routes', () => {
  beforeEach(() => {
    h.queries.length = 0;
    for (const k of Object.keys(h.results)) delete h.results[k];
    h.supabaseMock.from.mockClear();
    __resetSeasonCacheForTests();
  });

  it('Word Hunt: reads the season view for the requested season, cross-language', async () => {
    h.results['daily_word_hunt_season_leaderboard'] = {
      data: [row({ player_id: 'p1', season_score: 50, solves: 2 })],
      error: null,
    };
    h.results['profiles'] = {
      data: [{ id: 'p1', display_name: 'Fish', username: 'fish', avatar_emoji: '🐟', avatar_color: '#0ff', avatar_image: null, profile_picture_url: null, avatar_config: null, country_code: 'IL' }],
      error: null,
    };
    const res = await get('/season-leaderboard/all?season=6', wordHuntRoutes);
    expect(res.status).toBe(200);
    const q = h.queries.find(q => q.table === 'daily_word_hunt_season_leaderboard')!;
    expect(q.calls.find(c => c.method === 'eq' && c.args[0] === 'season_id')?.args[1]).toBe(6);
    expect(q.calls.find(c => c.method === 'eq' && c.args[0] === 'language')).toBeUndefined();
    expect(res.body.seasonId).toBe(6);
    expect(res.body.data[0]).toMatchObject({ player_id: 'p1', display_name: 'Fish', country_code: 'IL', season_score: 50, rank_position: 1 });
  });

  it('Word Wheel: filters by language when the scope is concrete', async () => {
    const res = await get('/season-leaderboard/he?season=5', wordWheelRoutes);
    expect(res.status).toBe(200);
    const q = h.queries.find(q => q.table === 'daily_word_wheel_season_leaderboard')!;
    expect(q.calls.find(c => c.method === 'eq' && c.args[0] === 'language')?.args[1]).toBe('he');
    expect(res.body.language).toBe('he');
  });

  it('defaults to the current season from the seasons table when none is given', async () => {
    h.results['seasons'] = { data: [{ id: 6 }], error: null };
    const res = await get('/season-leaderboard/all', wordHuntRoutes);
    expect(res.status).toBe(200);
    expect(res.body.seasonId).toBe(6);
    const q = h.queries.find(q => q.table === 'daily_word_hunt_season_leaderboard')!;
    expect(q.calls.find(c => c.method === 'eq' && c.args[0] === 'season_id')?.args[1]).toBe(6);
  });

  it('rejects a non-numeric season and an unknown language', async () => {
    expect((await get('/season-leaderboard/all?season=abc', wordHuntRoutes)).status).toBe(400);
    expect((await get('/season-leaderboard/xx?season=6', wordHuntRoutes)).status).toBe(400);
  });

  it('GET /seasons lists only seasons that have started, newest first, flagging the current one', async () => {
    h.results['seasons'] = {
      data: [
        { id: 6, name: 'Season 6: Lexicon Lords', theme: 'Lexicon Lords', start_date: '2026-09-01T00:00:00Z', end_date: '2026-10-01T00:00:00Z', status: 'active' },
        { id: 5, name: 'Season 5: Phonic Phenoms', theme: 'Phonic Phenoms', start_date: '2026-08-01T00:00:00Z', end_date: '2026-09-01T00:00:00Z', status: 'closed' },
      ],
      error: null,
    };
    const res = await get('/seasons');
    expect(res.status).toBe(200);
    const q = h.queries.find(q => q.table === 'seasons')!;
    // Started seasons only: the seed inserts future months as `active`, so
    // status alone cannot be the filter.
    expect(q.calls.find(c => c.method === 'lte' && c.args[0] === 'start_date')).toBeTruthy();
    expect(res.body.seasons.map((s: { id: number }) => s.id)).toEqual([6, 5]);
    expect(res.body.currentSeasonId).toBe(6);
    expect(res.body.seasons[0]).toMatchObject({ id: 6, theme: 'Lexicon Lords', isCurrent: true });
    expect(res.body.seasons[1].isCurrent).toBe(false);
  });
});
