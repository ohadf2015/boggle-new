import { describe, it, expect, vi, beforeEach } from 'vitest';

const getUser = vi.fn();
const admin = { tag: 'admin' };
const fx = vi.hoisted(() => ({
  readGift: vi.fn(), openGift: vi.fn(), readHunt: vi.fn(), recordHuntFind: vi.fn(),
  readEggs: vi.fn(), recordEgg: vi.fn(), pickRoscon: vi.fn(), noteHolidayGame: vi.fn(),
  kohakuTotals: vi.fn(), readWrapped: vi.fn(),
}));
vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: vi.fn(() => ({ success: true })) }));
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: (...a: unknown[]) => getUser(...a) }));
vi.mock('@/lib/admin/server', () => ({ getSupabaseAdmin: () => admin }));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
vi.mock('@/lib/holidays/gift.server', () => ({ readGift: fx.readGift, openGift: fx.openGift }));
vi.mock('@/lib/holidays/hunt.server', () => ({ readHunt: fx.readHunt, recordHuntFind: fx.recordHuntFind }));
vi.mock('@/lib/holidays/eggs.server', async (orig) => ({
  ...(await orig<typeof import('@/lib/holidays/eggs.server')>()),
  readEggs: fx.readEggs, recordEgg: fx.recordEgg, pickRoscon: fx.pickRoscon,
}));
vi.mock('@/lib/holidays/holidayGame.server', async (orig) => ({
  ...(await orig<typeof import('@/lib/holidays/holidayGame.server')>()),
  noteHolidayGame: fx.noteHolidayGame, kohakuTotals: fx.kohakuTotals,
}));
vi.mock('@/lib/holidays/wrapped.server', () => ({ readWrapped: fx.readWrapped }));

import * as gift from '../gift/route';
import * as hunt from '../hunt/route';
import * as eggs from '../eggs/route';
import * as game from '../game/route';
import * as kohaku from '../kohaku/route';
import * as wrapped from '../wrapped/route';

const body = { holiday: 'hanukkah', localDate: '2026-12-05', locale: 'he' };
const post = (b: unknown) => new Request('http://x/api', { method: 'POST', body: JSON.stringify(b), headers: { 'content-type': 'application/json' } }) as never;
const get = (qs = 'holiday=hanukkah&localDate=2026-12-05&locale=he') => new Request(`http://x/api?${qs}`) as never;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-12-05T10:00:00Z'));
  getUser.mockReset().mockResolvedValue({ id: 'u1' });
  Object.values(fx).forEach((f) => f.mockReset().mockResolvedValue({ ok: true }));
});

describe('holiday phase 3 routes', () => {
  it('Given only handlers are exported, then each route file is deployable', () => {
    for (const m of [gift, hunt, eggs, game, kohaku, wrapped]) {
      for (const k of Object.keys(m)) expect(['GET', 'POST']).toContain(k);
    }
  });

  it('Given no session, then every signed-in route is 401 and nothing runs', async () => {
    getUser.mockResolvedValue(null);
    expect((await gift.GET(get())).status).toBe(401);
    expect((await gift.POST(post(body))).status).toBe(401);
    expect((await hunt.POST(post({ ...body, slot: 'profile' }))).status).toBe(401);
    expect((await eggs.POST(post({ ...body, egg: 'word_latke' }))).status).toBe(401);
    expect((await game.POST(post({ ...body, words: 3 }))).status).toBe(401);
    expect((await wrapped.GET(get())).status).toBe(401);
    expect(fx.openGift).not.toHaveBeenCalled();
  });

  it('Given a bad date or holiday, then 400', async () => {
    expect((await gift.POST(post({ ...body, localDate: '2026-12-20' }))).status).toBe(400);
    expect((await hunt.GET(get('holiday=easter&localDate=2026-12-05'))).status).toBe(400);
  });

  it('Given a valid open, then the gift is opened for that user with the parsed window', async () => {
    const res = await gift.POST(post(body));
    expect(res.status).toBe(200);
    expect(fx.openGift).toHaveBeenCalledWith(admin, 'u1', expect.objectContaining({ holiday: 'hanukkah', eventKey: 'hanukkah-2026', locale: 'he' }));
  });

  it('Given an unknown or server-only egg, then 400 and nothing stored', async () => {
    expect((await eggs.POST(post({ ...body, egg: 'free_coins' }))).status).toBe(400);
    expect((await eggs.POST(post({ ...body, egg: 'haba' }))).status).toBe(400);
    expect(fx.recordEgg).not.toHaveBeenCalled();
    expect((await eggs.POST(post({ ...body, egg: 'word_latke' }))).status).toBe(200);
  });

  it('Given a roscón pick, then it goes to the server roll with a whole-number slice', async () => {
    expect((await eggs.POST(post({ ...body, roscon: 9 }))).status).toBe(400);
    await eggs.POST(post({ ...body, roscon: 3 }));
    expect(fx.pickRoscon).toHaveBeenCalledWith(admin, 'u1', expect.anything(), 3);
  });

  it('Given an unknown hunt slot, then 400', async () => {
    expect((await hunt.POST(post({ ...body, slot: 'admin' }))).status).toBe(400);
  });

  it('Given the server throws, then 500, never a silent success', async () => {
    fx.noteHolidayGame.mockRejectedValue(new Error('boom'));
    expect((await game.POST(post({ ...body, words: 4 }))).status).toBe(500);
  });

  it('Given a guest on Kōhaku day, then totals still load without a team', async () => {
    getUser.mockResolvedValue(null);
    fx.kohakuTotals.mockResolvedValue({ red: 10, white: 7 });
    vi.setSystemTime(new Date('2026-12-31T10:00:00Z'));
    const res = await kohaku.GET(get('holiday=christmas&localDate=2026-12-31&locale=ja'));
    expect(await res.json()).toEqual({ red: 10, white: 7, team: null });
  });
});
