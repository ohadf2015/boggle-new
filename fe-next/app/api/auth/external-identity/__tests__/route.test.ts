// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: vi.fn() }));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/auth/externalIdentity', async (orig) => ({
  ...(await orig<typeof import('@/lib/auth/externalIdentity')>()),
  linkExternalIdentity: vi.fn(async () => ({ ok: true, status: 'linked' })),
}));

import { POST } from '../route';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { createAdminClient } from '@/utils/supabase/admin';
import { linkExternalIdentity } from '@/lib/auth/externalIdentity';

// Shape of auth.users identities as Supabase returns them from auth.admin.getUserById.
const identities = [
  { provider: 'google', id: 'ident-g', identity_data: { sub: '109876543210', email: 'Kid@School.org' } },
  { provider: 'azure', id: 'ident-ms', identity_data: { sub: 'ms-oid-sub', email: 'teacher@district.edu' } },
  { provider: 'discord', id: 'ident-d', identity_data: { sub: 'disc-1', email: 'x@y.z' } },
  { provider: 'email', id: 'ident-e', identity_data: { sub: 'u1', email: 'a@b.c' } },
];
const adminWith = (user: unknown) => ({
  auth: { admin: { getUserById: vi.fn(async () => ({ data: { user }, error: null })) } },
});
const req = () => new Request('http://t/api/auth/external-identity', { method: 'POST', headers: { authorization: 'Bearer tok' } });

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NEXT_PUBLIC_EXTERNAL_IDENTITY_LINKING_ENABLED', 'true');
  (getAuthedUser as any).mockResolvedValue({ id: 'u1' });
  (createAdminClient as any).mockReturnValue(adminWith({ id: 'u1', identities }));
});
afterEach(() => vi.unstubAllEnvs());

describe('POST /api/auth/external-identity', () => {
  it('404s and does nothing while the flag is off', async () => {
    vi.stubEnv('NEXT_PUBLIC_EXTERNAL_IDENTITY_LINKING_ENABLED', '');
    const res = await POST(req());
    expect(res.status).toBe(404);
    expect(getAuthedUser).not.toHaveBeenCalled();
    expect(linkExternalIdentity).not.toHaveBeenCalled();
  });

  it('401s without a signed-in user', async () => {
    (getAuthedUser as any).mockResolvedValue(null);
    expect((await POST(req())).status).toBe(401);
  });

  it('500s (logged) when the service role is missing', async () => {
    (createAdminClient as any).mockReturnValue(null);
    expect((await POST(req())).status).toBe(500);
  });

  it('records only Google and Microsoft identities, read from the server-side user', async () => {
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, linked: 2, skipped: 0 });
    expect(linkExternalIdentity).toHaveBeenCalledTimes(2);
    expect((linkExternalIdentity as any).mock.calls.map((c: unknown[]) => c[1])).toEqual([
      { userId: 'u1', provider: 'google', externalId: '109876543210', email: 'Kid@School.org' },
      { userId: 'u1', provider: 'microsoft', externalId: 'ms-oid-sub', email: 'teacher@district.edu' },
    ]);
  });

  it('counts a conflicting identity as skipped, not linked', async () => {
    (linkExternalIdentity as any).mockResolvedValueOnce({ ok: false, reason: 'conflict' });
    const res = await POST(req());
    expect(await res.json()).toEqual({ ok: true, linked: 1, skipped: 1 });
  });

  it('never links an anonymous guest', async () => {
    (createAdminClient as any).mockReturnValue(adminWith({ id: 'u1', is_anonymous: true, identities }));
    const res = await POST(req());
    expect(await res.json()).toEqual({ ok: true, linked: 0, skipped: 0 });
    expect(linkExternalIdentity).not.toHaveBeenCalled();
  });
});
