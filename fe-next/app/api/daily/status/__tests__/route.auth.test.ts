import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

/*
 * Regression: the route used the BROWSER supabase client (`@/lib/supabase`)
 * server-side. It has no cookies there, so `auth.getUser()` was null for every
 * request and every logged-in player got a 401 — which left the results
 * screen's "next quest" CTA on its skeleton forever.
 */

const getUser = vi.fn();
vi.mock('@/utils/supabase/server', () => ({
  createRequestClient: vi.fn(async () => ({ supabase: { auth: { getUser } }, token: null })),
}));

vi.mock('@/utils/dailyChallenge/dateUtils', () => ({
  getDailyChallengeDate: () => '2026-09-21',
}));

// Rows per table, keyed by table name. Every builder method chains; awaiting
// the chain (or `.single()`) resolves the table's rows.
const tables: Record<string, unknown> = {};
function builder(table: string) {
  const result = () => ({ data: tables[table] ?? null, error: null });
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq']) b[m] = () => b;
  b.single = async () => result();
  b.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result()).then(resolve);
  return b;
}
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({ from: (t: string) => builder(t) }),
}));

const USER = '9a4bd525-6517-488d-a4fa-ee20f76e06c9';
const req = (qs: string) => new NextRequest(`http://localhost/api/daily/status?${qs}`);

describe('GET /api/daily/status — authed', () => {
  beforeEach(() => {
    for (const k of Object.keys(tables)) delete tables[k];
    getUser.mockReset();
  });

  it('given a cookie session for the requested user, returns 200 with today played per mode', async () => {
    getUser.mockResolvedValue({ data: { user: { id: USER } }, error: null });
    tables.daily_word_hunt_attempts = [{ puzzle_date: '2026-09-21' }];
    tables.daily_word_wheel_attempts = [{ puzzle_date: '2026-09-20' }];
    tables.daily_word_tower_attempts = [{ puzzle_date: '2026-09-21' }];
    tables.connections_daily_scores = [];
    tables.profiles = { streak_freeze_count: 0 };

    const { GET } = await import('../route');
    const res = await GET(req(`userId=${USER}`));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.loading).toBe(false);
    expect(body.today).toEqual({ wordHunt: true, wordWheel: false, wordTower: true, connections: false });
    // hunt 09-21 + wheel 09-20 are a 2-day history. Longest must come from those
    // attempt rows, not from daily_puzzle_streaks (absent in prod).
    expect(body.streak.longest).toBe(2);
  });

  it('ignores a daily_puzzle_streaks row and counts tower dates into longest', async () => {
    getUser.mockResolvedValue({ data: { user: { id: USER } }, error: null });
    tables.daily_word_hunt_attempts = [{ puzzle_date: '2026-09-21' }, { puzzle_date: '2026-09-19' }];
    tables.daily_word_wheel_attempts = [];
    tables.daily_word_tower_attempts = [{ puzzle_date: '2026-09-20' }];
    tables.connections_daily_scores = [];
    tables.profiles = { streak_freeze_count: 0 };
    // If the route still read this missing table, longest would be 5, not 3.
    tables.daily_puzzle_streaks = {
      completed_dates: ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05'],
    };

    const { GET } = await import('../route');
    const res = await GET(req(`userId=${USER}`));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.streak.longest).toBe(3);
  });

  it('given a session for a DIFFERENT user, refuses with 401 and loading:false', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'someone-else' } }, error: null });
    const { GET } = await import('../route');
    const res = await GET(req(`userId=${USER}`));
    expect(res.status).toBe(401);
    expect((await res.json()).loading).toBe(false);
  });
});
