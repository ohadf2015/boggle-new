import { describe, it, expect, vi, beforeEach } from 'vitest';

const getUser = vi.fn();
vi.mock('../../../modules/supabaseServer', () => ({
  getSupabase: () => ({ auth: { getUser } }),
}));
vi.mock('../../../../lib/auth/getAuthedUser', () => ({
  cookieAccessToken: async (req: { headers: { get: (n: string) => string | null } }) =>
    req.headers.get('cookie') === 'session' ? 'cookie-token' : null,
}));

import { resolveDailyPlayer } from '../resolveDailyPlayer';

type Headers = Record<string, string | undefined>;
const req = (headers: Headers) => ({ headers }) as never;

describe('resolveDailyPlayer', () => {
  beforeEach(() => getUser.mockReset());

  it('given no playerId, when a guest submits, then it stays a guest without an auth call', async () => {
    expect(await resolveDailyPlayer(req({}), undefined)).toEqual({ ok: true, playerId: null });
    expect(getUser).not.toHaveBeenCalled();
  });

  it('given a playerId and no session, when submitted, then it is rejected', async () => {
    expect(await resolveDailyPlayer(req({}), 'victim-id')).toEqual({ ok: false, status: 401 });
  });

  it('given a cookie session, when playerId matches, then the verified id is used', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'me' } }, error: null });
    expect(await resolveDailyPlayer(req({ cookie: 'session' }), 'me')).toEqual({ ok: true, playerId: 'me' });
    expect(getUser).toHaveBeenCalledWith('cookie-token');
  });

  it('given a bearer session, when playerId belongs to someone else, then it is rejected', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'me' } }, error: null });
    expect(await resolveDailyPlayer(req({ authorization: 'Bearer t' }), 'victim-id')).toEqual({ ok: false, status: 401 });
    expect(getUser).toHaveBeenCalledWith('t');
  });

  it('given an invalid token, when playerId is sent, then it is rejected', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: new Error('bad jwt') });
    expect(await resolveDailyPlayer(req({ authorization: 'Bearer t' }), 'me')).toEqual({ ok: false, status: 401 });
  });
});
