/**
 * Manual approve door. Fires only when a user_id is promoted and the row was
 * not already approved. The no-account allowlist path fires on redemption.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const captured: Array<{ distinctId: string; event: string; properties: Record<string, unknown> }> = [];

vi.mock('@/lib/posthog', () => ({
  getPostHogServer: () => ({ capture: (arg: (typeof captured)[number]) => captured.push(arg) }),
}));
vi.mock('@/lib/email/send', () => ({ sendEmail: vi.fn(async () => ({ ok: true })) }));
vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }));

import { POST } from '../route';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

function userClient(row: Record<string, unknown>) {
  return {
    auth: { getUser: async () => ({ data: { user: { id: 'admin-1' } } }) },
    from: (table: string) => {
      if (table === 'profiles') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'admin-1', is_admin: true }, error: null }) }) }) };
      }
      return {
        select: () => ({ eq: () => ({ single: async () => ({ data: row, error: null }) }) }),
        update: () => ({ eq: async () => ({ error: null }) }),
      };
    },
  };
}

function adminClient(rows: { id: string }[]) {
  return {
    from: () => ({
      update: () => ({ eq: () => ({ select: async () => ({ data: rows, error: null }) }) }),
    }),
  };
}

const req = () => new Request('http://t', { method: 'POST', body: '{}' });
const ctx = { params: Promise.resolve({ id: 'req-1' }) };
const named = (event: string) => captured.filter((c) => c.event === event);

describe('POST admin teacher-access approve — teacher_approved', () => {
  beforeEach(() => {
    captured.length = 0;
  });

  it('fires after a pending request is promoted', async () => {
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      userClient({ id: 'req-1', user_id: 'teacher-9', email: 't@school.edu', full_name: 'T', locale: 'he', status: 'pending' }),
    );
    (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(adminClient([{ id: 'teacher-9' }]));
    const res = await POST(req(), ctx);
    expect(res.status).toBe(200);
    expect(named('teacher_funnel_step')[0]).toMatchObject({
      distinctId: 'teacher-9',
      properties: expect.objectContaining({ step: 'teacher_approved', step_index: 1, locale: 'he' }),
    });
    expect(named('growth:teacher_funnel_step')).toHaveLength(1);
  });

  it('does not fire again when the row was already approved', async () => {
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      userClient({ id: 'req-1', user_id: 'teacher-9', email: 't@school.edu', full_name: 'T', locale: 'en', status: 'approved' }),
    );
    (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(adminClient([{ id: 'teacher-9' }]));
    const res = await POST(req(), ctx);
    expect(res.status).toBe(200);
    expect(named('teacher_funnel_step')).toHaveLength(0);
  });
});
