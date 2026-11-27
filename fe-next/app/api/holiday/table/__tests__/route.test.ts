import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUser = vi.fn();
const create = vi.fn();
const join = vi.fn();
const leave = vi.fn();
const read = vi.fn();
const admin = { tag: 'admin' };
vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: vi.fn(() => ({ success: true })) }));
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: (...a: unknown[]) => getUser(...a) }));
vi.mock('@/lib/admin/server', () => ({ getSupabaseAdmin: () => admin }));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
vi.mock('@/lib/holidays/dailyTable.server', () => ({
  createHolidayTable: (...a: unknown[]) => create(...a),
  joinHolidayTable: (...a: unknown[]) => join(...a),
  leaveHolidayTable: (...a: unknown[]) => leave(...a),
  readHolidayTable: (...a: unknown[]) => read(...a),
}));

import { windowFor } from '@/lib/holidays/calendar';
import * as route from '../route';

const post = (body: unknown) => new Request('http://x/api/holiday/table', { method: 'POST', body: JSON.stringify(body) }) as never;
const get = (qs: string) => new Request(`http://x/api/holiday/table?${qs}`) as never;

describe('/api/holiday/table', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-12-06T10:00:00Z'));
    getUser.mockReset().mockResolvedValue({ id: 'u1' });
    create.mockReset().mockResolvedValue({ status: 'ok', code: 'ABCDEFGH', holiday: 'hanukkah' });
    join.mockReset().mockResolvedValue({ status: 'full' });
    leave.mockReset().mockResolvedValue(undefined);
    read.mockReset().mockResolvedValue(null);
  });

  it('Given the route module, Then it exports only HTTP handlers', () => {
    expect(Object.keys(route).sort()).toEqual(['GET', 'POST']);
  });

  it('Given create, join and leave, Then each goes to its action for the signed-in user', async () => {
    expect(await (await route.POST(post({ action: 'create', holiday: 'hanukkah', localDate: '2026-12-06' }))).json()).toMatchObject({ code: 'ABCDEFGH' });
    expect(await (await route.POST(post({ action: 'join', code: 'ABCDEFGH', localDate: '2026-12-06' }))).json()).toEqual({ status: 'full' });
    expect(join).toHaveBeenCalledWith({ supabase: admin, userId: 'u1', code: 'ABCDEFGH', localDate: '2026-12-06', locale: 'en' });
    await route.POST(post({ action: 'leave', holiday: 'hanukkah', localDate: '2026-12-06' }));
    expect(leave).toHaveBeenCalled();
  });

  it('Given GET, Then it returns the player’s table or null', async () => {
    expect(await (await route.GET(get('holiday=hanukkah&localDate=2026-12-06'))).json()).toEqual({ table: null });
  });

  it('Given no session or a bad action, Then nothing is written', async () => {
    expect((await route.POST(post({ action: 'nuke', holiday: 'hanukkah', localDate: '2026-12-06' }))).status).toBe(400);
    getUser.mockResolvedValue(null);
    expect((await route.POST(post({ action: 'create', holiday: 'hanukkah', localDate: '2026-12-06' }))).status).toBe(401);
    expect((await route.GET(get('holiday=hanukkah&localDate=2026-12-06'))).status).toBe(401);
    expect(create).toHaveBeenCalledTimes(0);
  });

  it('Given an es player on Jan 4 and a ru player on Jan 7, Then their locale reaches the christmas window', async () => {
    const live = (i: { holiday: 'christmas'; localDate: string; locale?: string }) => (windowFor(i.holiday, i.localDate, i.locale) ? { code: 'ABCDEFGH' } : null);
    read.mockImplementation(async (i) => live(i));
    create.mockImplementation(async (i) => (live(i) ? { status: 'ok' } : { status: 'closed' }));
    vi.setSystemTime(new Date('2027-01-04T10:00:00Z'));
    expect(await (await route.GET(get('holiday=christmas&localDate=2027-01-04&locale=es'))).json()).toEqual({ table: { code: 'ABCDEFGH' } });
    vi.setSystemTime(new Date('2027-01-07T10:00:00Z'));
    expect(await (await route.GET(get('holiday=christmas&localDate=2027-01-07&locale=ru'))).json()).toEqual({ table: { code: 'ABCDEFGH' } });
    vi.setSystemTime(new Date('2027-01-04T10:00:00Z'));
    expect(await (await route.GET(get('holiday=christmas&localDate=2027-01-04'))).json()).toEqual({ table: null });
    vi.setSystemTime(new Date('2027-01-04T10:00:00Z'));
    expect(await (await route.POST(post({ action: 'create', holiday: 'christmas', localDate: '2027-01-04', locale: 'es' }))).json()).toEqual({ status: 'ok' });
    vi.setSystemTime(new Date('2027-01-07T10:00:00Z'));
    expect(await (await route.POST(post({ action: 'create', holiday: 'christmas', localDate: '2027-01-07', locale: 'ru' }))).json()).toEqual({ status: 'ok' });
  });
});
