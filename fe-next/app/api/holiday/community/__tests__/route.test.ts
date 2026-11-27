import { beforeEach, describe, expect, it, vi } from 'vitest';

const count = vi.fn();
vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: vi.fn(() => ({ success: true })) }));
vi.mock('@/lib/admin/server', () => ({ getSupabaseAdmin: () => ({}) }));
vi.mock('@/lib/holidays/dailyCommunity.server', () => ({ communityCount: (...a: unknown[]) => count(...a) }));

import { windowFor } from '@/lib/holidays/calendar';
import * as route from '../route';

const get = (qs: string) => new Request(`http://x/api/holiday/community?${qs}`) as never;

describe('/api/holiday/community', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-12-06T10:00:00Z'));
    count.mockReset().mockResolvedValue(1234);
  });

  it('Given the route module, Then it exports only HTTP handlers', () => {
    expect(Object.keys(route)).toEqual(['GET']);
  });

  it('Given tonight, Then it returns the cached count with a one-minute cache header', async () => {
    const res = await route.GET(get('holiday=hanukkah&localDate=2026-12-06'));
    expect(await res.json()).toEqual({ count: 1234 });
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=60');
  });

  it('Given the count fails, Then the counter is null instead of an error', async () => {
    count.mockRejectedValue(new Error('db'));
    expect(await (await route.GET(get('holiday=christmas&localDate=2026-12-06'))).json()).toEqual({ count: null });
  });

  it('Given a bad holiday, Then 400', async () => {
    expect((await route.GET(get('holiday=purim&localDate=2026-12-06'))).status).toBe(400);
  });

  it('Given an es player on Jan 4 and a ru player on Jan 7, Then their locale reaches the christmas window', async () => {
    count.mockImplementation(async (i: { holiday: 'christmas'; localDate: string; locale?: string }) => (windowFor(i.holiday, i.localDate, i.locale) ? 55 : null));
    vi.setSystemTime(new Date('2027-01-04T10:00:00Z'));
    expect(await (await route.GET(get('holiday=christmas&localDate=2027-01-04&locale=es'))).json()).toEqual({ count: 55 });
    vi.setSystemTime(new Date('2027-01-07T10:00:00Z'));
    expect(await (await route.GET(get('holiday=christmas&localDate=2027-01-07&locale=ru'))).json()).toEqual({ count: 55 });
    vi.setSystemTime(new Date('2027-01-04T10:00:00Z'));
    expect(await (await route.GET(get('holiday=christmas&localDate=2027-01-04'))).json()).toEqual({ count: null });
  });
});
