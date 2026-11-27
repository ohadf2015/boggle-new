import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUser = vi.fn();
const rescue = vi.fn();
const read = vi.fn();
const admin = { tag: 'admin' };
vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: vi.fn(() => ({ success: true })) }));
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: (...a: unknown[]) => getUser(...a) }));
vi.mock('@/lib/admin/server', () => ({ getSupabaseAdmin: () => admin }));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
vi.mock('@/lib/holidays/dailyRescue.server', () => ({
  rescueInviter: (...a: unknown[]) => rescue(...a),
  readRescueState: (...a: unknown[]) => read(...a),
}));

import { windowFor } from '@/lib/holidays/calendar';
import * as route from '../route';

const post = (body: unknown) => new Request('http://x/api/holiday/rescue', { method: 'POST', body: JSON.stringify(body) }) as never;
const get = (qs: string) => new Request(`http://x/api/holiday/rescue?${qs}`) as never;

describe('/api/holiday/rescue', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-12-07T10:00:00Z'));
    getUser.mockReset().mockResolvedValue({ id: 'fr' });
    rescue.mockReset().mockResolvedValue({ status: 'relit', day: 3 });
    read.mockReset().mockResolvedValue({ code: 'NOA123', missedDay: 3, missedCount: 1, rescuedDays: [] });
  });

  it('Given the route module, Then it exports only HTTP handlers', () => {
    expect(Object.keys(route).sort()).toEqual(['GET', 'POST']);
  });

  it('Given a friend who finished, Then the rescue runs as that friend', async () => {
    const res = await route.POST(post({ ref: 'NOA123', holiday: 'hanukkah', localDate: '2026-12-07' }));
    expect(await res.json()).toEqual({ status: 'relit', day: 3 });
    expect(rescue).toHaveBeenCalledWith({ supabase: admin, friendId: 'fr', ref: 'NOA123', holiday: 'hanukkah', localDate: '2026-12-07', locale: 'en' });
  });

  it('Given GET, Then the player’s rescue state comes back', async () => {
    expect(await (await route.GET(get('holiday=hanukkah&localDate=2026-12-07'))).json()).toMatchObject({ rescue: { missedDay: 3 } });
  });

  it('Given no session, Then 401', async () => {
    getUser.mockResolvedValue(null);
    expect((await route.POST(post({ ref: 'NOA123', holiday: 'hanukkah', localDate: '2026-12-07' }))).status).toBe(401);
  });

  it('Given an es player on Jan 4 and a ru player on Jan 7, Then their locale reaches the christmas window', async () => {
    const live = (i: { holiday: 'christmas'; localDate: string; locale?: string }) => windowFor(i.holiday, i.localDate, i.locale) !== null;
    read.mockImplementation(async (i) => (live(i) ? { missedDay: 2 } : null));
    rescue.mockImplementation(async (i) => (live(i) ? { status: 'relit', day: 2 } : { status: 'closed' }));
    vi.setSystemTime(new Date('2027-01-04T10:00:00Z'));
    expect(await (await route.GET(get('holiday=christmas&localDate=2027-01-04&locale=es'))).json()).toEqual({ rescue: { missedDay: 2 } });
    vi.setSystemTime(new Date('2027-01-07T10:00:00Z'));
    expect(await (await route.GET(get('holiday=christmas&localDate=2027-01-07&locale=ru'))).json()).toEqual({ rescue: { missedDay: 2 } });
    vi.setSystemTime(new Date('2027-01-04T10:00:00Z'));
    expect(await (await route.GET(get('holiday=christmas&localDate=2027-01-04'))).json()).toEqual({ rescue: null });
    vi.setSystemTime(new Date('2027-01-04T10:00:00Z'));
    expect(await (await route.POST(post({ ref: 'NOA123', holiday: 'christmas', localDate: '2027-01-04', locale: 'es' }))).json()).toEqual({ status: 'relit', day: 2 });
    vi.setSystemTime(new Date('2027-01-07T10:00:00Z'));
    expect(await (await route.POST(post({ ref: 'NOA123', holiday: 'christmas', localDate: '2027-01-07', locale: 'ru' }))).json()).toEqual({ status: 'relit', day: 2 });
  });
});
