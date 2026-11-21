/**
 * Live approval door: access is granted on submit. teacher_funnel_step
 * teacher_approved fires only after the role promotion wins.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const captured: Array<{ distinctId: string; event: string; properties: Record<string, unknown> }> = [];

vi.mock('@/lib/posthog', () => ({
  getPostHogServer: () => ({
    capture: (arg: (typeof captured)[number]) => captured.push(arg),
  }),
}));
vi.mock('@/lib/email/send', () => ({ sendEmail: vi.fn(async () => ({ ok: true })) }));
vi.mock('@/lib/admin/adminNotifications', () => ({ notifyAdmins: vi.fn(async () => undefined) }));
vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }));

import { POST } from '../route';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

function thenable(result: unknown) {
  const self: Record<string, unknown> = {
    select: () => self,
    eq: () => self,
    gte: () => self,
    order: () => self,
    then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return self;
}

function userClient(profile: Record<string, unknown>) {
  return {
    auth: {
      getUser: async () => ({
        data: { user: { id: 'teacher-1', email: 't@school.edu', email_confirmed_at: '2026-01-01' } },
      }),
    },
    from: (table: string) => {
      if (table === 'profiles') {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: profile, error: null }) }) }) };
      }
      return {
        select: () => thenable({ data: [], error: null, count: 0 }),
        insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'req-1' }, error: null }) }) }),
      };
    },
  };
}

function adminClient(promoted: { id: string }[] | null) {
  return {
    from: (table: string) => ({
      update: () => ({
        eq: () => ({
          eq: () => ({ select: async () => ({ data: [{ id: 'req-1' }], error: null }) }),
          select: async () => ({
            data: table === 'profiles' ? promoted : [{ id: 'req-1' }],
            error: null,
          }),
        }),
      }),
    }),
  };
}

const body = { locale: 'en', use_case: 'I teach fifth grade words every week', role: 'teacher' };
const req = () => new Request('http://t/api/education/access-request', { method: 'POST', body: JSON.stringify(body) });
const named = (event: string) => captured.filter((c) => c.event === event);

describe('POST /api/education/access-request — teacher_approved', () => {
  beforeEach(() => {
    captured.length = 0;
    vi.clearAllMocks();
  });

  it('fires teacher_approved after the role is promoted', async () => {
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      userClient({ display_name: 'T', user_role: 'student', is_admin: false }),
    );
    (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(adminClient([{ id: 'teacher-1' }]));

    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(named('teacher_funnel_step')).toEqual([
      expect.objectContaining({
        distinctId: 'teacher-1',
        properties: expect.objectContaining({
          step: 'teacher_approved',
          step_index: 1,
          locale: 'en',
          is_test_account: false,
          $host: 'www.lexiclash.live',
        }),
      }),
    ]);
    expect(named('growth:teacher_funnel_step')).toHaveLength(1);
  });

  it('does not fire when the account is already a teacher', async () => {
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      userClient({ display_name: 'T', user_role: 'teacher', is_admin: false }),
    );
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(named('teacher_funnel_step')).toHaveLength(0);
  });

  it('does not fire when profile promotion matches no row', async () => {
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      userClient({ display_name: 'T', user_role: 'student', is_admin: false }),
    );
    (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(adminClient([]));
    const res = await POST(req());
    expect(res.status).not.toBe(200);
    expect(named('teacher_funnel_step')).toHaveLength(0);
  });
});
