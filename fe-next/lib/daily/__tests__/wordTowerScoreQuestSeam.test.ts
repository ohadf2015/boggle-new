/**
 * Seam test: the daily Word Tower score route credits today's daily quests for
 * authed players (metres climbed + floors built), and never for guests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const creditMock = vi.hoisted(() => vi.fn());
const authedUser = vi.hoisted(() => ({ current: null as { id: string } | null }));
const existingRow = vi.hoisted(() => ({ current: null as Record<string, unknown> | null }));

vi.mock('@/lib/daily/questSeams', () => ({ creditDailyQuests: creditMock }));
vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: () => ({ success: true }) }));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: async () => authedUser.current }));
vi.mock('@/lib/email', () => ({
  getSupabaseAdmin: () => {
    const b: Record<string, unknown> = {
      select: () => b,
      eq: () => b,
      maybeSingle: async () => ({ data: existingRow.current }),
      update: () => b,
      insert: async () => ({ error: null }),
      then: (res: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(res),
    };
    return { from: () => b };
  },
}));

import { POST } from '@/app/api/word-tower/daily/score/route';
import { NextRequest } from 'next/server';

const post = (body: Record<string, unknown>) =>
  POST(new NextRequest('http://x/api/word-tower/daily/score', { method: 'POST', body: JSON.stringify(body) }));

describe('word tower daily score -> daily quests', () => {
  beforeEach(() => {
    creditMock.mockClear();
    authedUser.current = { id: 'user-1' };
    existingRow.current = null;
  });

  it('credits an authed first submit with metres + floors', async () => {
    const res = await post({ heightM: 30, floors: 9, language: 'en' });
    expect(res.status).toBe(200);
    expect(creditMock).toHaveBeenCalledTimes(1);
    const [uid, result] = creditMock.mock.calls[0];
    expect(uid).toBe('user-1');
    expect(result.mode).toBe('word-tower-daily');
    expect(result.towerMetres).toBe(30);
    expect(result.towerFloors).toBe(9);
  });

  it('credits with the merged best (improved update uses the higher of stored/new)', async () => {
    existingRow.current = { id: 'r1', best_height_m: 10, floors: 12 };
    await post({ heightM: 30, floors: 5, language: 'en' });
    const [, result] = creditMock.mock.calls[0];
    expect(result.towerMetres).toBe(30);
    expect(result.towerFloors).toBe(12);
  });

  it('does not credit guests', async () => {
    authedUser.current = null;
    const res = await post({ heightM: 30, floors: 9, language: 'en', guestFingerprint: 'g1' });
    expect(res.status).toBe(200);
    // creditDailyQuests itself no-ops without a user id (see questSeams.test.ts);
    // the route must never pass a guest identity through as a user id.
    for (const [uid] of creditMock.mock.calls) expect(uid).toBeFalsy();
  });

  it('does not re-credit when the submit is not an improvement', async () => {
    existingRow.current = { id: 'r1', best_height_m: 50, floors: 20 };
    await post({ heightM: 30, floors: 9, language: 'en' });
    expect(creditMock).not.toHaveBeenCalled();
  });
});
