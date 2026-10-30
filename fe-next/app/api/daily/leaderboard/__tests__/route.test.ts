import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const getUser = vi.fn();
vi.mock('@/lib/auth/getAuthedUser', () => ({
  getAuthedUser: async () => {
    const { data } = await getUser();
    return data.user ? { id: data.user.id } : null;
  },
}));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));

const pyramidLocales: string[] = [];
vi.mock('@/lib/connections/daily', () => ({ pyramidLocalesOn: () => pyramidLocales }));

// Records every .eq() per table; resolves the table's rows.
const rows: Record<string, unknown[]> = {};
const eqCalls: Array<[string, string, unknown]> = [];
const chain: Array<[string, string]> = [];
const fromCalls: string[] = [];
function builder(table: string) {
  fromCalls.push(table);
  const b: Record<string, unknown> = {};
  b.select = () => b;
  b.limit = () => { chain.push([table, 'limit']); return b; };
  b.order = (col: string) => { chain.push([table, `order:${col}`]); return b; };
  b.in = () => b;
  b.or = () => b;
  b.not = (col: string, op: string, val: string) => { chain.push([table, `not:${col}:${op}:${val}`]); return b; };
  b.eq = (col: string, val: unknown) => { eqCalls.push([table, col, val]); return b; };
  b.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ data: rows[table] ?? [], error: null }).then(resolve);
  return b;
}
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({ from: (t: string) => builder(t) }),
}));

import { __resetDailyBoardCache } from '@/lib/daily/loadDailyBoard';

const req = (qs: string) => new NextRequest(`http://localhost/api/daily/leaderboard?${qs}`);
const hunt = (id: string | null, fp: string | null, v: number) =>
  ({ player_id: id, guest_fingerprint: fp, display_name: 'Player', efficiency_score: v });

describe('GET /api/daily/leaderboard', () => {
  beforeEach(() => {
    for (const k of Object.keys(rows)) delete rows[k];
    eqCalls.length = 0;
    chain.length = 0;
    fromCalls.length = 0;
    __resetDailyBoardCache();
    pyramidLocales.length = 0;
    getUser.mockReset().mockResolvedValue({ data: { user: null }, error: null });
    rows.daily_word_hunt_leaderboard = [
      hunt('p1', null, 900), hunt('p2', null, 800), hunt('p3', null, 700), hunt('zz-me', null, 100),
      hunt(null, 'guestfp', 50),
    ];
  });

  it('given lang=all, does not filter by language (a Hebrew player on an English hub still counts)', async () => {
    const { GET } = await import('../route');
    await GET(req('date=2026-09-21&lang=all'));
    expect(eqCalls.some(([, col]) => col === 'language')).toBe(false);
    expect(eqCalls.some(([, col, v]) => col === 'puzzle_date' && v === '2026-09-21')).toBe(true);
  });

  it('given a signed-in caller outside the top N, appends their row with its true rank', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'zz-me' } }, error: null });
    const { GET } = await import('../route');
    const res = await GET(req('date=2026-09-21&lang=all&limit=3'));
    const { data } = await res.json();
    expect(data.map((e: { rank: number }) => e.rank)).toEqual([1, 2, 3, 4]);
    expect(data[3].isYou).toBe(true);
    expect(JSON.stringify(data)).not.toContain('zz-me"');
  });

  it('given a guest caller, finds them by fingerprint', async () => {
    const { GET } = await import('../route');
    const res = await GET(req('date=2026-09-21&lang=all&limit=3&fp=guestfp'));
    const { data } = await res.json();
    expect(data.at(-1)).toMatchObject({ rank: 5, isYou: true });
  });

  it('is personalised, so a shared cache must not serve one player\'s board to another', async () => {
    const { GET } = await import('../route');
    const res = await GET(req('date=2026-09-21&lang=he'));
    expect(res.headers.get('Cache-Control')).toMatch(/private|no-store/);
  });

  it('orders each mode by its score before cutting, so the top players are never the ones dropped', async () => {
    const { GET } = await import('../route');
    await GET(req('date=2026-09-21&lang=all'));
    const hunt = chain.filter(([t]) => t === 'daily_word_hunt_leaderboard').map(([, c]) => c);
    expect(hunt).toEqual(['order:efficiency_score', 'limit']);
  });

  it('leaves test accounts and 0-point rows off the board and counts only real players', async () => {
    rows.daily_word_hunt_leaderboard = [hunt('qa', null, 999), hunt('real', null, 10), hunt('zero', null, 0)];
    rows.profiles = [{ id: 'qa' }];
    const { GET } = await import('../route');
    const body = await (await GET(req('date=2026-09-21&lang=all'))).json();
    expect(body.data).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  it('flags the signed-in caller\'s friends, without exposing their ids', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'zz-me' } }, error: null });
    rows.friends = [{ user_id: 'p3', friend_id: 'zz-me' }];
    const { GET } = await import('../route');
    const { data } = await (await GET(req('date=2026-09-21&lang=all&limit=1&friends=1'))).json();
    expect(data.map((e: { rank: number }) => e.rank)).toEqual([1, 3, 4]);
    expect(data[1].isFriend).toBe(true);
    expect(JSON.stringify(data)).not.toContain('p3');
    expect(data.every((e: { key?: string }) => typeof e.key === 'string' && e.key.length > 0)).toBe(true);
  });

  it('serves a repeat read from a short cache, and re-reads (at most every 2s) when the caller is not on it yet', async () => {
    const { GET } = await import('../route');
    await GET(req('date=2026-09-21&lang=all'));
    const reads = fromCalls.filter((t) => t === 'daily_word_hunt_leaderboard').length;
    await GET(req('date=2026-09-21&lang=all&fp=guestfp'));
    expect(fromCalls.filter((t) => t === 'daily_word_hunt_leaderboard').length).toBe(reads);
    await GET(req('date=2026-09-21&lang=all&fp=just-finished'));
    expect(fromCalls.filter((t) => t === 'daily_word_hunt_leaderboard').length).toBe(reads);
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + 3_000);
    await GET(req('date=2026-09-21&lang=all&fp=just-finished'));
    expect(fromCalls.filter((t) => t === 'daily_word_hunt_leaderboard').length).toBe(reads + 1);
    vi.restoreAllMocks();
  });

  it('on a pyramid day, keeps the pyramid locales\' Connections runs off the combined board', async () => {
    pyramidLocales.push('he', 'ja');
    const { GET } = await import('../route');
    await GET(req('date=2026-09-21&lang=all'));
    expect(chain).toContainEqual(['connections_daily_scores', 'not:language:in:(he,ja)']);
  });
});
