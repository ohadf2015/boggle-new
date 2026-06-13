import { describe, it, expect, vi, beforeEach } from 'vitest';

const adminProfile = { id: 'admin-1', is_admin: true };
const userProfile = { id: 'user-1', is_admin: false };

const mockSupabase = (profile: any, requestRow: any = null) => ({
  auth: { getUser: vi.fn(async () => ({ data: { user: { id: profile.id } }, error: null })) },
  from: vi.fn((table: string) => {
    if (table === 'profiles') return {
      select: () => ({ eq: () => ({ single: async () => ({ data: profile, error: null }) }) }),
      update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
    };
    if (table === 'teacher_access_requests') return {
      select: () => ({ eq: () => ({ single: async () => ({ data: requestRow, error: null }) }) }),
      update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
    };
    if (table === 'teacher_access_allowlist') return {
      insert: vi.fn(async () => ({ error: null })),
    };
    return {};
  }),
});

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/email/send', () => ({ sendEmail: vi.fn(async () => ({ ok: true })) }));

import { POST as approve } from '../[id]/approve/route';
import { POST as decline } from '../[id]/decline/route';
import { POST as resend } from '../[id]/resend/route';
import { GET as list } from '../route';
import { createClient } from '@/utils/supabase/server';
import { sendEmail } from '@/lib/email/send';

const req = (body?: any) => new Request('http://t', { method: 'POST', body: body ? JSON.stringify(body) : undefined });

describe('admin teacher-access endpoints', () => {
  beforeEach(() => vi.clearAllMocks());

  it('approve rejects non-admin', async () => {
    (createClient as any).mockReturnValue(mockSupabase(userProfile));
    const res = await approve(req(), { params: Promise.resolve({ id: 'req-1' }) });
    expect(res.status).toBe(403);
  });

  it('approve flips status and allowlists email when no user_id', async () => {
    const row = { id: 'req-1', user_id: null, email: 'x@y.com', full_name: 'X', locale: 'en' };
    const sb = mockSupabase(adminProfile, row);
    (createClient as any).mockReturnValue(sb);
    const res = await approve(req(), { params: Promise.resolve({ id: 'req-1' }) });
    expect(res.status).toBe(200);
  });

  it('approve forwards the admin custom message into the confirmation email', async () => {
    const row = { id: 'req-1', user_id: null, email: 'x@y.com', full_name: 'X', locale: 'en' };
    (createClient as any).mockReturnValue(mockSupabase(adminProfile, row));
    const res = await approve(req({ message: 'See you in class!' }), { params: Promise.resolve({ id: 'req-1' }) });
    expect(res.status).toBe(200);
    expect(sendEmail).toHaveBeenCalled();
    const arg = (sendEmail as any).mock.calls[0][0];
    expect(arg.html).toContain('See you in class!');
  });

  it('approve still succeeds when the email send throws', async () => {
    const row = { id: 'req-1', user_id: null, email: 'x@y.com', full_name: 'X', locale: 'en' };
    (createClient as any).mockReturnValue(mockSupabase(adminProfile, row));
    (sendEmail as any).mockRejectedValueOnce(new Error('smtp down'));
    const res = await approve(req(), { params: Promise.resolve({ id: 'req-1' }) });
    expect(res.status).toBe(200);
  });

  it('decline writes admin_note and status', async () => {
    const row = { id: 'req-1', user_id: 'u-1', email: 'x@y.com', full_name: 'X', locale: 'en' };
    const sb = mockSupabase(adminProfile, row);
    (createClient as any).mockReturnValue(sb);
    const res = await decline(req({ reason: 'incomplete info' }), { params: Promise.resolve({ id: 'req-1' }) });
    expect(res.status).toBe(200);
  });

  it('resend rejects non-admin', async () => {
    (createClient as any).mockReturnValue(mockSupabase(userProfile));
    const res = await resend(req(), { params: Promise.resolve({ id: 'req-1' }) });
    expect(res.status).toBe(403);
  });

  it('resend re-sends the confirmation email for an approved request', async () => {
    const row = { id: 'req-1', user_id: null, email: 'x@y.com', full_name: 'X', locale: 'en', status: 'approved' };
    (createClient as any).mockReturnValue(mockSupabase(adminProfile, row));
    const res = await resend(req({ message: 'See you again!' }), { params: Promise.resolve({ id: 'req-1' }) });
    expect(res.status).toBe(200);
    expect(sendEmail).toHaveBeenCalled();
    const arg = (sendEmail as any).mock.calls[0][0];
    expect(arg.to).toBe('x@y.com');
    expect(arg.html).toContain('See you again!');
  });

  it('resend refuses when the request is not yet approved', async () => {
    const row = { id: 'req-1', user_id: null, email: 'x@y.com', full_name: 'X', locale: 'en', status: 'pending' };
    (createClient as any).mockReturnValue(mockSupabase(adminProfile, row));
    const res = await resend(req(), { params: Promise.resolve({ id: 'req-1' }) });
    expect(res.status).toBe(400);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('resend returns 404 when the request does not exist', async () => {
    (createClient as any).mockReturnValue(mockSupabase(adminProfile, null));
    const res = await resend(req(), { params: Promise.resolve({ id: 'nope' }) });
    expect(res.status).toBe(404);
  });

  it('resend surfaces an error when the email send fails (email is the whole point)', async () => {
    const row = { id: 'req-1', user_id: null, email: 'x@y.com', full_name: 'X', locale: 'en', status: 'approved' };
    (createClient as any).mockReturnValue(mockSupabase(adminProfile, row));
    (sendEmail as any).mockRejectedValueOnce(new Error('smtp down'));
    const res = await resend(req(), { params: Promise.resolve({ id: 'req-1' }) });
    expect(res.status).toBe(502);
  });

  it('list rejects non-admin', async () => {
    (createClient as any).mockReturnValue(mockSupabase(userProfile));
    const res = await list(new Request('http://t'));
    expect(res.status).toBe(403);
  });
});
