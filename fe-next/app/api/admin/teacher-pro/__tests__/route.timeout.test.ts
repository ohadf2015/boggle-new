import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const verifyAdminAuth = vi.fn();
vi.mock('@/lib/auth/adminAuth', () => ({ verifyAdminAuth: (...a: unknown[]) => verifyAdminAuth(...a) }));

const grantTeacherPro = vi.fn();
vi.mock('@/lib/education/proGrantServer', () => ({
  grantTeacherPro: (...a: unknown[]) => grantTeacherPro(...a),
  revokeProGrant: vi.fn(),
}));

vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }));

import { POST } from '../route';

const admin = { success: true, user: { id: 'admin-1', email: 'a@x.org' } };

function req(body: unknown) {
  return new NextRequest('http://localhost/api/admin/teacher-pro', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  verifyAdminAuth.mockReset();
  grantTeacherPro.mockReset();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('POST /api/admin/teacher-pro — wall-clock cap', () => {
  it('returns 504 instead of hanging indefinitely when grantTeacherPro never resolves', async () => {
    verifyAdminAuth.mockResolvedValue(admin);
    grantTeacherPro.mockReturnValue(new Promise(() => { /* never resolves — e.g. a hung Supabase or Resend call */ }));

    const responsePromise = POST(req({ email: 't@x.org' }));
    await vi.advanceTimersByTimeAsync(25_001);

    const res = await responsePromise;
    expect(res.status).toBe(504);
    const body = await res.json();
    expect(body.error).toMatch(/timeout/i);
  });
});
