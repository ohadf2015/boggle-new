import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: () => ({ success: true }) }));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: async () => ({ id: 'user-1' }) }));

const credit = vi.fn();
vi.mock('@/lib/daily/questSeams', () => ({ creditDailyQuests: (...a: unknown[]) => credit(...a) }));

const claim = vi.fn();
vi.mock('@/lib/wordTower/towerXp', () => ({ claimDailyTowerXp: (...a: unknown[]) => claim(...a) }));

let existing: { id: string; best_height_m: number; floors: number } | null = null;
vi.mock('@/lib/email', () => ({
  getSupabaseAdmin: () => ({
    from: () => {
      const b: Record<string, unknown> = {
        select: () => b,
        eq: () => b,
        maybeSingle: async () => ({ data: existing }),
        insert: async () => ({ error: null }),
        update: () => b,
        then: (resolve: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve),
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
  credit.mockReset();
  claim.mockReset();
  claim.mockResolvedValue({});
  existing = null;
});

describe('daily word tower score — quest level-up', () => {
  it('puts the level-up from daily-quest XP in the final flush response', async () => {
    credit.mockResolvedValue({ oldLevel: 4, newLevel: 5 });
    const res = await POST(req({ heightM: 30, floors: 10, language: 'en', final: true }));
    expect((await res.json()).levelUp).toEqual({ oldLevel: 4, newLevel: 5 });
  });

  it('spans the tower XP and the quest XP when both level up', async () => {
    claim.mockResolvedValue({ xpEarned: 80, newTotalXp: 999, levelUp: { oldLevel: 4, newLevel: 5 } });
    credit.mockResolvedValue({ oldLevel: 5, newLevel: 6 });
    existing = { id: 'r1', best_height_m: 10, floors: 3 };
    const res = await POST(req({ heightM: 30, floors: 10, language: 'en', final: true }));
    expect((await res.json()).levelUp).toEqual({ oldLevel: 4, newLevel: 6 });
  });

  it('keeps the tower level-up when the quests granted nothing', async () => {
    claim.mockResolvedValue({ xpEarned: 80, newTotalXp: 999, levelUp: { oldLevel: 4, newLevel: 5 } });
    credit.mockResolvedValue(null);
    existing = { id: 'r1', best_height_m: 40, floors: 12 };
    const res = await POST(req({ heightM: 30, floors: 10, language: 'en', final: true }));
    expect((await res.json()).levelUp).toEqual({ oldLevel: 4, newLevel: 5 });
  });

  it('carries no level-up on a mid-climb tick', async () => {
    const res = await POST(req({ heightM: 30, floors: 10, language: 'en' }));
    expect((await res.json()).levelUp).toBeUndefined();
  });
});
