import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { getAuthedUser, getUserById, profileMaybe, update } = vi.hoisted(() => ({
  getAuthedUser: vi.fn(),
  getUserById: vi.fn(),
  profileMaybe: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser }));
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    auth: { admin: { getUserById } },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: profileMaybe }) }),
      update: (values: unknown) => {
        update(values);
        return { eq: () => ({ select: async () => ({ data: [{ id: 'u1' }], error: null }) }) };
      },
    }),
  }),
}));
vi.mock('@/utils/logger', () => ({ default: { error: vi.fn() } }));

import { POST } from '../route';

const req = () => new NextRequest('http://t/api/account/role', { method: 'POST' });

describe('POST /api/account/role', () => {
  beforeEach(() => {
    getAuthedUser.mockReset();
    getUserById.mockReset();
    profileMaybe.mockReset();
    update.mockReset();
  });

  it('promotes a confirmed student', async () => {
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 't@schools.nyc.gov' });
    getUserById.mockResolvedValue({
      data: { user: { email: 't@schools.nyc.gov', email_confirmed_at: '2026-11-03T16:19:00Z', is_anonymous: false } },
      error: null,
    });
    profileMaybe.mockResolvedValue({ data: { user_role: 'student', is_admin: false }, error: null });
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, user_role: 'teacher' });
    expect(update).toHaveBeenCalledWith({ user_role: 'teacher' });
  });

  it('refuses an unconfirmed email and an anonymous guest', async () => {
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 'a@school.edu' });
    getUserById.mockResolvedValue({
      data: { user: { email: 'a@school.edu', email_confirmed_at: null, is_anonymous: false } },
      error: null,
    });
    profileMaybe.mockResolvedValue({ data: { user_role: 'student', is_admin: false }, error: null });
    const unconfirmed = await POST(req());
    expect(unconfirmed.status).toBe(403);
    expect(await unconfirmed.json()).toEqual({ ok: false, code: 'UNCONFIRMED' });
    expect(update).not.toHaveBeenCalled();

    getUserById.mockResolvedValue({
      data: { user: { email: null, email_confirmed_at: null, is_anonymous: true } },
      error: null,
    });
    const guest = await POST(req());
    expect(guest.status).toBe(403);
    expect((await guest.json()).code).toBe('ANONYMOUS');
  });

  it('is idempotent for an existing teacher and closed without a session', async () => {
    getAuthedUser.mockResolvedValue({ id: 'u1', email: 't@school.edu' });
    getUserById.mockResolvedValue({
      data: { user: { email: 't@school.edu', email_confirmed_at: '2026-01-01', is_anonymous: false } },
      error: null,
    });
    profileMaybe.mockResolvedValue({ data: { user_role: 'teacher', is_admin: false }, error: null });
    const again = await POST(req());
    expect(again.status).toBe(200);
    expect(update).not.toHaveBeenCalled();

    getAuthedUser.mockResolvedValue(null);
    const closed = await POST(req());
    expect(closed.status).toBe(401);
  });
});
