import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

type Row = Record<string, unknown>;

const h = vi.hoisted(() => {
  const state = {
    dailyRows: [] as Row[],
    alltimeRows: [] as Row[],
    testIds: [] as string[],
    profilesError: false,
    sessionUser: null as string | null,
    selects: [] as Array<{ table: string; columns: string }>,
    inflight: 0,
    maxInflight: 0,
  };
  function from(table: string) {
    const filters: Array<[string, string, unknown]> = [];
    let head = false;
    let inIds: string[] | null = null;
    const b: Record<string, unknown> = {};
    const chain = () => b;
    const settle = <T>(v: T) => {
      state.inflight++;
      state.maxInflight = Math.max(state.maxInflight, state.inflight);
      return new Promise<T>((r) => setTimeout(() => { state.inflight--; r(v); }, 5));
    };
    Object.assign(b, {
      select(columns: string, opts?: { head?: boolean }) {
        state.selects.push({ table, columns });
        head = !!opts?.head;
        return b;
      },
      eq(col: string, v: unknown) { filters.push(['eq', col, v]); return b; },
      lt(col: string, v: unknown) { filters.push(['lt', col, v]); return b; },
      gt: chain, not: chain, is: chain, order: chain, limit: chain, neq: chain,
      in(_c: string, ids: string[]) { inIds = ids; return b; },
      maybeSingle: async () => {
        const pid = filters.find(f => f[1] === 'player_id')?.[2];
        const src = table === 'word_hunt_alltime_leaderboard' ? state.alltimeRows : state.dailyRows;
        return { data: src.find(r => r.player_id === pid) ?? null, error: null };
      },
      then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
        if (table === 'profiles') {
          if (state.profilesError) return Promise.resolve({ data: null, error: { message: 'boom' } }).then(resolve, reject);
          const pool = inIds ?? state.testIds;
          const data = pool.map(id => ({ id, is_test_account: state.testIds.includes(id) }))
            .filter(p => inIds !== null || p.is_test_account);
          return Promise.resolve({ data, error: null }).then(resolve, reject);
        }
        if (head) {
          if (table === 'word_hunt_alltime_leaderboard' && inIds) {
            const ids = inIds;
            const lt = filters.find(f => f[0] === 'lt')?.[2] as number;
            const count = state.alltimeRows.filter(r => ids.includes(r.player_id as string) && (r.rank_position as number) < lt).length;
            return settle({ data: null, error: null, count }).then(resolve, reject);
          }
          return settle({ data: null, error: null, count: 7 }).then(resolve, reject);
        }
        const rows = table === 'word_hunt_alltime_leaderboard' ? state.alltimeRows : state.dailyRows;
        return settle({ data: rows, error: null }).then(resolve, reject);
      },
    });
    return b;
  }
  const supabase = {
    from,
    auth: { getUser: async () => ({ data: { user: state.sessionUser ? { id: state.sessionUser } : null }, error: state.sessionUser ? null : { message: 'no' } }) },
  };
  return { state, supabase };
});

