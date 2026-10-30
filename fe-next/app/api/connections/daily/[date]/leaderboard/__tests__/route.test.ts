import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));

const auth = { user: null as { id: string } | null, guest: null as string | null };
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: async () => auth.user }));
vi.mock('@/lib/auth/guestCookie', () => ({ readGuestId: () => auth.guest }));

type Row = Record<string, unknown>;
const db = {
  top: [] as Row[],
  own: null as Row | null,
  testIds: [] as string[],
  qaRows: [] as Row[],
  orArgs: [] as string[],
  better: 0,
  calls: [] as string[][],
};
function builder(table: string) {
  const calls: string[] = [table];
  db.calls.push(calls);
  const b: Record<string, unknown> = {
    select: (_c: string, o?: { head?: boolean }) => (calls.push(o?.head ? 'head' : 'rows'), b),
    eq: (c: string, v: unknown) => (calls.push(`eq:${c}=${v}`), b),
    in: (c: string, v: string[]) => (calls.push(`in:${c}=${v.join(',')}`), b),
    not: (c: string, op: string, v: string) => (calls.push(`not:${c}:${op}:${v}`), b),
    or: (arg: string) => (calls.push('or'), db.orArgs.push(arg), b),
    order: () => b,
    limit: () => b,
    maybeSingle: () => Promise.resolve({ data: db.own }),
    then: (res: (v: unknown) => unknown) => {
      if (table === 'profiles') return Promise.resolve({ data: db.testIds.map((id) => ({ id })), error: null }).then(res);
      if (calls.some((c) => c.startsWith('in:player_id'))) return Promise.resolve({ data: db.qaRows, error: null }).then(res);
      return Promise.resolve(calls.includes('or') ? { count: db.better } : calls.includes('head') ? { count: 3 } : { data: db.top, error: null }).then(res);
    },
  };
  return b;
}
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: () => ({ from: builder }) }));

import { GET } from '../route';

function get(date: string, qs = '') {
  return GET(new Request(`http://localhost/api/connections/daily/${date}/leaderboard${qs}`) as never, {
    params: Promise.resolve({ date }),
  });
}

beforeEach(() => {
  auth.user = null;
  auth.guest = null;
  db.top = [];
  db.own = null;
  db.calls = [];
  db.testIds = [];
  db.qaRows = [];
  db.orArgs = [];
  db.better = 0;
});

describe('GET /api/connections/daily/[date]/leaderboard', () => {
  it('finds a guest by the signed cookie the score route wrote', async () => {
    auth.guest = 'cookie-guest';
    db.own = { score: 300, time_taken_seconds: 40, language: 'sv' };
    const res = await get('2026-09-08');
    const json = await res.json();
    expect(json.ownRank).toBe(1);
    expect(db.calls.some((c) => c.includes('eq:guest_fingerprint=cookie-guest'))).toBe(true);
    expect(res.headers.get('Cache-Control')).toContain('private');
  });

  it('ignores a client-supplied fingerprint', async () => {
    const res = await get('2026-09-08', '?guestFingerprint=g_someone');
    expect((await res.json()).ownRank).toBeNull();
    expect(db.calls.some((c) => c.includes('eq:guest_fingerprint=g_someone'))).toBe(false);
    expect(res.headers.get('Cache-Control')).toContain('public');
  });

  it('keeps pyramid runs off the chain board and renumbers what is left', async () => {
    db.top = [
      { rank_position: 2, display_name: 'b', language: 'sv' },
      { rank_position: 5, display_name: 'e', language: 'es' },
    ];
    const json = await (await get('2026-09-07')).json();
    expect(db.calls.filter((c) => c.includes('not:language:in:(en,he)')).length).toBeGreaterThanOrEqual(2);
    expect(json.leaderboard.map((r: { rank_position: number }) => r.rank_position)).toEqual([1, 2]);
  });

  it('a pyramid player has no rank on the chain board', async () => {
    auth.user = { id: 'u1' };
    db.own = { score: 1500, time_taken_seconds: 90, language: 'en' };
    const json = await (await get('2026-09-07')).json();
    expect(json.ownRank).toBeNull();
  });

  it('ranks ties the way the view does: score, then time, then who finished first', async () => {
    auth.user = { id: 'u1' };
    db.own = { score: 300, time_taken_seconds: 40, created_at: '2026-09-08T10:00:00.5+00:00', language: 'sv' };
    await get('2026-09-08');
    expect(db.orArgs[0]).toBe(
      'score.gt.300,and(score.eq.300,time_taken_seconds.lt.40),and(score.eq.300,time_taken_seconds.eq.40,created_at.lt."2026-09-08T10:00:00.5+00:00")',
    );
  });

  it('keeps QA accounts off the board, out of the count and out of the rank', async () => {
    db.testIds = ['qa1'];
    const qa = { score: 900, time_taken_seconds: 10, created_at: '2026-09-08T09:00:00+00:00' };
    db.qaRows = [qa];
    db.top = [
      { rank_position: 1, display_name: 'qa', ...qa, language: 'sv' },
      { rank_position: 2, display_name: 'a', score: 500, time_taken_seconds: 20, created_at: '2026-09-08T09:30:00+00:00', language: 'sv' },
    ];
    auth.guest = 'g1';
    db.own = { score: 100, time_taken_seconds: 50, created_at: '2026-09-08T11:00:00+00:00', language: 'sv' };
    db.better = 2;
    const json = await (await get('2026-09-08')).json();
    expect(json.leaderboard.map((r: Row) => [r.display_name, r.rank_position])).toEqual([['a', 1]]);
    expect(json.leaderboard[0]).not.toHaveProperty('created_at');
    expect(json.totalPlayers).toBe(2);
    expect(json.ownRank).toBe(2);
  });

  it('fails open when the QA lookup finds nothing', async () => {
    db.top = [{ rank_position: 1, display_name: 'a', score: 5, time_taken_seconds: 1, created_at: 'x', language: 'sv' }];
    const json = await (await get('2026-09-08')).json();
    expect(json.leaderboard).toHaveLength(1);
    expect(db.calls.some((c) => c[0] === 'connections_daily_scores' && c.some((x) => x.startsWith('in:player_id')))).toBe(false);
  });
});
