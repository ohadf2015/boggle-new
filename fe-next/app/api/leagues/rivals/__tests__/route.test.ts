import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const authed = vi.fn();
const load = vi.fn();

vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: () => authed() }));
vi.mock('@/utils/supabase/server', () => ({ createClient: async () => ({}) }));
vi.mock('@/lib/rivals/leagueRivals', () => ({ loadLeagueNeighbors: (...a: unknown[]) => load(...a) }));

import { GET } from '../route';

describe('GET /api/leagues/rivals', () => {
  beforeEach(() => {
    authed.mockReset().mockResolvedValue({ id: 'me' });
    load.mockReset().mockResolvedValue({ above: null, below: null, player: null });
  });

  it('Given no session, Then 401 and nothing is loaded', async () => {
    authed.mockResolvedValue(null);
    const res = await GET(new NextRequest('http://x/api/leagues/rivals?userId=victim'));
    expect(res.status).toBe(401);
    expect(load).not.toHaveBeenCalled();
  });

  it('Given a session, When the query names another user, Then the session user is used', async () => {
    await GET(new NextRequest('http://x/api/leagues/rivals?userId=victim'));
    expect(load.mock.calls[0][1]).toBe('me');
  });
});
