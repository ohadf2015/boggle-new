import { describe, it, expect, vi } from 'vitest';

const getSession = vi.fn();
vi.mock('../client', () => ({ createClient: () => ({ auth: { getSession } }) }));

import { bearerHeader } from '../bearerHeader';

describe('bearerHeader', () => {
  it('given a session, then returns an Authorization header', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } });
    expect(await bearerHeader()).toEqual({ Authorization: 'Bearer tok' });
  });

  it('given no session or an auth error, then returns no header', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    expect(await bearerHeader()).toEqual({});
    getSession.mockRejectedValue(new Error('lock'));
    expect(await bearerHeader()).toEqual({});
  });
});
