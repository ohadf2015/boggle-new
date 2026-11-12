import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const load = vi.fn();
const authed = vi.fn();
const capture = vi.fn();

vi.mock('@/lib/friends/home/loadFriendsHome', () => ({ loadFriendsHome: (...a: unknown[]) => load(...a) }));
vi.mock('@/lib/friends/home/friendsHomeDeps', () => ({ friendsHomeDeps: () => ({}) }));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: () => ({}) }));
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: () => authed() }));
vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: () => ({ success: true }) }));
vi.mock('@/utils/sentry', () => ({ captureApiError: (...a: unknown[]) => capture(...a) }));

import { GET } from '../route';

const get = (qs = '') => GET(new NextRequest(`http://x/api/friends/home${qs}`));

describe('GET /api/friends/home', () => {
  beforeEach(() => {
    load.mockReset().mockResolvedValue({ friends: [], friendCount: 0, incoming: { count: 0, first: [] }, suggestions: [], canAddFriends: true });
    authed.mockReset().mockResolvedValue({ id: 'me' });
    capture.mockReset();
  });

  it('Given a guest, Then 401 and no lookup', async () => {
    authed.mockResolvedValue(null);
    expect((await get()).status).toBe(401);
    expect(load).not.toHaveBeenCalled();
  });

  it('Given a signed-in caller, Then the session id is used and the response is private', async () => {
    const res = await get('?userId=someone-else');
    expect(res.status).toBe(200);
    expect(load.mock.calls[0][1]).toBe('me');
    expect(res.headers.get('Cache-Control')).toContain('no-store');
  });

  it('Given ?suggestions=1, Then suggestions are asked for regardless of friend count', async () => {
    await get('?suggestions=1');
    expect(load.mock.calls[0][2]).toEqual({ suggestions: true });
  });

  it('Given the lookup fails, Then a 500 that reaches monitoring, never an empty crew', async () => {
    load.mockRejectedValue(new Error('db down'));
    expect((await get()).status).toBe(500);
    expect(capture).toHaveBeenCalled();
  });
});
