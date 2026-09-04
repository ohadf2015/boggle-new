import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * `fetchWithAuth` falls back to an UNauthenticated request when there is no session. For a
 * read that has a public shape that is fine. For an endpoint that exists only for signed-in
 * users it is a guaranteed 401 — a round trip whose only outcome is a red line in session
 * replay. `/api/referral/milestone` did exactly this on 103 sessions in one week: it fires
 * once, on a player's first finished game, and most first games are played logged out.
 *
 * `requireSession` lets such a caller say "no session, no request": the helper answers 401
 * locally without touching the network, so the caller's own error handling is unchanged.
 */

const mockFetch = vi.fn();
const getSession = vi.fn();

vi.mock('@/lib/supabase', () => ({ supabase: { auth: { getSession: () => getSession() } } }));
vi.mock('@/utils/logger', () => ({ default: { debug: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { fetchWithAuth, postWithAuth } from '../authFetch';

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({ ok: true, status: 200 });
  getSession.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

const noSession = () => getSession.mockResolvedValue({ data: { session: null }, error: null });
const withSession = () =>
  getSession.mockResolvedValue({ data: { session: { access_token: 'tok' } }, error: null });

describe('requireSession', () => {
  it('does not hit the network when there is no session', async () => {
    noSession();
    const res = await fetchWithAuth('/api/private', { requireSession: true });
    expect(mockFetch).not.toHaveBeenCalled();
    expect(res.status).toBe(401);
    expect(res.ok).toBe(false);
  });

  it('sends the request normally when a session exists', async () => {
    withSession();
    await fetchWithAuth('/api/private', { requireSession: true });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('leaves the existing unauthenticated fallback alone when not opted in', async () => {
    noSession();
    await fetchWithAuth('/api/public');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('is reachable through postWithAuth', async () => {
    noSession();
    const res = await postWithAuth('/api/private', { a: 1 }, { requireSession: true });
    expect(mockFetch).not.toHaveBeenCalled();
    expect(res.status).toBe(401);
  });
});
