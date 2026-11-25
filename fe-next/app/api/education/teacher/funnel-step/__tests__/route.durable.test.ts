/**
 * Onboarding is a funnel step with no profile column. The 30-day readout used
 * to hardcode NULL and point at PostHog, so a beacon that fired was invisible
 * to the reader — the writer-key ≠ reader-key class. The beacon must persist
 * the same (event_type, payload.step) pair the SQL report counts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const inserts: Array<{ table: string; row: Record<string, unknown> }> = [];

vi.mock('@/lib/posthog', () => ({
  getPostHogServer: () => ({ capture: () => {} }),
}));
vi.mock('@/lib/auth/getAuthedUser', () => ({
  getAuthedUser: vi.fn(async () => ({ id: 'teacher-1', email: 'teacher@school.edu' })),
}));
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      select: () => ({
        in: () => ({
          eq: async () => ({ data: [], error: null }),
        }),
      }),
      insert: async (row: Record<string, unknown>) => {
        inserts.push({ table, row });
        return { error: null };
      },
    }),
  }),
}));

import { TEACHER_FUNNEL_STEP_EVENT } from '@/lib/education/teacherFunnelStep';
import { POST } from '../route';

const req = (body: unknown) =>
  new Request('http://t/api/education/teacher/funnel-step', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as never;

describe('POST /api/education/teacher/funnel-step durable key', () => {
  beforeEach(() => {
    inserts.length = 0;
  });

  it('Given onboarding_completed, When the beacon lands, Then subscription_events stores the reader key', async () => {
    const res = await POST(req({ step: 'onboarding_completed' }));
    expect(res.status).toBe(200);
    expect(inserts).toEqual([
      {
        table: 'subscription_events',
        row: {
          user_id: 'teacher-1',
          event_type: TEACHER_FUNNEL_STEP_EVENT,
          payload: { step: 'onboarding_completed' },
        },
      },
    ]);
  });

  it('Given a server-owned step, When a client beacons it, Then nothing is written under the reader key', async () => {
    const res = await POST(req({ step: 'trial_started' }));
    expect(res.status).toBe(400);
    expect(inserts).toEqual([]);
  });
});
