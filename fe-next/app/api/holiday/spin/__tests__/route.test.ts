import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUser = vi.fn();
const spin = vi.fn();
const cracker = vi.fn();
const admin = { tag: 'admin' };
vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: vi.fn(() => ({ success: true })) }));
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: (...a: unknown[]) => getUser(...a) }));
vi.mock('@/lib/admin/server', () => ({ getSupabaseAdmin: () => admin }));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
vi.mock('@/lib/holidays/dailyBonus.server', () => ({
  spinHolidayDreidel: (...a: unknown[]) => spin(...a),
  pullHolidayCracker: (...a: unknown[]) => cracker(...a),
}));

import * as route from '../route';

const post = (body: unknown) => new Request('http://x/api/holiday/spin', { method: 'POST', body: JSON.stringify(body) }) as never;

describe('/api/holiday/spin', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-12-06T10:00:00Z'));
    getUser.mockReset().mockResolvedValue({ id: 'u1' });
    spin.mockReset().mockResolvedValue({ status: 'spun', face: 'gimel', coins: 20 });
    cracker.mockReset().mockResolvedValue({ status: 'locked' });
  });

  it('Given the route module, Then it exports only HTTP handlers', () => {
    expect(Object.keys(route)).toEqual(['POST']);
  });

  it('Given a signed-in player, When they spin, Then the server rolls for that user', async () => {
    const res = await route.POST(post({ kind: 'dreidel', puzzleDate: '2026-12-06' }));
    expect(await res.json()).toEqual({ status: 'spun', face: 'gimel', coins: 20 });
    expect(spin).toHaveBeenCalledWith({ supabase: admin, userId: 'u1', puzzleDate: '2026-12-06' });
  });

  it('Given a cracker pull, Then the cracker path answers', async () => {
    const res = await route.POST(post({ kind: 'cracker', puzzleDate: '2026-12-06' }));
    expect(await res.json()).toEqual({ status: 'locked' });
  });

  it('Given no session or a bad body, Then nothing rolls', async () => {
    getUser.mockResolvedValue(null);
    expect((await route.POST(post({ kind: 'dreidel', puzzleDate: '2026-12-06' }))).status).toBe(401);
    expect((await route.POST(post({ kind: 'slots', puzzleDate: '2026-12-06' }))).status).toBe(400);
    expect((await route.POST(post({ kind: 'dreidel', puzzleDate: '2026-12-20' }))).status).toBe(400);
    expect(spin).not.toHaveBeenCalled();
  });
});
