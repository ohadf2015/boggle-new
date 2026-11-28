import { describe, it, expect, vi, beforeEach } from 'vitest';

const fx = vi.hoisted(() => ({
  getUser: vi.fn(),
  award: vi.fn(),
  rows: [] as Record<string, unknown>[],
  rpc: vi.fn(),
  updates: [] as Record<string, unknown>[],
}));

function fakeAdmin() {
  const from = () => {
    const filters: [string, unknown][] = [];
    const q = {
      insert: (row: Record<string, unknown>) => {
        const r = { id: `r${fx.rows.length + 1}`, started_at: new Date().toISOString(), finished_at: null, coins: 0, score: null, ...row };
        fx.rows.push(r);
        return { select: () => ({ single: async () => ({ data: { id: r.id }, error: null }) }) };
      },
      select: () => q,
      update: (patch: Record<string, unknown>) => {
        fx.updates.push(patch);
        return { eq: async () => ({ error: null }) };
      },
      eq: (k: string, v: unknown) => { filters.push([k, v]); return q; },
      maybeSingle: async () => ({ data: fx.rows.find((r) => filters.every(([k, v]) => r[k] === v)) ?? null, error: null }),
    };
    return q;
  };
  return { from, rpc: (...a: unknown[]) => fx.rpc(...a) };
}

vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: vi.fn(() => ({ success: true })) }));
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: (...a: unknown[]) => fx.getUser(...a) }));
vi.mock('@/lib/admin/server', () => ({ getSupabaseAdmin: () => fakeAdmin() }));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
vi.mock('@/backend/services/economy/awardCoins', () => ({ awardCoinsServer: (...a: unknown[]) => fx.award(...a) }));

import { FAMILY_RULES } from '@/lib/holidays/arcade/family';
import * as round from '../round/route';
import * as score from '../score/route';

const base = { holiday: 'christmas', localDate: '2026-12-15', locale: 'en' };
const post = (b: unknown) => new Request('http://x/api', { method: 'POST', body: JSON.stringify(b), headers: { 'content-type': 'application/json' } }) as never;

async function startDash() {
  const res = await round.POST(post({ ...base, game: 'dash' }));
  return (await res.json()) as { roundId: string; content: { seed: number } };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-12-15T10:00:00Z'));
  fx.rows.length = 0;
  fx.updates.length = 0;
  fx.getUser.mockReset().mockResolvedValue({ id: 'u1' });
  fx.award.mockReset().mockResolvedValue({ success: true });
  fx.rpc.mockReset().mockImplementation(async (_n: string, a: { p_coins: number }) => ({ data: a.p_coins, error: null }));
});

describe('holiday arcade routes', () => {
  it('Given only handlers are exported, then each route file is deployable', () => {
    for (const m of [round, score]) for (const k of Object.keys(m)) expect(['GET', 'POST']).toContain(k);
  });

  it('Given a guest, when a round starts, then a seed comes back with no round id and nothing is stored', async () => {
    fx.getUser.mockResolvedValue(null);
    const res = await round.POST(post({ ...base, game: 'splat' }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.roundId).toBeNull();
    expect(Number.isInteger(body.content.seed)).toBe(true);
    expect(fx.rows).toHaveLength(0);
  });

  it('Given a date outside the holiday (preview screenshots), then a seed is served with no round and nothing is stored', async () => {
    vi.setSystemTime(new Date('2026-11-27T10:00:00Z'));
    const res = await round.POST(post({ holiday: 'hanukkah', localDate: '2026-11-27', locale: 'he', game: 'catch' }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.roundId).toBeNull();
    expect(Number.isInteger(body.content.seed)).toBe(true);
    expect(fx.rows).toHaveLength(0);
    expect((await round.POST(post({ holiday: 'hanukkah', localDate: '2026-11-27', game: 'dash' }))).status).toBe(400);
  });

  it('Given a retired word game or a game from the other holiday, then the round is refused', async () => {
    expect((await round.POST(post({ ...base, game: 'catch' }))).status).toBe(400);
    expect((await round.POST(post({ ...base, game: 'sleigh' }))).status).toBe(400);
    expect((await round.POST(post({ ...base, game: 'snowball' }))).status).toBe(400);
  });

  it('Given a guest, when submitting a score, then it is 401 and no coins move', async () => {
    fx.getUser.mockResolvedValue(null);
    expect((await score.POST(post({ ...base, roundId: 'r1', score: 100 }))).status).toBe(401);
    expect(fx.award).not.toHaveBeenCalled();
  });

  it('Given a submit 3 seconds after start, then it is refused as too fast', async () => {
    const { roundId } = await startDash();
    vi.setSystemTime(new Date('2026-12-15T10:00:03Z'));
    expect((await score.POST(post({ ...base, roundId, score: 10 }))).status).toBe(400);
  });

  it('Given the daily cap is reached, then the round settles with 0 coins and no award call', async () => {
    const { roundId } = await startDash();
    vi.setSystemTime(new Date('2026-12-15T10:01:00Z'));
    fx.rpc.mockResolvedValue({ data: 0, error: null });
    const body = await (await score.POST(post({ ...base, roundId, score: 2000 }))).json();
    expect(body.coins).toBe(0);
    expect(body.capped).toBe(true);
    expect(fx.award).not.toHaveBeenCalled();
  });

  it('Given an already settled round, then a resubmit pays nothing', async () => {
    const { roundId } = await startDash();
    vi.setSystemTime(new Date('2026-12-15T10:01:00Z'));
    fx.rpc.mockResolvedValue({ data: -1, error: null });
    const body = await (await score.POST(post({ ...base, roundId, score: 50 }))).json();
    expect(body.status).toBe('already');
    expect(fx.award).not.toHaveBeenCalled();
  });

  it('Given the coin grant fails, then the round keeps 0 coins and says so', async () => {
    const { roundId } = await startDash();
    vi.setSystemTime(new Date('2026-12-15T10:01:00Z'));
    fx.award.mockResolvedValue({ success: false });
    const body = await (await score.POST(post({ ...base, roundId, score: 2000 }))).json();
    expect(body.coins).toBe(0);
    expect(body.coinError).toBe(true);
    expect(fx.updates).toContainEqual({ coins: 0 });
  });

  it('Given a new game, when a round starts, then the row is stored under its own id', async () => {
    const res = await round.POST(post({ ...base, game: 'presents' }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(Number.isInteger(body.content.seed)).toBe(true);
    expect(fx.rows[0]).toMatchObject({ game: 'presents' });
    await round.POST(post({ ...base, game: 'dash' }));
    expect(fx.rows[1]).toMatchObject({ game: 'dash' });
  });

  it('Given a score above the game cap, then the server pays from the capped score', async () => {
    const res = await round.POST(post({ ...base, game: 'splat' }));
    const { roundId } = await res.json();
    vi.setSystemTime(new Date('2026-12-15T10:00:40Z'));
    const body = await (await score.POST(post({ ...base, roundId, score: 999_999 }))).json();
    expect(body.status).toBe('settled');
    expect(body.score).toBe(40 * FAMILY_RULES.splat.perSecond);
    expect(body.score).toBeGreaterThan(0);
  });
});
