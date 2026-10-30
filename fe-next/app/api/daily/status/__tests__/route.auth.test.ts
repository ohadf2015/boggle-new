import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

/*
 * Regression: the route used the BROWSER supabase client (`@/lib/supabase`)
 * server-side. It has no cookies there, so `auth.getUser()` was null for every
 * request and every logged-in player got a 401 — which left the results
 * screen's "next quest" CTA on its skeleton forever.
 */

const getAuthedUser = vi.fn();
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: (...a: unknown[]) => getAuthedUser(...a) }));
const remoteGetUser = vi.fn();
vi.mock('@/utils/supabase/server', () => ({
  createRequestClient: vi.fn(async () => ({ supabase: { auth: { getUser: remoteGetUser } }, token: null })),
}));

vi.mock('@/utils/dailyChallenge/dateUtils', () => ({
  getDailyChallengeDate: () => '2026-09-21',
}));

// Rows per table, keyed by table name. Every builder method chains; awaiting
// the chain (or `.single()`) resolves the table's rows.
const tables: Record<string, unknown> = {};
const failing = new Set<string>();
function builder(table: string) {
  const result = () => (failing.has(table)
    ? { data: null, error: { message: 'statement timeout' } }
    : { data: tables[table] ?? null, error: null });
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq']) b[m] = () => b;
  b.maybeSingle = async () => result();
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
    failing.clear();
    getAuthedUser.mockReset();
    remoteGetUser.mockReset();
  });

  it('given a cookie session for the requested user, returns 200 with today played per mode', async () => {
    getAuthedUser.mockResolvedValue({ id: USER });
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
    getAuthedUser.mockResolvedValue({ id: USER });
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
    getAuthedUser.mockResolvedValue({ id: 'someone-else' });
    const { GET } = await import('../route');
    const res = await GET(req(`userId=${USER}`));
    expect(res.status).toBe(401);
    expect((await res.json()).loading).toBe(false);
  });

  it('verifies the session locally, without a remote auth round-trip', async () => {
    getAuthedUser.mockResolvedValue({ id: USER });
    tables.profiles = { streak_freeze_count: 0 };
    const { GET } = await import('../route');
    const res = await GET(req(`userId=${USER}`));
    expect(res.status).toBe(200);
    expect(getAuthedUser).toHaveBeenCalledTimes(1);
    expect(remoteGetUser).not.toHaveBeenCalled();
  });

  it('given a player without a profile row, still answers 200 with no freezes', async () => {
    getAuthedUser.mockResolvedValue({ id: USER });
    tables.daily_word_hunt_attempts = [{ puzzle_date: '2026-09-21' }];
    const { GET } = await import('../route');
    const res = await GET(req(`userId=${USER}`));
    expect(res.status).toBe(200);
    expect((await res.json()).freezeCount).toBe(0);
  });

  it.each(['daily_word_hunt_attempts', 'daily_word_wheel_attempts', 'daily_word_tower_attempts', 'connections_daily_scores', 'profiles'])(
    'given the %s read fails, answers 500 rather than a fake "nothing played, streak 0"',
    async (table) => {
      getAuthedUser.mockResolvedValue({ id: USER });
      tables.daily_word_hunt_attempts = [{ puzzle_date: '2026-09-21' }];
      tables.profiles = { streak_freeze_count: 1 };
      failing.add(table);
      const { GET } = await import('../route');
      const res = await GET(req(`userId=${USER}`));
      expect(res.status).toBe(500);
      expect((await res.json()).fromServer).not.toBe(true);
    },
  );
});
