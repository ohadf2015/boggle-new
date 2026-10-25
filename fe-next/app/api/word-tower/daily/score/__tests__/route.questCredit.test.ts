import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: () => ({ success: true }) }));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: async () => ({ id: 'user-1' }) }));

const credit = vi.fn();
vi.mock('@/lib/daily/questSeams', () => ({ creditDailyQuests: (...a: unknown[]) => credit(...a) }));

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
  credit.mockClear();
  existing = null;
});

describe('daily word tower score — quest credit', () => {
  it('does not credit quests for a mid-climb tick (tower can still collapse)', async () => {
    await POST(req({ heightM: 30, floors: 10, language: 'en' }));
    expect(credit).not.toHaveBeenCalled();
  });

  it('does not credit quests for an improved mid-climb update either', async () => {
    existing = { id: 'r1', best_height_m: 10, floors: 3 };
    await POST(req({ heightM: 30, floors: 10, language: 'en' }));
    expect(credit).not.toHaveBeenCalled();
  });

  it('credits quests once the climb is banked (final flush)', async () => {
    await POST(req({ heightM: 30, floors: 10, language: 'en', final: true }));
    expect(credit).toHaveBeenCalledTimes(1);
  });

  it('credits a banked climb even when it did not beat the stored best', async () => {
    existing = { id: 'r1', best_height_m: 40, floors: 12 };
    await POST(req({ heightM: 30, floors: 10, language: 'en', final: true }));
    expect(credit).toHaveBeenCalledTimes(1);
  });
});
