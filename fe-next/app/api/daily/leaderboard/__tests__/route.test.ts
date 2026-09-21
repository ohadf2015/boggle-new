import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const getUser = vi.fn();
vi.mock('@/utils/supabase/server', () => ({
  createRequestClient: vi.fn(async () => ({ supabase: { auth: { getUser } }, token: null })),
}));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));

// Records every .eq() per table; resolves the table's rows.
const rows: Record<string, unknown[]> = {};
const eqCalls: Array<[string, string, unknown]> = [];
function builder(table: string) {
  const b: Record<string, unknown> = {};
  b.select = () => b;
  b.limit = () => b;
  b.eq = (col: string, val: unknown) => { eqCalls.push([table, col, val]); return b; };
  b.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ data: rows[table] ?? [], error: null }).then(resolve);
  return b;
}
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({ from: (t: string) => builder(t) }),
}));

const req = (qs: string) => new NextRequest(`http://localhost/api/daily/leaderboard?${qs}`);
const hunt = (id: string | null, fp: string | null, v: number) =>
  ({ player_id: id, guest_fingerprint: fp, display_name: 'Player', efficiency_score: v });

describe('GET /api/daily/leaderboard', () => {
  beforeEach(() => {
    for (const k of Object.keys(rows)) delete rows[k];
    eqCalls.length = 0;
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
});
