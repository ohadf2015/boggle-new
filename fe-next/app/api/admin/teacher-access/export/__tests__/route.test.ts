import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[], error: null as null | { message: string } }));

vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'admin-1' } } }) },
    from: (table: string) => {
      if (table === 'profiles') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { is_admin: true } }) }) }) };
      }
      const q = {
        select: () => q,
        order: () => q,
        eq: () => q,
        then: (resolve: (v: unknown) => void) => resolve({ data: h.error ? null : h.rows, error: h.error }),
      };
      return q;
    },
  }),
}));

import { GET } from '../route';

const get = () => GET(new Request('http://t/api/admin/teacher-access/export'));

describe('GET /api/admin/teacher-access/export', () => {
  beforeEach(() => {
    h.rows = [];
    h.error = null;
  });

  it.each(['=HYPERLINK("http://evil","x")', '+1+1', '-2+3', '@SUM(A1)', '\t=1', '\r=1'])(
    'neutralises a cell an applicant starts with %j',
    async (payload) => {
      h.rows = [{ id: 'r1', full_name: payload, school_or_org: 'ok', use_case: 'fine' }];
      const csv = await (await get()).text();
      const line = csv.split('\n')[1];
      const cells = line.split('","');
      const nameCell = cells[3];
      expect(nameCell.startsWith("'")).toBe(true);
    },
  );

  it('leaves ordinary text and quotes intact', async () => {
    h.rows = [{ id: 'r1', full_name: 'Dana "DJ" Levi', use_case: 'ESL class' }];
    const csv = await (await get()).text();
    expect(csv).toContain('"Dana ""DJ"" Levi"');
  });

  it('500s instead of sending an empty file when the query fails', async () => {
    h.error = { message: 'boom' };
    const res = await get();
    expect(res.status).toBe(500);
  });
});
