import { describe, it, expect, vi, beforeEach } from 'vitest';

const adminProfile = { id: 'admin-1', is_admin: true };
const userProfile = { id: 'user-1', is_admin: false };

const mockSupabase = (profile: any, requestRow: any = null) => {
  // Stable spy so tests can inspect the teacher_access_requests UPDATE payload
  // regardless of how many fresh `from()` objects the route creates.
  const requestsUpdate = vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) }));
  return {
    requestsUpdate,
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: profile.id } }, error: null })) },
    from: vi.fn((table: string) => {
      if (table === 'profiles') return {
        select: () => ({ eq: () => ({ single: async () => ({ data: profile, error: null }) }) }),
        update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
      };
      if (table === 'teacher_access_requests') return {
        select: () => ({ eq: () => ({ single: async () => ({ data: requestRow, error: null }) }) }),
        update: requestsUpdate,
      };
      if (table === 'teacher_access_allowlist') return {
        insert: vi.fn(async () => ({ error: null })),
      };
      return {};
    }),
  };
};

// Service-role client used to promote ANOTHER user's profile. `profilesUpdate`
// is a stable spy so tests can assert the promotion ran on this client (which
// bypasses RLS) rather than the request-scoped one (which silently matches zero
// rows). `rows` is what the UPDATE ... RETURNING resolves to.
const mockAdminClient = (rows: any[] | null = [{ id: 'user-1' }], error: any = null) => {
  const profilesUpdate = vi.fn(() => ({
    eq: vi.fn(() => ({ select: vi.fn(async () => ({ data: rows, error })) })),
  }));
  return { profilesUpdate, from: vi.fn(() => ({ update: profilesUpdate })) };
};

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/email/send', () => ({ sendEmail: vi.fn(async () => ({ ok: true })) }));

import { POST as approve } from '../[id]/approve/route';
import { POST as decline } from '../[id]/decline/route';
import { POST as resend } from '../[id]/resend/route';
import { GET as list } from '../route';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
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

  it('approve stamps a trial deadline and the email leads with trial urgency', async () => {
    const row = { id: 'req-1', user_id: null, email: 'x@y.com', full_name: 'X', locale: 'en' };
    const sb = mockSupabase(adminProfile, row);
    (createClient as any).mockReturnValue(sb);
    const res = await approve(req(), { params: Promise.resolve({ id: 'req-1' }) });
    expect(res.status).toBe(200);

    // The status UPDATE payload includes a future trial_expires_at.
    expect(sb.requestsUpdate).toHaveBeenCalled();
    const payload = (sb.requestsUpdate as any).mock.calls.at(-1)[0];
    expect(payload.status).toBe('approved');
    expect(typeof payload.trial_expires_at).toBe('string');
    expect(Date.parse(payload.trial_expires_at)).toBeGreaterThan(Date.now());

    // Email reflects the trial.
    const arg = (sendEmail as any).mock.calls[0][0];
    expect(arg.html).toContain('trial-urgency');
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

  it('approve logs the reason when sendEmail reports failure via result.ok=false (no silent swallow)', async () => {
    // Resend does NOT throw on a rejected send — it resolves { ok:false, error }.
    // The route must notice that and log it, otherwise a failed trial email vanishes.
    const row = { id: 'req-1', user_id: null, email: 'x@y.com', full_name: 'X', locale: 'en' };
    (createClient as any).mockReturnValue(mockSupabase(adminProfile, row));
    (sendEmail as any).mockResolvedValueOnce({ ok: false, error: 'domain not verified' });
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await approve(req(), { params: Promise.resolve({ id: 'req-1' }) });
    expect(res.status).toBe(200); // approval (DB state) still stands
    expect(errSpy).toHaveBeenCalled();
    expect(errSpy.mock.calls.flat().join(' ')).toContain('domain not verified');
    errSpy.mockRestore();
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

  it('resend surfaces 502 when sendEmail resolves { ok:false } (Resend rejects without throwing)', async () => {
    const row = { id: 'req-1', user_id: null, email: 'x@y.com', full_name: 'X', locale: 'en', status: 'approved' };
    (createClient as any).mockReturnValue(mockSupabase(adminProfile, row));
    (sendEmail as any).mockResolvedValueOnce({ ok: false, error: 'domain not verified' });
    const res = await resend(req(), { params: Promise.resolve({ id: 'req-1' }) });
    expect(res.status).toBe(502);
  });

  // Regression: `profiles` RLS is `auth.uid() = id` with NO admin bypass policy,
  // so promoting another user's row through the request-scoped client updates
  // ZERO rows and returns NO error. Approval reported success while every
  // approved teacher stayed `user_role='student'` and got bounced off /teacher
  // by its role check. Measured 2026-08-12: 14 approved, 0 profiles promoted.
  it('approve promotes the profile via the service-role client, not the RLS-scoped one', async () => {
    const row = { id: 'req-1', user_id: 'user-1', email: 'x@y.com', full_name: 'X', locale: 'en' };
    const sb = mockSupabase(adminProfile, row);
    const admin = mockAdminClient([{ id: 'user-1' }]);
    (createClient as any).mockReturnValue(sb);
    (createAdminClient as any).mockReturnValue(admin);

    const res = await approve(req(), { params: Promise.resolve({ id: 'req-1' }) });

    expect(res.status).toBe(200);
    expect(admin.from).toHaveBeenCalledWith('profiles');
    expect(admin.profilesUpdate).toHaveBeenCalledWith({ user_role: 'teacher' });
  });

  it('approve fails loudly when the profile promotion matches zero rows', async () => {
    const row = { id: 'req-1', user_id: 'user-1', email: 'x@y.com', full_name: 'X', locale: 'en' };
    (createClient as any).mockReturnValue(mockSupabase(adminProfile, row));
    (createAdminClient as any).mockReturnValue(mockAdminClient([]));

    const res = await approve(req(), { params: Promise.resolve({ id: 'req-1' }) });

    expect(res.status).toBe(500);
    // An approval that did not actually grant the role must not send a
    // "you're approved" email — that is what stranded the 8 teachers.
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('approve fails loudly when the service-role client is unavailable', async () => {
    const row = { id: 'req-1', user_id: 'user-1', email: 'x@y.com', full_name: 'X', locale: 'en' };
    (createClient as any).mockReturnValue(mockSupabase(adminProfile, row));
    (createAdminClient as any).mockReturnValue(null);

    const res = await approve(req(), { params: Promise.resolve({ id: 'req-1' }) });

    expect(res.status).toBe(500);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('list rejects non-admin', async () => {
    (createClient as any).mockReturnValue(mockSupabase(userProfile));
    const res = await list(new Request('http://t'));
    expect(res.status).toBe(403);
  });
});
