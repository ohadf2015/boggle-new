import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { rateLimit, findUser, updateUserById, resend } = vi.hoisted(() => ({
  rateLimit: vi.fn(() => ({ success: true })),
  findUser: vi.fn(),
  updateUserById: vi.fn(),
  resend: vi.fn(async () => ({ error: null })),
}));

vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: rateLimit }));
vi.mock('@/lib/education/findAuthUserByEmail', () => ({ findAuthUserByEmail: findUser }));
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    auth: { admin: { updateUserById }, resend },
  }),
}));
vi.mock('@/utils/logger', () => ({ default: { error: vi.fn(), warn: vi.fn() } }));

import { POST } from '../route';

const req = (body: unknown) =>
  new NextRequest('http://t/api/education/classroom/join/recover-email', {
    method: 'POST',
    body: JSON.stringify(body),
  });

describe('POST /api/education/classroom/join/recover-email', () => {
  beforeEach(() => {
    rateLimit.mockReset().mockReturnValue({ success: true });
    findUser.mockReset();
    updateUserById.mockReset();
    resend.mockClear();
  });

  it('refuses a non-typo before looking anyone up', async () => {
    const res = await POST(req({ email: 'a@school.edu', nextEmail: 'b@other-school.edu' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, code: 'NOT_A_TYPO' });
    expect(findUser).not.toHaveBeenCalled();
  });

  it('rewrites only an unconfirmed account and resends to the class code', async () => {
    findUser.mockResolvedValue({ user: { id: 'u1', emailConfirmedAt: null } });
    updateUserById.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    const res = await POST(req({
      email: 'a@student.mpac.nsw.edu.au',
      nextEmail: 'a@students.mpac.nsw.edu.au',
      locale: 'en',
      joinCode: 'ab12cd',
    }));
    expect(res.status).toBe(200);
    expect(updateUserById).toHaveBeenCalledWith('u1', {
      email: 'a@students.mpac.nsw.edu.au',
      email_confirm: false,
    });
    expect(resend).toHaveBeenCalledWith(expect.objectContaining({
      type: 'signup',
      email: 'a@students.mpac.nsw.edu.au',
      options: { emailRedirectTo: 'https://www.lexiclash.live/en/join/AB12CD' },
    }));
  });

  it('does not rewrite a confirmed account and does not say so', async () => {
    findUser.mockResolvedValue({ user: { id: 'u1', emailConfirmedAt: '2026-11-03T00:00:00Z' } });
    const res = await POST(req({
      email: 'a@student.mpac.nsw.edu.au',
      nextEmail: 'a@students.mpac.nsw.edu.au',
    }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it('tells the student when the corrected address is already taken', async () => {
    findUser.mockResolvedValue({ user: { id: 'u1', emailConfirmedAt: null } });
    updateUserById.mockResolvedValue({ data: { user: null }, error: { message: 'A user with this email address has already been registered' } });
    const res = await POST(req({
      email: 'a@student.mpac.nsw.edu.au',
      nextEmail: 'a@students.mpac.nsw.edu.au',
    }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false, code: 'TAKEN' });
  });

  it('rate-limits before any lookup', async () => {
    rateLimit.mockReturnValue({ success: false });
    const res = await POST(req({ email: 'a@school.edu', nextEmail: 'a@schools.edu' }));
    expect(res.status).toBe(429);
    expect(findUser).not.toHaveBeenCalled();
  });
});
