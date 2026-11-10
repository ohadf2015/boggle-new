import { markSocketIdentity } from '../socketAuth';

describe('markSocketIdentity', () => {
  it('Given no token, When marked, Then the socket is a plain guest', () => {
    const data: Record<string, unknown> = {};
    markSocketIdentity(data, undefined, null);
    expect(data).toEqual({ verifiedUserId: null, authUnverified: false });
  });

  it('Given a token that verified, When marked, Then the verified id and email are stored', () => {
    const data: Record<string, unknown> = {};
    markSocketIdentity(data, 'jwt', { userId: 'u1', email: 'a@b.c' });
    expect(data).toEqual({ verifiedUserId: 'u1', verifiedEmail: 'a@b.c', authUnverified: false });
  });

  it('Given a token the server could not verify, When marked, Then the socket carries no id and is flagged unverified', () => {
    const data: Record<string, unknown> = {};
    markSocketIdentity(data, 'jwt', null);
    expect(data).toEqual({ verifiedUserId: null, authUnverified: true });
  });
});
