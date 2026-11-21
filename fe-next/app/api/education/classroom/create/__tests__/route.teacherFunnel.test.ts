/**
 * teacher_funnel_step fires on the real classroom-create route, only for the
 * first class, and the growth twin rides with it.
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
  checkTeacherSubscription: vi.fn(async () => ({ has_pro: false, status: 'active' })),
}));

import { POST } from '../route';
import { createClient } from '@/utils/supabase/server';

const req = (body: unknown) =>
  new Request('http://t/api/education/classroom/create', { method: 'POST', body: JSON.stringify(body) }) as never;

function mockClient(count: number, insertError: { message: string } | null = null) {
  const insert = vi.fn(() => ({
    select: () => ({
      single: async () => ({
        data: insertError ? null : { id: 'c-1' },
        error: insertError,
      }),
    }),
  }));
  const select = vi.fn(() => ({ eq: vi.fn(async () => ({ count, error: null })) }));
  (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    from: vi.fn(() => ({ insert, select })),
  });
}

const named = (event: string) => captured.filter((c) => c.event === event);

describe('POST /api/education/classroom/create — teacher_funnel_step', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    captured.length = 0;
  });

  it('first class fires classroom_created and its growth twin', async () => {
    mockClient(0);
    const res = await POST(req({ name: 'Class A', language: 'en' }));
    expect(res.status).toBe(201);
    expect(named('teacher_funnel_step')).toHaveLength(1);
    expect(named('teacher_funnel_step')[0]).toMatchObject({
      distinctId: 'teacher-1',
      properties: {
        step: 'classroom_created',
        step_index: 3,
        locale: 'en',
        classroom_id: 'c-1',
        is_test_account: false,
        $host: 'www.lexiclash.live',
      },
    });
    expect(named('growth:teacher_funnel_step')).toHaveLength(1);
  });

  it('a second class does not fire the funnel step', async () => {
    mockClient(2);
    const res = await POST(req({ name: 'Class B', language: 'he' }));
    expect(res.status).toBe(201);
    expect(named('teacher_funnel_step')).toHaveLength(0);
  });

  it('a failed insert fires nothing', async () => {
    mockClient(0, { message: 'db down' });
    const res = await POST(req({ name: 'Class A', language: 'en' }));
    expect(res.status).toBe(500);
    expect(named('teacher_funnel_step')).toHaveLength(0);
  });
});
