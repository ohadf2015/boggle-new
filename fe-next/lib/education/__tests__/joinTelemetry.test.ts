import { describe, it, expect, vi, beforeEach } from 'vitest';

const captured: Array<{ distinctId: string; event: string; properties: Record<string, unknown> }> = [];
vi.mock('@/lib/posthog', () => ({
  getPostHogServer: () => ({ capture: (arg: (typeof captured)[number]) => captured.push(arg) }),
}));
vi.mock('@/utils/logger', () => ({ default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

import { captureStudentJoinEvents } from '../joinTelemetry';

interface World {
  teacherId: string;
  flagged: string[];
  /** student ids on the roster after this join, teacher's preview seat included when present */
  roster: string[];
}

function fakeAdmin(w: World) {
  return {
    from: (table: string) => {
      if (table === 'classrooms') {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { teacher_id: w.teacherId }, error: null }) }) }) };
      }
      if (table === 'profiles') {
        return { select: () => ({ in: (_c: string, ids: string[]) => ({ eq: async () => ({ data: ids.filter((i) => w.flagged.includes(i)).map((id) => ({ id })), error: null }) }) }) };
      }
      if (table === 'classroom_memberships') {
        return {
          select: () => ({
            eq: () => ({
              neq: async (_c: string, excluded: string) => ({ count: w.roster.filter((s) => s !== excluded).length, error: null }),
            }),
          }),
        };
      }
      throw new Error(`unexpected ${table}`);
    },
  };
}

const named = (n: string) => captured.filter((c) => c.event === n);

describe('captureStudentJoinEvents', () => {
  beforeEach(() => { captured.length = 0; });

  it('Given the first real student joins a class where only the teacher preview seat exists, Then student_joined and first_student_joined both fire', async () => {
    await captureStudentJoinEvents(fakeAdmin({ teacherId: 't1', flagged: [], roster: ['t1', 's1'] }) as never, { classroomId: 'c1', studentId: 's1' });
    expect(named('edu_student_joined')).toHaveLength(1);
    expect(named('edu_student_joined')[0].properties).toMatchObject({ classroom_id: 'c1', is_test_account: false });
    expect(named('edu_first_student_joined')).toHaveLength(1);
    expect(named('edu_first_student_joined')[0]).toMatchObject({ distinctId: 't1', properties: { classroom_id: 'c1', is_test_account: false } });
  });

  it('Given a second student joins, Then no first_student_joined fires', async () => {
    await captureStudentJoinEvents(fakeAdmin({ teacherId: 't1', flagged: [], roster: ['s0', 's1'] }) as never, { classroomId: 'c1', studentId: 's1' });
    expect(named('edu_first_student_joined')).toHaveLength(0);
  });

  it('Given an anonymous guest joins a QA teacher class, Then both events are tagged as test traffic', async () => {
    await captureStudentJoinEvents(fakeAdmin({ teacherId: 'qa-teacher', flagged: ['qa-teacher'], roster: ['g1'] }) as never, { classroomId: 'c1', studentId: 'g1' });
    expect(named('edu_student_joined')[0].properties.is_test_account).toBe(true);
    expect(named('edu_first_student_joined')[0].properties.is_test_account).toBe(true);
  });

  it('Given no service-role client, Then student_joined still fires with an explicit false', async () => {
    await captureStudentJoinEvents(null, { classroomId: 'c1', studentId: 's1' });
    expect(named('edu_student_joined')).toHaveLength(1);
    expect(named('edu_student_joined')[0].properties.is_test_account).toBe(false);
  });
});
