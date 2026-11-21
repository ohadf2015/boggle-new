/**
 * Pre-signup approval becomes a teacher when the allowlist is redeemed.
 * That is the moment teacher_approved can be keyed to a user id.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const captured: Array<{ distinctId: string; event: string; properties: Record<string, unknown> }> = [];

vi.mock('@/lib/posthog', () => ({
  getPostHogServer: () => ({ capture: (arg: (typeof captured)[number]) => captured.push(arg) }),
}));

const admin = {
  from: vi.fn((table: string) => {
    if (table === 'teacher_access_allowlist') {
      return {
        select: () => ({
          eq: () => ({ is: () => ({ maybeSingle: async () => ({ data: { email: 't@school.edu' }, error: null }) }) }),
        }),
        update: () => ({ eq: () => ({ select: async () => ({ data: [{ email: 't@school.edu' }], error: null }) }) }),
      };
    }
    return {
      update: () => ({ eq: () => ({ select: async () => ({ data: [{ id: 'teacher-1' }], error: null }) }) }),
    };
  }),
};

vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: () => admin }));

import { consumeTeacherAllowlist } from '../allowlist';

describe('consumeTeacherAllowlist — teacher_approved', () => {
  beforeEach(() => {
    captured.length = 0;
  });

  it('fires teacher_funnel_step when the redemption lands', async () => {
    const result = await consumeTeacherAllowlist({ userId: 'teacher-1', email: 't@school.edu' });
    expect(result).toEqual({ consumed: true });
    expect(captured.filter((c) => c.event === 'teacher_funnel_step')).toEqual([
      expect.objectContaining({
        distinctId: 'teacher-1',
        properties: expect.objectContaining({ step: 'teacher_approved', step_index: 1, is_test_account: false }),
      }),
    ]);
    expect(captured.some((c) => c.event === 'growth:teacher_funnel_step')).toBe(true);
  });
});
