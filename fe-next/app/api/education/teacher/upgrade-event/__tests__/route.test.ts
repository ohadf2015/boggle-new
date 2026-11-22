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
  new Request('http://localhost/api/education/teacher/upgrade-event', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as never;

const named = (event: string) => captured.filter((c) => c.event === event);

describe('POST /api/education/teacher/upgrade-event', () => {
  beforeEach(() => {
    captured.length = 0;
    vi.mocked(getAuthedUser).mockResolvedValue({ id: 'teacher-1', email: 'teacher@school.edu' } as never);
  });

  it('Given teacher_pro_upgrade_shown from signed-in teacher, emits event with $host and growth twin', async () => {
    const res = await POST(
      req({
        event: 'teacher_pro_upgrade_shown',
        placement: 'student_cap_dashboard',
        reason: 'free_tier_limit',
        count: 50,
        limit: 50,
        locale: 'en',
      }),
    );
    expect(res.status).toBe(200);
    expect(named('teacher_pro_upgrade_shown')).toEqual([
      expect.objectContaining({
        distinctId: 'teacher-1',
        event: 'teacher_pro_upgrade_shown',
        properties: expect.objectContaining({
          placement: 'student_cap_dashboard',
          reason: 'free_tier_limit',
          count: 50,
          limit: 50,
          locale: 'en',
          $host: 'www.lexiclash.live',
        }),
      }),
    ]);
    expect(named('growth:teacher_pro_upgrade_shown')).toHaveLength(1);
  });

  it('Given teacher_pro_upgrade_clicked, emits event with $host and growth twin', async () => {
    const res = await POST(
      req({
        event: 'teacher_pro_upgrade_clicked',
        placement: 'weekly_digest',
        reason: 'practice',
        locale: 'es',
      }),
    );
    expect(res.status).toBe(200);
    expect(named('teacher_pro_upgrade_clicked')).toEqual([
      expect.objectContaining({
        distinctId: 'teacher-1',
        event: 'teacher_pro_upgrade_clicked',
        properties: expect.objectContaining({
          placement: 'weekly_digest',
          reason: 'practice',
          locale: 'es',
          $host: 'www.lexiclash.live',
        }),
      }),
    ]);
    expect(named('growth:teacher_pro_upgrade_clicked')).toHaveLength(1);
  });

  it('Handles signed-out teacher gracefully using anonymous-teacher', async () => {
    vi.mocked(getAuthedUser).mockResolvedValue(null as never);
    const res = await POST(
      req({
        event: 'teacher_pro_upgrade_shown',
        placement: 'class_cap_meter',
        reason: 'free_tier_limit',
      }),
    );
    expect(res.status).toBe(200);
    expect(named('teacher_pro_upgrade_shown')).toEqual([
      expect.objectContaining({
        distinctId: 'anonymous-teacher',
        event: 'teacher_pro_upgrade_shown',
      }),
    ]);
  });

  it('Rejects invalid event with 400', async () => {
    const res = await POST(req({ event: 'unauthorized_event' }));
    expect(res.status).toBe(400);
  });
});
