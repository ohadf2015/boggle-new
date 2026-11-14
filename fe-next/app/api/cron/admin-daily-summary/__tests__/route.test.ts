import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const h = vi.hoisted(() => ({
  authorized: true,
  rpc: vi.fn(),
  notifyAdmins: vi.fn(),
}));
vi.mock('@/lib/cronAuth', () => ({ isAuthorizedCronRequest: () => h.authorized }));
vi.mock('@/lib/admin/server', () => ({ getSupabaseAdmin: () => ({ rpc: h.rpc }) }));
vi.mock('@/lib/admin/adminNotifications', () => ({ notifyAdmins: h.notifyAdmins }));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
vi.mock('@/utils/logger', () => ({ default: { log: vi.fn(), error: vi.fn() } }));

import { POST } from '../route';

const req = (qs = '') => new NextRequest(`http://localhost/api/cron/admin-daily-summary${qs}`, { method: 'POST' });
const stats = { current: { games: 262, signups: 10, teachers: 3 }, previous: { games: 23, signups: 18, teachers: 1 } };

beforeEach(() => {
  vi.clearAllMocks();
  h.authorized = true;
  h.rpc.mockResolvedValue({ data: stats, error: null });
  h.notifyAdmins.mockResolvedValue(true);
  vi.useFakeTimers({ now: new Date('2026-11-14T05:00:00Z'), toFake: ['Date'] });
});

describe('POST /api/cron/admin-daily-summary', () => {
  it('rejects calls without the cron secret', async () => {
    h.authorized = false;
    expect((await POST(req())).status).toBe(401);
    expect(h.rpc).not.toHaveBeenCalled();
  });

  it('summarises yesterday (UTC) and sends it to every admin', async () => {
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(h.rpc).toHaveBeenCalledWith('admin_daily_summary', { p_day: '2026-11-13' });
    expect(h.notifyAdmins).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Yesterday: 262 games, up from 23',
      dedupeKey: 'daily-summary:2026-11-13',
    }));
    expect(await res.json()).toEqual({ success: true, sent: true, day: '2026-11-13', ...stats });
  });

  it('dry run returns the notice and sends nothing', async () => {
    const body = await (await POST(req('?dry=1'))).json();
    expect(h.notifyAdmins).not.toHaveBeenCalled();
    expect(body.notice.title).toBe('Yesterday: 262 games, up from 23');
  });

  it('a failed count is a 500, never a silent zero summary', async () => {
    h.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    expect((await POST(req())).status).toBe(500);
    expect(h.notifyAdmins).not.toHaveBeenCalled();
  });
});
