import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({ user: { id: 'user-1' } as { id: string } | null, row: null as unknown, error: null as unknown }));

vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: async () => state.user }));
vi.mock('@/lib/admin/adminNotifications', () => ({ notifyAdmins: vi.fn() }));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: () => null }));
vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: state.row, error: state.error }) }) }),
        }),
      }),
    }),
  }),
}));

import { GET } from '../route';

const req = () => new Request('http://test/api/education/access-request') as unknown as NextRequest;

describe('GET /api/education/access-request', () => {
  beforeEach(() => {
    state.user = { id: 'user-1' };
    state.row = null;
    state.error = null;
  });

  it('Given a signed-in teacher with a request, When read, Then returns that row', async () => {
    state.row = { id: 'r1', status: 'pending' };
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ row: { id: 'r1', status: 'pending' } });
  });

  it('Given a signed-in teacher with no request, When read, Then returns a null row', async () => {
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ row: null });
  });

  it('Given the database read fails, When read, Then answers 500 so the page never mistakes it for "no request"', async () => {
    state.error = { message: 'timeout' };
    const res = await GET(req());
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ ok: false });
  });
});
