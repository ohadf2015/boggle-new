import { describe, it, expect, vi, beforeEach } from 'vitest';

const getUser = vi.fn();
const mark = vi.fn();
const read = vi.fn();
const admin = { tag: 'admin' };
vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: vi.fn(() => ({ success: true })) }));
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: (...a: unknown[]) => getUser(...a) }));
vi.mock('@/lib/admin/server', () => ({ getSupabaseAdmin: () => admin }));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
vi.mock('@/lib/holidayEvent/progress.server', async (orig) => ({
  ...(await orig<typeof import('@/lib/holidayEvent/progress.server')>()),
  markHolidayDayPlayed: (...a: unknown[]) => mark(...a),
  readHolidayProgress: (...a: unknown[]) => read(...a),
}));

import { GET, POST } from '../route';

const post = (body: unknown) =>
  new Request('http://x/api/holiday/progress', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
const get = (qs: string) => new Request(`http://x/api/holiday/progress?${qs}`);

describe('/api/holiday/progress', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-12-05T10:00:00Z'));
    getUser.mockReset().mockResolvedValue({ id: 'u1' });
    mark.mockReset().mockResolvedValue({ status: 'lit', index: 1, reward: { partKey: 'accessory:beanieBlue' } });
    read.mockReset().mockResolvedValue({ holiday: 'hanukkah', window: {}, days: [] });
  });

  it('Given no session, then POST and GET are 401', async () => {
    getUser.mockResolvedValue(null);
    expect((await POST(post({ holiday: 'hanukkah', localDate: '2026-12-05' }) as never)).status).toBe(401);
    expect((await GET(get('holiday=hanukkah&localDate=2026-12-05') as never)).status).toBe(401);
  });

  it('Given a signed-in finish on night 2, then POST lights it for that user', async () => {
    const res = await POST(post({ holiday: 'hanukkah', localDate: '2026-12-05' }) as never);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: 'lit', index: 1 });
    expect(mark).toHaveBeenCalledWith({ supabase: admin, userId: 'u1', holiday: 'hanukkah', localDate: '2026-12-05', locale: 'en' });
  });

  it('Given a local date more than a day from the server date, then POST is 400 and nothing is marked', async () => {
    const res = await POST(post({ holiday: 'hanukkah', localDate: '2026-12-08' }) as never);
    expect(res.status).toBe(400);
    expect(mark).not.toHaveBeenCalled();
  });

  it('Given a Spanish player on Jan 4, then GET reads the Reyes-extended window instead of 404', async () => {
    vi.setSystemTime(new Date('2027-01-04T10:00:00Z'));
    expect((await GET(get('holiday=christmas&localDate=2027-01-04') as never)).status).toBe(404);
    expect((await GET(get('holiday=christmas&localDate=2027-01-04&locale=es') as never)).status).toBe(200);
    expect(read).toHaveBeenLastCalledWith(admin, 'u1', expect.objectContaining({ end: '2027-01-07', finale: '2027-01-06' }));
  });

  it('Given an unknown holiday, then 400', async () => {
    expect((await POST(post({ holiday: 'easter', localDate: '2026-12-05' }) as never)).status).toBe(400);
    expect((await GET(get('holiday=easter&localDate=2026-12-05') as never)).status).toBe(400);
  });

  it('Given the grant throws, then POST is 500 (never a silent success)', async () => {
    mark.mockRejectedValue(new Error('boom'));
    expect((await POST(post({ holiday: 'hanukkah', localDate: '2026-12-05' }) as never)).status).toBe(500);
  });

  it('Given a date inside the window, then GET returns the progress view', async () => {
    const res = await GET(get('holiday=hanukkah&localDate=2026-12-05') as never);
    expect(res.status).toBe(200);
    expect(read).toHaveBeenCalledWith(admin, 'u1', expect.objectContaining({ key: 'hanukkah', start: '2026-12-04' }));
  });

  it('Given a date outside every window, then GET answers 404 with no read', async () => {
    vi.setSystemTime(new Date('2026-11-01T10:00:00Z'));
    const res = await GET(get('holiday=hanukkah&localDate=2026-11-01') as never);
    expect(res.status).toBe(404);
    expect(read).not.toHaveBeenCalled();
  });
});
