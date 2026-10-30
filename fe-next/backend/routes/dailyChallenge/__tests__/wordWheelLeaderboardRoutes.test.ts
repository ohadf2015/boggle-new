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
    countCalls: 0,
  };
  function from(table: string) {
    const filters: Array<[string, string, unknown]> = [];
    let head = false;
    let inIds: string[] = [];
    const b: Record<string, unknown> = {};
    const chain = () => b;
    Object.assign(b, {
      select(columns: string, opts?: { head?: boolean }) {
        state.selects.push({ table, columns });
        head = !!opts?.head;
        if (head) state.countCalls++;
        return b;
      },
      eq(col: string, v: unknown) { filters.push(['eq', col, v]); return b; },
      gt: chain, not: chain, is: chain, order: chain, limit: chain, neq: chain,
      in(_c: string, ids: string[]) { inIds = ids; return b; },
      maybeSingle: async () => {
        const pid = filters.find(f => f[1] === 'player_id')?.[2];
        const src = table === 'word_wheel_alltime_leaderboard' ? state.alltimeRows : state.dailyRows;
        return { data: src.find(r => r.player_id === pid) ?? null, error: null };
      },
      then(resolve: (v: unknown) => unknown) {
        if (table === 'profiles') {
          return Promise.resolve(state.profilesError
            ? { data: null, error: { message: 'boom' } }
            : { data: inIds.map(id => ({ id, is_test_account: state.testIds.includes(id) })), error: null }).then(resolve);
        }
        if (head) return Promise.resolve({ data: null, error: null, count: 7 }).then(resolve);
        const rows = table === 'word_wheel_alltime_leaderboard' ? state.alltimeRows : state.dailyRows;
        return Promise.resolve({ data: rows, error: null }).then(resolve);
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

import router from '../wordWheelLeaderboardRoutes';

const app = express();
app.use(express.json());
app.use('/', router);

const daily = (id: string, score: number, extra: Row = {}): Row => ({
  player_id: id, guest_fingerprint: null, display_name: id, score, word_count: 1,
  completed_at: '2026-11-05T10:00:00Z', language: 'en', ...extra,
});

beforeEach(() => {
  Object.assign(h.state, { dailyRows: [], alltimeRows: [], testIds: [], profilesError: false, sessionUser: null, selects: [], countCalls: 0 });
});

describe('GET /leaderboard/:date/:language', () => {
  it('drops test accounts and renumbers', async () => {
    h.state.dailyRows = [daily('qa', 900), daily('a', 500), daily('b', 400)];
    h.state.testIds = ['qa'];
    const res = await request(app).get('/leaderboard/2026-11-05/en');
    expect(res.body.data.map((r: Row) => r.player_id)).toEqual(['a', 'b']);
    expect(res.body.data[0].rank_position).toBe(1);
  });

  it('fails open when the test-account lookup errors', async () => {
    h.state.dailyRows = [daily('qa', 900), daily('a', 500)];
    h.state.profilesError = true;
    const res = await request(app).get('/leaderboard/2026-11-05/en');
    expect(res.body.data).toHaveLength(2);
  });

  it('names its columns instead of select(*)', async () => {
    h.state.dailyRows = [daily('a', 500)];
    await request(app).get('/leaderboard/2026-11-05/en');
    expect(h.state.selects.every(s => s.columns !== '*')).toBe(true);
  });

  it('appends a signed-in caller ranked below the limit, with their true rank, and is not publicly cached', async () => {
    h.state.dailyRows = [daily('a', 500), daily('b', 400), daily('me', 100)];
    h.state.sessionUser = 'me';
    const res = await request(app).get('/leaderboard/2026-11-05/en?limit=2').set('Authorization', 'Bearer t');
    expect(res.body.data.map((r: Row) => r.player_id)).toEqual(['a', 'b', 'me']);
    expect(res.body.data[2].rank_position).toBe(3);
    expect(res.headers['cache-control']).toContain('private');
  });

  it('appends a guest caller found by fingerprint', async () => {
    h.state.dailyRows = [daily('a', 500), daily('b', 400), daily('', 50, { player_id: null, guest_fingerprint: 'fp9' })];
    const res = await request(app).get('/leaderboard/2026-11-05/en?limit=2&fp=fp9');
    expect(res.body.data).toHaveLength(3);
    expect(res.body.data[2]).toMatchObject({ guest_fingerprint: 'fp9', rank_position: 3 });
  });

  it('does not duplicate a caller already on the page; anonymous reads stay publicly cacheable', async () => {
    h.state.dailyRows = [daily('a', 500), daily('me', 400)];
    h.state.sessionUser = 'me';
    const signed = await request(app).get('/leaderboard/2026-11-05/en?limit=2').set('Authorization', 'Bearer t');
    expect(signed.body.data).toHaveLength(2);
    const anon = await request(app).get('/leaderboard/2026-11-05/en?limit=2');
    expect(anon.headers['cache-control']).toContain('public');
  });
});

describe('GET /alltime-leaderboard/:language', () => {
  const at = (id: string, rank: number): Row => ({ player_id: id, display_name: id, total_efficiency_score: 1000 - rank, rank_position: rank });

  it('drops test accounts and renumbers', async () => {
    h.state.alltimeRows = [at('qa', 1), at('a', 2), at('b', 3)];
    h.state.testIds = ['qa'];
    const res = await request(app).get('/alltime-leaderboard/en');
    expect(res.body.data.map((r: Row) => [r.player_id, r.rank_position])).toEqual([['a', 1], ['b', 2]]);
  });

  it('appends a signed-in caller outside the page', async () => {
    h.state.alltimeRows = [at('a', 1), at('b', 2), at('me', 40)];
    h.state.sessionUser = 'me';
    const res = await request(app).get('/alltime-leaderboard/en?limit=2').set('Authorization', 'Bearer t');
    expect(res.body.data.at(-1)).toMatchObject({ player_id: 'me', rank_position: 40 });
  });
});
