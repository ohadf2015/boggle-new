import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

vi.mock('@/lib/education/ownedClassroomRoute', () => ({ authorizeClassroomOwner: vi.fn() }));
vi.mock('@/lib/subscriptions', () => ({ checkTeacherSubscription: vi.fn() }));
vi.mock('@/lib/education/accessTrialServer', () => ({
  teacherHasProAccess: vi.fn(async (_u: string, s: { has_pro: boolean }) => s.has_pro),
}));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/backend/services/pushNotificationService', () => ({ sendToUsers: vi.fn() }));
vi.mock('@/lib/apiRateLimit', () => ({
  checkApiRateLimit: vi.fn().mockReturnValue({ success: true }),
}));
vi.mock('@/utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { POST } from '../route';
import { authorizeClassroomOwner } from '@/lib/education/ownedClassroomRoute';
import { checkTeacherSubscription } from '@/lib/subscriptions';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendToUsers } from '@/backend/services/pushNotificationService';

const CLASS = '11111111-1111-4111-8111-111111111111';
const ASSIGNMENT = '22222222-2222-4222-8222-222222222222';
const STUDENT = '33333333-3333-4333-8333-333333333333';
const LESSON = '44444444-4444-4444-8444-444444444444';

/** Chainable PostgREST double with the two terminal shapes the route uses. */
function tableDouble({ rows = [] as unknown[], single = null as unknown } = {}) {
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'not', 'gte', 'in', 'order']) builder[m] = () => builder;
  builder.limit = () => Promise.resolve({ data: rows, error: null });
  builder.maybeSingle = () => Promise.resolve({ data: single, error: null });
  builder.then = (resolve: (v: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve);
  return builder;
}

function sbDouble(map: Record<string, ReturnType<typeof tableDouble>>) {
  return {
    from: vi.fn((table: string) => {
      if (!(table in map)) throw new Error(`unexpected table ${table}`);
      return map[table];
    }),
  };
}

const call = (body: unknown = { assignmentId: ASSIGNMENT, studentId: STUDENT }) =>
  POST(
    new Request(`http://t/api/education/classroom/${CLASS}/nudge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: CLASS }) },
  );

let sb: ReturnType<typeof sbDouble>;
let admin: ReturnType<typeof sbDouble>;

beforeEach(() => {
  vi.clearAllMocks();
  sb = sbDouble({
    lesson_assignments: tableDouble({ single: { id: ASSIGNMENT, title: 'HW 1', lesson_id: LESSON } }),
    classroom_memberships: tableDouble({ single: { student_id: STUDENT } }),
    student_lesson_progress: tableDouble({ rows: [] }),
  });
  admin = sbDouble({
    user_notifications: tableDouble({ rows: [] }),
    profiles: tableDouble({ single: { language: 'he' } }),
  });
  vi.mocked(authorizeClassroomOwner).mockResolvedValue({
    ok: true,
    sb,
    userId: 't1',
    classroom: { id: CLASS },
  } as never);
  vi.mocked(checkTeacherSubscription).mockResolvedValue({ has_pro: true } as never);
  vi.mocked(createAdminClient).mockReturnValue(admin as never);
  vi.mocked(sendToUsers).mockResolvedValue({ success: true, sent: 1, failed: 0, errors: [] } as never);
});

describe('POST /api/education/classroom/[id]/nudge', () => {
  it('passes the ownership refusal through and notifies nobody', async () => {
    vi.mocked(authorizeClassroomOwner).mockResolvedValue({
      ok: false,
      response: NextResponse.json({}, { status: 403 }),
    });
    expect((await call()).status).toBe(403);
    expect(sendToUsers).not.toHaveBeenCalled();
  });

  it('402s a free teacher and notifies nobody', async () => {
    vi.mocked(checkTeacherSubscription).mockResolvedValue({ has_pro: false } as never);
    expect((await call()).status).toBe(402);
    expect(sendToUsers).not.toHaveBeenCalled();
  });

  it('400s an invalid body', async () => {
    expect((await call({ assignmentId: 'nope' })).status).toBe(400);
    expect(sendToUsers).not.toHaveBeenCalled();
  });

  it('404s when the assignment is not in this classroom', async () => {
    sb = sbDouble({
      lesson_assignments: tableDouble({ single: null }),
      classroom_memberships: tableDouble({ single: { student_id: STUDENT } }),
      student_lesson_progress: tableDouble({ rows: [] }),
    });
    vi.mocked(authorizeClassroomOwner).mockResolvedValue({ ok: true, sb, userId: 't1', classroom: { id: CLASS } } as never);
    expect((await call()).status).toBe(404);
    expect(sendToUsers).not.toHaveBeenCalled();
  });

  it('404s when the student is not a member', async () => {
    sb = sbDouble({
      lesson_assignments: tableDouble({ single: { id: ASSIGNMENT, title: 'HW 1', lesson_id: LESSON } }),
      classroom_memberships: tableDouble({ single: null }),
      student_lesson_progress: tableDouble({ rows: [] }),
    });
    vi.mocked(authorizeClassroomOwner).mockResolvedValue({ ok: true, sb, userId: 't1', classroom: { id: CLASS } } as never);
    expect((await call()).status).toBe(404);
    expect(sendToUsers).not.toHaveBeenCalled();
  });

  it('reports already_completed and sends nothing when the student finished', async () => {
    sb = sbDouble({
      lesson_assignments: tableDouble({ single: { id: ASSIGNMENT, title: 'HW 1', lesson_id: LESSON } }),
      classroom_memberships: tableDouble({ single: { student_id: STUDENT } }),
      student_lesson_progress: tableDouble({ rows: [{ id: 'p1' }] }),
    });
    vi.mocked(authorizeClassroomOwner).mockResolvedValue({ ok: true, sb, userId: 't1', classroom: { id: CLASS } } as never);
    const res = await call();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, result: 'already_completed' });
    expect(sendToUsers).not.toHaveBeenCalled();
  });

  it('reports already_nudged inside the 24h window and sends nothing', async () => {
    admin = sbDouble({
      user_notifications: tableDouble({ rows: [{ id: 'n1' }] }),
      profiles: tableDouble({ single: { language: 'he' } }),
    });
    vi.mocked(createAdminClient).mockReturnValue(admin as never);
    const res = await call();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, result: 'already_nudged' });
    expect(sendToUsers).not.toHaveBeenCalled();
  });

  it('nudges the student in-app with a localized payload and a lesson deep link', async () => {
    const res = await call();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, result: 'sent' });
    expect(sendToUsers).toHaveBeenCalledTimes(1);
    const [userIds, payload] = vi.mocked(sendToUsers).mock.calls[0];
    expect(userIds).toEqual([STUDENT]);
    expect(payload).toMatchObject({
      titleKey: 'assignmentNudge.title',
      bodyKey: 'assignmentNudge.body',
      params: { assignment: 'HW 1' },
      notificationType: 'social',
      actionUrl: `/he/student/lessons/${LESSON}`,
      relatedEntityType: 'assignment_nudge',
      relatedEntityId: ASSIGNMENT,
      senderId: 't1',
    });
  });

  it('500s when the notification write fails', async () => {
    vi.mocked(sendToUsers).mockResolvedValue({ success: false, sent: 0, failed: 1, errors: ['db'] } as never);
    expect((await call()).status).toBe(500);
  });
});
