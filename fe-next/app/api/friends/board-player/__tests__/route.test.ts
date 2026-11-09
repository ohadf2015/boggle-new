import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const getUser = vi.fn();
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: async () => getUser() }));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: () => ({ success: true }), rateLimitResponse: vi.fn() }));
vi.mock('@/lib/connections/daily', () => ({ pyramidLocalesOn: () => [] }));

const rows: Record<string, unknown[]> = {};
function builder(table: string) {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'limit', 'order', 'in', 'or', 'not', 'eq']) b[m] = () => b;
  b.then = (resolve: (v: unknown) => unknown) => Promise.resolve({ data: rows[table] ?? [], error: null }).then(resolve);
  return b;
}
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: () => ({ from: (t: string) => builder(t) }) }));

import { __resetDailyBoardCache, opaqueRowKey } from '@/lib/daily/loadDailyBoard';
import { POST } from '../route';

const DATE = '2026-11-09';
const hunt = (id: string | null, fp: string | null, v: number) =>
  ({ player_id: id, guest_fingerprint: fp, display_name: 'P', efficiency_score: v, puzzle_date: DATE });
const req = (body: unknown) => new NextRequest('http://x/api/friends/board-player', { method: 'POST', body: JSON.stringify(body) });

describe('POST /api/friends/board-player', () => {
  beforeEach(() => {
    __resetDailyBoardCache();
    for (const k of Object.keys(rows)) delete rows[k];
    rows.daily_word_hunt_leaderboard = [hunt('user-a', null, 90), hunt(null, 'guest-fp', 80)];
    getUser.mockResolvedValue({ id: 'me' });
  });

  it('needs a signed-in caller', async () => {
    getUser.mockResolvedValue(null);
    expect((await POST(req({ date: DATE, key: 'abcdefgh' }))).status).toBe(401);
  });

  it('rejects malformed input', async () => {
    expect((await POST(req({ date: 'nope', key: 'abcdefgh' }))).status).toBe(400);
    expect((await POST(req({ date: DATE, key: '../x' }))).status).toBe(400);
  });

  it('resolves a signed-in row key to its user id', async () => {
    const res = await POST(req({ date: DATE, key: opaqueRowKey(DATE)('u:user-a') }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ userId: 'user-a' });
  });

  it('never resolves a guest row', async () => {
    const res = await POST(req({ date: DATE, key: opaqueRowKey(DATE)('g:guest-fp') }));
    expect(res.status).toBe(404);
    expect(JSON.stringify(await res.json())).not.toContain('guest-fp');
  });
});
