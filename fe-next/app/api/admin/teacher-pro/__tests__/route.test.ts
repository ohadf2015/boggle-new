import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const verifyAdminAuth = vi.fn();
vi.mock('@/lib/auth/adminAuth', () => ({ verifyAdminAuth: (...a: unknown[]) => verifyAdminAuth(...a) }));

const grantTeacherPro = vi.fn();
const revokeProGrant = vi.fn();
vi.mock('@/lib/education/proGrantServer', () => ({
  grantTeacherPro: (...a: unknown[]) => grantTeacherPro(...a),
  revokeProGrant: (...a: unknown[]) => revokeProGrant(...a),
}));

const listRows: unknown[] = [];
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ order: () => ({ limit: async () => ({ data: listRows, error: null }) }) }),
    }),
  }),
}));

import { GET, POST } from '../route';
import { POST as revoke } from '../[id]/revoke/route';

const admin = { success: true, user: { id: 'admin-1', email: 'a@x.org' } };
const denied = { success: false, response: NextResponse.json({ error: 'nope' }, { status: 403 }) };

function req(body?: unknown, method = 'POST') {
  return new NextRequest('http://localhost/api/admin/teacher-pro', {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : {}),
  });
}

beforeEach(() => {
  verifyAdminAuth.mockReset();
  grantTeacherPro.mockReset();
  revokeProGrant.mockReset();
  listRows.length = 0;
});

describe('POST /api/admin/teacher-pro', () => {
  it('refuses non-admins before doing anything', async () => {
    verifyAdminAuth.mockResolvedValue(denied);
    const res = await POST(req({ email: 't@x.org' }));
    expect(res.status).toBe(403);
    expect(grantTeacherPro).not.toHaveBeenCalled();
  });

  it('validates the body', async () => {
    verifyAdminAuth.mockResolvedValue(admin);
    const res = await POST(req({ email: 'nope', days: 365 }));
    expect(res.status).toBe(400);
    expect(grantTeacherPro).not.toHaveBeenCalled();
  });

  it('grants a year by default and reports the outcome', async () => {
    verifyAdminAuth.mockResolvedValue(admin);
    grantTeacherPro.mockResolvedValue({ ok: true, grantId: 'g1', userId: 'u1', status: 'active', expiresAt: '2027-09-05T00:00:00.000Z', emailSent: true, fullName: 'Tori', email: 't@x.org' });
    const res = await POST(req({ email: 'T@x.org', note: 'hi' }));
    expect(res.status).toBe(200);
    expect((grantTeacherPro.mock.calls[0] as any)[0]).toMatchObject({ email: 'T@x.org', note: 'hi', grantedBy: 'admin-1' });
    expect((grantTeacherPro.mock.calls[0] as any)[0].days).toBeUndefined();
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, status: 'active', emailSent: true });
  });

  it('turns already_paid into a 409 so the admin sees why', async () => {
    verifyAdminAuth.mockResolvedValue(admin);
    grantTeacherPro.mockResolvedValue({ ok: false, error: 'already_paid' });
    const res = await POST(req({ email: 't@x.org' }));
    expect(res.status).toBe(409);
  });

  it('a failed grant is a 500 with the reason, never a silent ok', async () => {
    verifyAdminAuth.mockResolvedValue(admin);
    grantTeacherPro.mockResolvedValue({ ok: false, error: 'subscription upsert failed: rls' });
    const res = await POST(req({ email: 't@x.org' }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/rls/);
  });
});

describe('GET /api/admin/teacher-pro', () => {
  it('lists grants with a derived status', async () => {
    verifyAdminAuth.mockResolvedValue(admin);
    listRows.push({ id: 'g1', email: 't@x.org', user_id: 'u1', applied_at: '2026-09-05T00:00:00Z', revoked_at: null, expires_at: '2099-01-01T00:00:00Z' });
    listRows.push({ id: 'g2', email: 'n@x.org', user_id: null, applied_at: null, revoked_at: null, expires_at: '2099-01-01T00:00:00Z' });
    const res = await GET(req(undefined, 'GET'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rows.map((r: any) => r.status)).toEqual(['active', 'pending_signup']);
  });
});

describe('POST /api/admin/teacher-pro/[id]/revoke', () => {
  it('revokes as the admin', async () => {
    verifyAdminAuth.mockResolvedValue(admin);
    revokeProGrant.mockResolvedValue({ ok: true });
    const res = await revoke(req(), { params: Promise.resolve({ id: 'g1' }) });
    expect(res.status).toBe(200);
    expect(revokeProGrant).toHaveBeenCalledWith(expect.objectContaining({ grantId: 'g1', revokedBy: 'admin-1' }));
  });

  it('404s an unknown grant', async () => {
    verifyAdminAuth.mockResolvedValue(admin);
    revokeProGrant.mockResolvedValue({ ok: false, error: 'not found' });
    const res = await revoke(req(), { params: Promise.resolve({ id: 'zz' }) });
    expect(res.status).toBe(404);
  });
});
