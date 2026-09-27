import { describe, it, expect, vi, beforeEach } from 'vitest';

const adminOk = { v: true };
vi.mock('@/lib/auth/adminAuth', () => ({
  verifyAdminAuth: async () =>
    adminOk.v ? { success: true, user: { id: 'admin-1' } } : { success: false, response: new Response('no', { status: 401 }) },
}));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));

const cap = { eqs: [] as Array<[string, unknown]>, listResult: [{ id: 'p1', kind: 'word_approve', language: 'he', status: 'proposed' }] };
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => {
      const qb: Record<string, unknown> = {};
      qb.select = () => qb;
      qb.eq = (c: string, v: unknown) => {
        cap.eqs.push([c, v]);
        return qb;
      };
      qb.order = () => qb;
      qb.limit = () => qb;
      (qb as { then: unknown }).then = (resolve: (v: unknown) => void) => resolve({ data: cap.listResult, error: null });
      return qb;
    },
  }),
}));

import { GET } from '../route';
const req = (q = '') => new Request(`http://localhost/api/admin/curator-proposals${q}`) as never;

beforeEach(() => {
  adminOk.v = true;
  cap.eqs = [];
});

describe('GET /api/admin/curator-proposals', () => {
  it('rejects a non-admin (401)', async () => {
    adminOk.v = false;
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it('defaults to listing proposed proposals', async () => {
    const res = await GET(req());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.proposals).toHaveLength(1);
    expect(cap.eqs).toContainEqual(['status', 'proposed']);
  });

  it('filters by language when given', async () => {
    await GET(req('?language=he'));
    expect(cap.eqs).toContainEqual(['language', 'he']);
  });

  it('honours an explicit status filter', async () => {
    await GET(req('?status=ratified'));
    expect(cap.eqs).toContainEqual(['status', 'ratified']);
  });
});
