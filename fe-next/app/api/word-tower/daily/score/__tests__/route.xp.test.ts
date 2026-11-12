import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: () => ({ success: true }) }));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
vi.mock('@/lib/daily/questSeams', () => ({ creditDailyQuests: vi.fn() }));

let user: { id: string } | null = { id: 'user-1' };
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: async () => user }));

const grant = vi.fn();
vi.mock('@/backend/modules/xpGrant', async (orig) => ({
  ...(await orig<typeof import('@/backend/modules/xpGrant')>()),
  grantSoloGameXp: (...a: unknown[]) => grant(...a),
}));

let claimable = true;
let claimError: unknown = null;
const claimCalls: unknown[] = [];
vi.mock('@/lib/email', () => ({
  getSupabaseAdmin: () => ({
    from: () => {
      let updating: Record<string, unknown> | null = null;
      const b: Record<string, unknown> = {
        select: () => b,
        eq: () => b,
        is: (col: string, v: unknown) => { claimCalls.push([col, v]); return b; },
        update: (v: Record<string, unknown>) => { updating = v; return b; },
        insert: async () => ({ error: null }),
        maybeSingle: async () => {
          if (updating && 'xp_granted_at' in updating) {
            if (claimError) return { data: null, error: claimError };
            const ok = claimable;
            claimable = false;
            return { data: ok ? { best_height_m: 42 } : null, error: null };
          }
          return { data: null };
        },
      };
      return b;
    },
  }),
}));

import { POST } from '../route';

type PostArg = Parameters<typeof POST>[0];
const req = (body: unknown) =>
  new Request('http://localhost/api/word-tower/daily/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as PostArg;

beforeEach(() => {
  grant.mockReset().mockResolvedValue({ xpEarned: 56, newTotalXp: 300, oldLevel: 2, newLevel: 3, leveledUp: true, xpBreakdown: {} });
  user = { id: 'user-1' };
  claimable = true;
  claimError = null;
  claimCalls.length = 0;
});

describe('daily word tower score — XP', () => {
  it('grants solo XP for today\'s best climb on the banked flush and returns the level-up', async () => {
    const body = await (await POST(req({ heightM: 30, floors: 10, language: 'en', final: true }))).json();
    expect(grant).toHaveBeenCalledWith(expect.anything(), 'user-1', { score: 42 });
    expect(body).toMatchObject({ ok: true, xpEarned: 56, newTotalXp: 300, levelUp: { oldLevel: 2, newLevel: 3 } });
    expect(claimCalls).toContainEqual(['xp_granted_at', null]);
  });

  it('grants once per day: a second flush finds the claim taken', async () => {
    await POST(req({ heightM: 30, language: 'en', final: true }));
    const second = await (await POST(req({ heightM: 30, language: 'en', final: true }))).json();
    expect(grant).toHaveBeenCalledTimes(1);
    expect(second.xpEarned).toBeUndefined();
  });

  it('never grants on a mid-climb tick', async () => {
    await POST(req({ heightM: 30, language: 'en' }));
    expect(grant).not.toHaveBeenCalled();
  });

  it('never grants a guest', async () => {
    user = null;
    await POST(req({ heightM: 30, language: 'en', final: true, guestFingerprint: 'g1' }));
    expect(grant).not.toHaveBeenCalled();
  });

  it('still saves the climb when the claim fails', async () => {
    claimError = { code: '42703', message: 'column does not exist' };
    const res = await POST(req({ heightM: 30, language: 'en', final: true }));
    expect(res.status).toBe(200);
    expect(grant).not.toHaveBeenCalled();
  });
});
