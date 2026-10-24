/**
 * Teacher activation funnel — first_classroom step on the existing classroom
 * create route. Counted BEFORE the insert. Fires only when that count was 0
 * AND the insert succeeded. Never emits the completed event (that is the
 * first-assignment path). The growth:* twin rides captureEduServerEvents
 * because the name is in GROWTH_TWIN_EVENTS.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const captured: Array<{ distinctId: string; event: string; properties: Record<string, unknown> }> = [];

vi.mock('@/lib/posthog', () => ({
  getPostHogServer: () => ({
    capture: (arg: { distinctId: string; event: string; properties: Record<string, unknown> }) => {
      captured.push(arg);
    },
  }),
}));
vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/auth/getAuthedUser', () => ({
  getAuthedUser: vi.fn(async () => ({ id: 'teacher-1', email: 'teacher@example.com' })),
}));
vi.mock('@/lib/subscriptions', () => ({
  canCreateClass: vi.fn(async () => ({ allowed: true, currentCount: 0, limit: 2 })),
  checkTeacherSubscription: vi.fn(async () => ({ has_pro: true, status: 'active' })),
}));

import { POST } from '../route';
import { createClient } from '@/utils/supabase/server';

const req = (body: unknown) =>
  new Request('http://t/api/education/classroom/create', { method: 'POST', body: JSON.stringify(body) }) as never;

function mockClient(count: number | 'error', insertError: { message: string } | null = null) {
  const insert = vi.fn(() => ({
    select: () => ({
      single: async () => ({
        data: insertError ? null : { id: 'c-1' },
        error: insertError,
      }),
    }),
  }));
  const countResult =
    count === 'error' ? { count: null, error: { message: 'rls' } } : { count, error: null };
  const select = vi.fn(() => ({ eq: vi.fn(async () => countResult) }));
  (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    from: vi.fn(() => ({ insert, select })),
  });
  return { insert, select };
}

const named = (event: string) => captured.filter((c) => c.event === event);

describe('POST /api/education/classroom/create — activation funnel first_classroom', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    captured.length = 0;
  });

  it('count 0 + insert success: fires step_index 2 and its growth twin, not completed', async () => {
    const { insert, select } = mockClient(0);

    const res = await POST(req({ name: 'Class A', language: 'en' }));

    expect(res.status).toBe(201);
    expect(select.mock.invocationCallOrder[0]).toBeLessThan(insert.mock.invocationCallOrder[0]);

    const step = named('teacher_activation_funnel_step');
    expect(step).toHaveLength(1);
    expect(step[0].distinctId).toBe('teacher-1');
    expect(step[0].properties).toMatchObject({
      step: 'first_classroom',
      step_index: 2,
      locale: 'en',
      plan: 'pro',
      is_test_account: false,
    });

    const twin = named('growth:teacher_activation_funnel_step');
    expect(twin).toHaveLength(1);
    expect(twin[0].distinctId).toBe('teacher-1');
    expect(twin[0].properties).toMatchObject({
      step: 'first_classroom',
      step_index: 2,
      locale: 'en',
      plan: 'pro',
    });

    expect(named('teacher_activation_funnel_completed')).toHaveLength(0);
    expect(named('growth:teacher_activation_funnel_completed')).toHaveLength(0);
    // Existing classroom event is not replaced.
    expect(named('edu_classroom_created')).toHaveLength(1);
  });

  it('a later classroom (count already > 0) does not fire the step', async () => {
    mockClient(3);

    const res = await POST(req({ name: 'Class B', language: 'he' }));

    expect(res.status).toBe(201);
    expect(named('teacher_activation_funnel_step')).toHaveLength(0);
    expect(named('growth:teacher_activation_funnel_step')).toHaveLength(0);
    expect(named('edu_classroom_created')).toHaveLength(1);
  });

  it('an unreadable count skips the step and still creates the classroom', async () => {
    const { insert } = mockClient('error');

    const res = await POST(req({ name: 'Class A', language: 'en' }));

    expect(res.status).toBe(201);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(named('teacher_activation_funnel_step')).toHaveLength(0);
    expect(named('edu_classroom_created')).toHaveLength(1);
  });

  it('a failed insert fires neither the step nor edu_classroom_created', async () => {
    mockClient(0, { message: 'boom' });

    const res = await POST(req({ name: 'Class A', language: 'en' }));

    expect(res.status).toBe(500);
    expect(named('teacher_activation_funnel_step')).toHaveLength(0);
    expect(named('edu_classroom_created')).toHaveLength(0);
  });
});
