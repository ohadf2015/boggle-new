import { describe, it, expect, vi, beforeEach } from 'vitest';

const sameOrigin = { v: true };
const adminOk = { v: true };
vi.mock('@/lib/auth/sameOrigin', () => ({ isSameOrigin: () => sameOrigin.v }));
vi.mock('@/lib/auth/adminAuth', () => ({
  verifyAdminAuth: async () =>
    adminOk.v
      ? { success: true, user: { id: 'admin-1' } }
      : { success: false, response: new Response('no', { status: 401 }) },
}));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));

const cap: { upserts: unknown[]; updates: unknown[]; listResult: unknown[] } = {
  upserts: [],
  updates: [],
  listResult: [{ curator_id: 'u1', language: 'he', trust_tier: 1, active: true }],
};
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => {
      const chain: Record<string, unknown> = {};
      chain.upsert = (row: unknown) => {
        cap.upserts.push(row);
        return Promise.resolve({ error: null });
      };
      chain.update = (patch: unknown) => {
        cap.updates.push(patch);
        return { eq: () => ({ eq: () => Promise.resolve({ error: null }) }) };
      };
      chain.select = () => {
        const qb: Record<string, unknown> = {};
        qb.eq = () => qb;
        (qb as { then: unknown }).then = (resolve: (v: unknown) => void) =>
          resolve({ data: cap.listResult, error: null });
        return qb;
      };
      return chain;
    },
  }),
}));

import { GET, POST } from '../route';

type PostArg = Parameters<typeof POST>[0];
function req(body: unknown): PostArg {
  return new Request('http://localhost/api/admin/curators', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as PostArg;
}
const uid = '537a9da1-baee-4a94-b302-dbc97c9a16c2';

beforeEach(() => {
  sameOrigin.v = true;
  adminOk.v = true;
  cap.upserts = [];
  cap.updates = [];
});

describe('POST /api/admin/curators', () => {
  it('rejects cross-origin (403)', async () => {
    sameOrigin.v = false;
    const res = await POST(req({ userId: uid, language: 'he' }));
    expect(res.status).toBe(403);
    expect(cap.upserts).toHaveLength(0);
  });

  it('rejects a non-admin (401)', async () => {
    adminOk.v = false;
    const res = await POST(req({ userId: uid, language: 'he' }));
    expect(res.status).toBe(401);
  });

  it('rejects an invalid assignment (400)', async () => {
    const res = await POST(req({ userId: 'nope', language: 'he' }));
    expect(res.status).toBe(400);
    expect(cap.upserts).toHaveLength(0);
  });

  it('assigns a curator (upsert active row attributed to the admin)', async () => {
    const res = await POST(req({ userId: uid, language: 'he', trustTier: 2 }));
    expect(res.status).toBe(200);
    const row = cap.upserts[0] as Record<string, unknown>;
    expect(row.curator_id).toBe(uid);
    expect(row.active).toBe(true);
    expect(row.trust_tier).toBe(2);
    expect(row.assigned_by).toBe('admin-1');
  });

  it('revokes a curator (update active=false with reason)', async () => {
    const res = await POST(req({ action: 'revoke', userId: uid, language: 'he', reason: 'spam' }));
    expect(res.status).toBe(200);
    const patch = cap.updates[0] as Record<string, unknown>;
    expect(patch.active).toBe(false);
    expect(patch.revoked_by).toBe('admin-1');
    expect(patch.revoked_reason).toBe('spam');
  });
});

describe('GET /api/admin/curators', () => {
  it('lists curators for admins', async () => {
    const res = await GET(
      new Request('http://localhost/api/admin/curators?language=he') as unknown as PostArg
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.curators).toHaveLength(1);
  });

  it('rejects a non-admin (401)', async () => {
    adminOk.v = false;
    const res = await GET(new Request('http://localhost/api/admin/curators') as unknown as PostArg);
    expect(res.status).toBe(401);
  });
});
