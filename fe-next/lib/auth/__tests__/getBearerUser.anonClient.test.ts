import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetUser = vi.fn();
const createClient = vi.hoisted(() => vi.fn());
vi.mock('@supabase/supabase-js', () => ({ createClient }));
vi.mock('@sentry/nextjs', () => ({ captureMessage: vi.fn() }));

import { getBearerUser } from '../getBearerUser';

const bearer = (token: string) =>
  new Request('http://x/api', { headers: { authorization: `Bearer ${token}` } });

describe('getBearerUser remote fallback', () => {
  beforeEach(() => {
    vi.stubEnv('SUPABASE_JWT_SECRET', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://supabase.test');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    createClient.mockReset();
    createClient.mockImplementation(() => ({ auth: { getUser: mockGetUser } }));
    mockGetUser.mockResolvedValue({ data: { user: { id: 'remote-1' } }, error: null });
  });

  it('reuses one anon client across requests', async () => {
    expect(await getBearerUser(bearer('not.a.jwt'))).toMatchObject({ id: 'remote-1' });
    expect(await getBearerUser(bearer('still.not.a.jwt'))).toMatchObject({ id: 'remote-1' });
    expect(mockGetUser).toHaveBeenCalledTimes(2);
    expect(createClient).toHaveBeenCalledTimes(1);
  });
});
