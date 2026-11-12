import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({ user: { id: 'user-1' } as { id: string } | null, row: null as unknown, error: null as unknown, cols: '' }));

vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: async () => state.user }));
vi.mock('@/lib/admin/adminNotifications', () => ({ notifyAdmins: vi.fn() }));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: () => null }));
vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({
      select: (cols: string) => ((state.cols = cols), {
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
    const body = await res.json();
    expect(body).toEqual({ ok: false, error: 'lookup_failed', code: 'lookup_failed' });
    expect(JSON.stringify(body)).not.toContain('timeout');
  });

  it('Given a pending or approved row, Then admin review fields never reach the browser and the select names its columns', async () => {
    state.row = { id: 'r1', status: 'approved', admin_note: 'internal: check school', reviewed_by: 'admin-1', reviewed_at: '2026-11-01T00:00:00Z', email: 'jane@school.edu', created_at: '2026-11-01T00:00:00Z', trial_expires_at: null };
    const body = await (await GET(req())).json();
    expect(body.row).not.toHaveProperty('admin_note');
    expect(body.row).not.toHaveProperty('reviewed_by');
    expect(body.row).not.toHaveProperty('email');
    expect(body.row).toMatchObject({ id: 'r1', status: 'approved' });
    expect(state.cols).not.toContain('*');
    expect(state.cols).not.toContain('reviewed_by');
  });

  it('Given a declined row, Then its note comes along, since it is the reason the decline email already sent the applicant', async () => {
    state.row = { id: 'r1', status: 'declined', admin_note: 'Please use your school email', reviewed_by: 'admin-1' };
    const body = await (await GET(req())).json();
    expect(body.row.admin_note).toBe('Please use your school email');
    expect(body.row).not.toHaveProperty('reviewed_by');
  });
});
