import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const resolveRival = vi.fn();
const authed = vi.fn();

vi.mock('@/lib/rivals/resolveRival', () => ({ resolveRival: (...a: unknown[]) => resolveRival(...a) }));
vi.mock('@/lib/rivals/rivalDeps', () => ({ rivalDeps: () => ({}) }));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: () => ({}) }));
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: () => authed() }));
vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: () => ({ success: true }) }));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));

import { GET } from '../route';

const get = (qs: string) => GET(new NextRequest(`http://x/api/rivals/current?${qs}`));

describe('GET /api/rivals/current', () => {
  beforeEach(() => {
    resolveRival.mockReset().mockResolvedValue({ kind: 'h2h', name: 'Bea' });
    authed.mockReset().mockResolvedValue({ id: 'me' });
  });

  it('Given an unknown mode, Then it is a 400', async () => {
    expect((await get('mode=nope')).status).toBe(400);
  });

  it('Given edu, Then no lookup runs (classroom rivals come from the screen)', async () => {
    const res = await get('mode=edu');
    expect(await res.json()).toEqual({ rival: null });
    expect(resolveRival).not.toHaveBeenCalled();
  });

  it('Given a signed-in caller, Then the session id is used, never a query param', async () => {
    const res = await get('mode=multiplayer&userId=someone-else&opponents=11111111-1111-1111-1111-111111111111,22222222-2222-2222-2222-222222222222,not-an-id&score=12&previousBest=10');
    expect(await res.json()).toEqual({ rival: { kind: 'h2h', name: 'Bea' } });
    expect(resolveRival.mock.calls[0][1]).toMatchObject({ mode: 'multiplayer', userId: 'me', opponentUserIds: ['11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'], score: 12, previousBest: 10 });
  });

  it('Given a guest on the daily, Then the fingerprint and date are passed', async () => {
    authed.mockResolvedValue(null);
    await get('mode=daily&fp=abc&date=2026-11-11&lang=he');
    expect(resolveRival.mock.calls[0][1]).toMatchObject({ userId: null, guestFp: 'abc', date: '2026-11-11', lang: 'he' });
  });

  it('Given a bad date, Then it is ignored', async () => {
    await get('mode=daily&date=../x');
    expect(resolveRival.mock.calls[0][1].date).toBeUndefined();
  });
});
