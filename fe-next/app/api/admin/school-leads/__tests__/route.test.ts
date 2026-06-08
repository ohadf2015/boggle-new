import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  user: { id: 'u1' } as { id: string } | null,
  isAdmin: true as boolean,
  rows: [{ id: 'l1', school_or_district: 'Lincoln', email: 'a@b.edu' }] as any[],
  eqCalls: [] as Array<[string, unknown]>,
}));

vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: h.user } }) },
    from: (table: string) => {
      if (table === 'profiles') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: h.isAdmin ? { id: 'u1', is_admin: true } : { id: 'u1', is_admin: false } }) }) }) };
      }
      // school_leads: chainable select/eq/order/range; terminal awaited value
      const builder: any = {
        select: () => builder,
        eq: (col: string, val: unknown) => { h.eqCalls.push([col, val]); return builder; },
        contains: () => builder,
        order: () => builder,
        range: async () => ({ data: h.rows, error: null, count: h.rows.length }),
      };
      return builder;
    },
  }),
}));

import { GET } from '../route';

const mkReq = (qs = '') => new Request(`http://test/api/admin/school-leads${qs}`);

describe('GET /api/admin/school-leads', () => {
  beforeEach(() => {
    h.user = { id: 'u1' };
    h.isAdmin = true;
    h.rows = [{ id: 'l1', school_or_district: 'Lincoln', email: 'a@b.edu' }];
    h.eqCalls = [];
  });

  it('401 when no session', async () => {
    h.user = null;
    expect((await GET(mkReq())).status).toBe(401);
  });

  it('403 when not admin', async () => {
    h.isAdmin = false;
    expect((await GET(mkReq())).status).toBe(403);
  });

  it('200 returns rows + count for an admin', async () => {
    const res = await GET(mkReq());
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.ok).toBe(true);
    expect(j.rows).toHaveLength(1);
    expect(j.count).toBe(1);
  });

  it('passes role / student_count / locale / interest filters through', async () => {
    await GET(mkReq('?role=district_admin&student_count=gte_2000&locale=en&interest=pricing_info'));
    const cols = h.eqCalls.map((c) => c[0]);
    expect(cols).toContain('role');
    expect(cols).toContain('student_count');
    expect(cols).toContain('locale');
  });
});
