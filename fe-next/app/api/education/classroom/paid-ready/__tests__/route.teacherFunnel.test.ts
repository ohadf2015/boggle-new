/**
 * Paid day-0 creates the first class on a different route than /classroom/create.
 * The funnel step has to fire there too, or those teachers never enter the count.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const captured: Array<{ event: string; properties: Record<string, unknown> }> = [];

vi.mock('@/lib/posthog', () => ({
  getPostHogServer: () => ({ capture: (arg: (typeof captured)[number]) => captured.push(arg) }),
}));
vi.mock('@/lib/auth/getAuthedUser', () => ({
  getAuthedUser: vi.fn(async () => ({ id: 'teacher-1', email: 't@school.edu' })),
}));
vi.mock('@/lib/subscriptions', () => ({
  canCreateClass: vi.fn(async () => ({ allowed: true, currentCount: 0, limit: 1 })),
  checkTeacherSubscription: vi.fn(async () => ({ has_pro: true, status: 'trialing' })),
}));
vi.mock('@/lib/education/paidShareCodeNow', () => ({ sendPaidShareCodeNow: vi.fn(async () => undefined) }));

const admin = {
  from: (table: string) => {
    if (table === 'profiles') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { utm_medium: 'paid', user_role: 'teacher', display_name: 'T', language: 'en' },
              error: null,
            }),
          }),
          in: () => ({ eq: async () => ({ data: [], error: null }) }),
        }),
      };
    }
    return {
      select: () => ({
        eq: () => ({ order: () => ({ limit: async () => ({ data: [], error: null }) }) }),
      }),
      insert: () => ({
        select: () => ({
          single: async () => ({ data: { id: 'c-paid', name: 'Class', join_code: 'ABC', language: 'en' }, error: null }),
        }),
      }),
    };
  },
};

vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: () => admin }));

import { POST } from '../route';

describe('POST /api/education/classroom/paid-ready — teacher_funnel_step', () => {
  beforeEach(() => {
    captured.length = 0;
  });

  it('creating the first paid class fires classroom_created', async () => {
    const res = await POST(new Request('http://t/api/education/classroom/paid-ready', { method: 'POST', body: '{}' }) as never);
    expect(res.status).toBe(200);
    const step = captured.filter((c) => c.event === 'teacher_funnel_step');
    expect(step).toHaveLength(1);
    expect(step[0].properties).toMatchObject({
      step: 'classroom_created',
      step_index: 3,
      classroom_id: 'c-paid',
      is_test_account: false,
    });
    expect(captured.some((c) => c.event === 'growth:teacher_funnel_step')).toBe(true);
  });
});
