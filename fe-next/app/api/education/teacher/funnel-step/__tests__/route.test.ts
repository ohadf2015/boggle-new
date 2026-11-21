/**
 * The beacon route is the server emit for onboarding_completed and
 * first_assignment_created. Other steps are rejected so a client cannot
 * invent an approval or a trial.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const captured: Array<{ distinctId: string; event: string; properties: Record<string, unknown> }> = [];

vi.mock('@/lib/posthog', () => ({
  getPostHogServer: () => ({
    capture: (arg: (typeof captured)[number]) => captured.push(arg),
  }),
}));
vi.mock('@/lib/auth/getAuthedUser', () => ({
  getAuthedUser: vi.fn(async () => ({ id: 'teacher-1', email: 'teacher@school.edu' })),
}));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn(() => null) }));

import { POST } from '../route';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';

const req = (body: unknown) =>
  new Request('http://t/api/education/teacher/funnel-step', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as never;

const named = (event: string) => captured.filter((c) => c.event === event);

describe('POST /api/education/teacher/funnel-step', () => {
  beforeEach(() => {
    captured.length = 0;
    vi.mocked(getAuthedUser).mockResolvedValue({ id: 'teacher-1', email: 'teacher@school.edu' } as never);
  });

  it.each(['onboarding_completed', 'first_assignment_created'] as const)(
    'Given %s from a signed-in teacher, Then teacher_funnel_step fires with its growth twin',
    async (step) => {
      const res = await POST(req({ step }));
      expect(res.status).toBe(200);
      expect(named('teacher_funnel_step')).toEqual([
        expect.objectContaining({
          distinctId: 'teacher-1',
          event: 'teacher_funnel_step',
          properties: expect.objectContaining({ step, is_test_account: false, $host: 'www.lexiclash.live' }),
        }),
      ]);
      expect(named('growth:teacher_funnel_step')).toHaveLength(1);
    },
  );

  it('rejects a client trying to invent trial_started', async () => {
    const res = await POST(req({ step: 'trial_started' }));
    expect(res.status).toBe(400);
    expect(captured).toHaveLength(0);
  });

  it('rejects a signed-out caller', async () => {
    vi.mocked(getAuthedUser).mockResolvedValue(null as never);
    const res = await POST(req({ step: 'onboarding_completed' }));
    expect(res.status).toBe(401);
    expect(captured).toHaveLength(0);
  });
});