vi.mock('../../../modules/supabaseServer', () => ({ isSupabaseConfigured: () => true, getSupabase: () => h.supabase }));
vi.mock('../../../utils/logger', () => ({ default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));
vi.mock('../../../../lib/auth/getAuthedUser', () => ({ cookieAccessToken: async () => null }));

import { wordHuntDailyBoard, wordHuntAlltimeBoard } from '../wordHuntBoards';

const app = express();
app.get('/leaderboard/:date/:language', wordHuntDailyBoard);
app.get('/alltime-leaderboard/:language', wordHuntAlltimeBoard);

const daily = (id: string, eff: number, extra: Row = {}): Row => ({
  player_id: id, guest_fingerprint: null, display_name: id, solved: true, efficiency_score: eff,
  attempts_used: 3, completed_at: '2026-11-05T10:00:00Z', language: 'en', words_discovered: ['cat'], ...extra,
});

beforeEach(() => {
  Object.assign(h.state, { dailyRows: [], alltimeRows: [], testIds: [], profilesError: false, sessionUser: null, selects: [], inflight: 0, maxInflight: 0 });
});

describe('Word Hunt daily board', () => {
  it('given a QA account on top, when read, then it is dropped and the rest renumbered', async () => {
    h.state.dailyRows = [daily('qa', 900), daily('a', 500), daily('b', 400)];
    h.state.testIds = ['qa'];
    const res = await request(app).get('/leaderboard/2026-11-05/en');
    expect(res.body.data.map((r: Row) => [r.player_id, r.rank_position])).toEqual([['a', 1], ['b', 2]]);
  });

  it('fails open when the test-account lookup errors', async () => {
    h.state.dailyRows = [daily('qa', 900), daily('a', 500)];
    h.state.profilesError = true;
    const res = await request(app).get('/leaderboard/2026-11-05/en');
    expect(res.body.data).toHaveLength(2);
  });

  it('names its columns (keeping words_discovered) instead of select(*)', async () => {
    h.state.dailyRows = [daily('a', 500)];
    await request(app).get('/leaderboard/2026-11-05/en');
    expect(h.state.selects.every(s => s.columns !== '*')).toBe(true);
    const board = h.state.selects.find(s => s.table === 'daily_word_hunt_leaderboard');
    expect(board?.columns).toContain('words_discovered');
  });

  it('runs the board read and its counts in parallel', async () => {
    h.state.dailyRows = [daily('a', 500)];
    await request(app).get('/leaderboard/2026-11-05/en');
    expect(h.state.maxInflight).toBeGreaterThanOrEqual(4);
  });

  it('appends a signed-in caller below the limit with their true rank, privately cached', async () => {
    h.state.dailyRows = [daily('a', 500), daily('b', 400), daily('me', 100)];
    h.state.sessionUser = 'me';
    const res = await request(app).get('/leaderboard/2026-11-05/en?limit=2').set('Authorization', 'Bearer t');
    expect(res.body.data.map((r: Row) => r.player_id)).toEqual(['a', 'b', 'me']);
    expect(res.body.data[2].rank_position).toBe(3);
    expect(res.headers['cache-control']).toContain('private');
  });

  it('true rank skips QA accounts ranked above the caller', async () => {
    h.state.dailyRows = [daily('qa', 900), daily('a', 500), daily('b', 400), daily('me', 100)];
    h.state.testIds = ['qa'];
    h.state.sessionUser = 'me';
    const res = await request(app).get('/leaderboard/2026-11-05/en?limit=1').set('Authorization', 'Bearer t');
    expect(res.body.data.at(-1)).toMatchObject({ player_id: 'me', rank_position: 3 });
  });

  it.each(['fp', 'guestFingerprint'])('appends a guest caller found by ?%s=', async (param) => {
    h.state.dailyRows = [daily('a', 500), daily('b', 400), daily('', 50, { player_id: null, guest_fingerprint: 'fp9' })];
    const res = await request(app).get(`/leaderboard/2026-11-05/en?limit=2&${param}=fp9`);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.data[2]).toMatchObject({ guest_fingerprint: 'fp9', rank_position: 3 });
  });

  it('does not duplicate a caller already on the page; anonymous reads stay public', async () => {
    h.state.dailyRows = [daily('a', 500), daily('me', 400)];
    h.state.sessionUser = 'me';
    const signed = await request(app).get('/leaderboard/2026-11-05/en?limit=2').set('Authorization', 'Bearer t');
    expect(signed.body.data).toHaveLength(2);
    const anon = await request(app).get('/leaderboard/2026-11-05/en?limit=2');
    expect(anon.headers['cache-control']).toContain('public');
  });
});

describe('Word Hunt all-time board', () => {
  const at = (id: string, rank: number): Row => ({ player_id: id, display_name: id, total_efficiency_score: 1000 - rank, rank_position: rank });

  it('drops test accounts, renumbers and names its columns', async () => {
    h.state.alltimeRows = [at('qa', 1), at('a', 2), at('b', 3)];
    h.state.testIds = ['qa'];
    const res = await request(app).get('/alltime-leaderboard/en');
    expect(res.body.data.map((r: Row) => [r.player_id, r.rank_position])).toEqual([['a', 1], ['b', 2]]);
    expect(h.state.selects.every(s => s.columns !== '*')).toBe(true);
  });

  it('appends a signed-in caller outside the page, rank net of QA accounts above them', async () => {
    h.state.alltimeRows = [at('qa', 1), at('a', 2), at('b', 3), at('me', 40)];
    h.state.testIds = ['qa'];
    h.state.sessionUser = 'me';
    const res = await request(app).get('/alltime-leaderboard/en?limit=2').set('Authorization', 'Bearer t');
    expect(res.body.data.at(-1)).toMatchObject({ player_id: 'me', rank_position: 39 });
    expect(res.headers['cache-control']).toContain('private');
  });

  it('never appends a caller who is a QA account', async () => {
    h.state.alltimeRows = [at('a', 1), at('b', 2), at('me', 40)];
    h.state.testIds = ['me'];
    h.state.sessionUser = 'me';
    const res = await request(app).get('/alltime-leaderboard/en?limit=2').set('Authorization', 'Bearer t');
    expect(res.body.data.map((r: Row) => r.player_id)).toEqual(['a', 'b']);
  });
});
