import { describe, it, expect } from 'vitest';
import { buildTeacherFunnel, type TeacherFunnelInput } from '../teacherFunnel';

const NOW = Date.parse('2026-08-12T00:00:00Z');

const req = (over: Partial<TeacherFunnelInput['requests'][number]> = {}) => ({
  id: 'r1',
  user_id: 'u1',
  email: 'a@school.org',
  full_name: 'A Teacher',
  locale: 'en',
  country: 'US',
  status: 'approved',
  created_at: '2026-08-01T00:00:00Z',
  trial_expires_at: '2026-08-25T00:00:00Z',
  ...over,
});

const input = (over: Partial<TeacherFunnelInput> = {}): TeacherFunnelInput => ({
  requests: [req()],
  profiles: [{ id: 'u1', user_role: 'teacher' }],
  classrooms: [],
  memberships: [],
  assignments: [],
  nowMs: NOW,
  ...over,
});

describe('buildTeacherFunnel', () => {
  it('flags an approved teacher whose profile role was never granted as blocked', () => {
    // The exact failure that stranded 14 teachers: approval succeeded, the
    // profile promotion silently updated zero rows under RLS, and /teacher
    // bounced them home. This must be visible, not inferred.
    const out = buildTeacherFunnel(input({ profiles: [{ id: 'u1', user_role: 'student' }] }));

    expect(out.rows[0].roleGranted).toBe(false);
    expect(out.rows[0].stage).toBe('blocked');
    expect(out.summary.blocked).toBe(1);
  });

  it('counts an approved teacher with the role but no classroom as approved, not teaching', () => {
    const out = buildTeacherFunnel(input());

    expect(out.rows[0].stage).toBe('approved');
    expect(out.summary.roleGranted).toBe(1);
    expect(out.summary.createdClassroom).toBe(0);
  });

  it('advances to teaching once a classroom has a student, and counts activity', () => {
    const out = buildTeacherFunnel(input({
      classrooms: [{ id: 'c1', teacher_id: 'u1' }],
      memberships: [{ classroom_id: 'c1', student_id: 's1' }, { classroom_id: 'c1', student_id: 's2' }],
      assignments: [{ teacher_id: 'u1' }],
    }));

    expect(out.rows[0].stage).toBe('teaching');
    expect(out.rows[0].classrooms).toBe(1);
    expect(out.rows[0].students).toBe(2);
    expect(out.rows[0].assignments).toBe(1);
    expect(out.summary.gotStudents).toBe(1);
  });

  it('marks a classroom with no students as created_class', () => {
    const out = buildTeacherFunnel(input({ classrooms: [{ id: 'c1', teacher_id: 'u1' }] }));

    expect(out.rows[0].stage).toBe('created_class');
    expect(out.summary.createdClassroom).toBe(1);
    expect(out.summary.gotStudents).toBe(0);
  });

  it('separates approved-but-never-signed-up (allowlist) from blocked', () => {
    // No user_id means the approval went to the allowlist and the person has
    // not created an account yet — nothing is broken, they just never returned.
    const out = buildTeacherFunnel(input({ requests: [req({ user_id: null })], profiles: [] }));

    expect(out.rows[0].stage).toBe('awaiting_signup');
    expect(out.summary.blocked).toBe(0);
  });

  it('reports trial state so expiring teachers are visible before they lapse', () => {
    const out = buildTeacherFunnel(input({
      requests: [
        req({ id: 'r1', user_id: 'u1', trial_expires_at: '2026-08-25T00:00:00Z' }),
        req({ id: 'r2', user_id: 'u2', trial_expires_at: '2026-08-01T00:00:00Z' }),
        req({ id: 'r3', user_id: 'u3', trial_expires_at: null }),
      ],
      profiles: [
        { id: 'u1', user_role: 'teacher' },
        { id: 'u2', user_role: 'teacher' },
        { id: 'u3', user_role: 'teacher' },
      ],
    }));

    expect(out.rows.map((r) => r.trialState)).toEqual(['active', 'expired', 'none']);
    expect(out.summary.trialExpired).toBe(1);
  });

  it('surfaces last-seen so a teacher who never came back after approval is visible', () => {
    // A stage badge alone can't distinguish "approved yesterday" from "approved
    // in June and never opened the app again" — that difference decides whether
    // the next move is a nudge or a write-off.
    const out = buildTeacherFunnel(input({
      profiles: [{ id: 'u1', user_role: 'teacher', last_seen_at: '2026-08-10T00:00:00Z' }],
    }));

    expect(out.rows[0].lastSeenAt).toBe('2026-08-10T00:00:00Z');
  });

  it('leaves last-seen null when the applicant has no account yet', () => {
    const out = buildTeacherFunnel(input({ requests: [req({ user_id: null })], profiles: [] }));

    expect(out.rows[0].lastSeenAt).toBeNull();
  });

  it('excludes declined requests from the approved funnel but still lists them', () => {
    const out = buildTeacherFunnel(input({
      requests: [req({ id: 'r1' }), req({ id: 'r2', user_id: 'u2', status: 'declined' })],
      profiles: [{ id: 'u1', user_role: 'teacher' }],
    }));

    expect(out.summary.requested).toBe(2);
    expect(out.summary.approved).toBe(1);
    expect(out.rows.find((r) => r.requestId === 'r2')?.stage).toBe('declined');
  });
});

describe('machine rows', () => {
  it('drops integration-test rows from every number and says how many', () => {
    // rls.test.ts wrote 16 of these into production on 2026-08-20, which put "RLS Test"
    // at the top of the queue and read as 46 requests instead of 29.
    const out = buildTeacherFunnel(
      input({
        requests: [
          req(),
          req({ id: 'm1', user_id: null, email: 'rls-test-1787259577371@example.com' }),
          req({ id: 'm2', user_id: null, email: 'rls-update-test-1787259578106@example.com' }),
        ],
      }),
    );

    expect(out.summary.requested).toBe(1);
    expect(out.summary.excludedMachineRows).toBe(2);
    expect(out.rows.map((r) => r.requestId)).toEqual(['r1']);
  });

  it('keeps a real applicant whose address merely contains "test"', () => {
    // A fuzzy %test% filter would swallow contesta@, protest@, and any school with
    // "test" in its name.
    const out = buildTeacherFunnel(input({ requests: [req({ email: 'contesta@escuela.mx' })] }));

    expect(out.summary.excludedMachineRows).toBe(0);
    expect(out.summary.requested).toBe(1);
  });
});

describe('returnedNoClassroom', () => {
  const seen = (lastSeenAt: string | null) => ({ id: 'u1', user_role: 'teacher', last_seen_at: lastSeenAt });

  it('counts a teacher who came back after approval and still has no classroom', () => {
    // The leak `blocked` cannot see: the grant works, they did return, and nothing is
    // being taught — so the drop is discovery inside the app, not the approval.
    const out = buildTeacherFunnel(
      input({
        requests: [req({ reviewed_at: '2026-08-02T00:00:00Z' })],
        profiles: [seen('2026-08-09T00:00:00Z')],
      }),
    );

    expect(out.summary.returnedNoClassroom).toBe(1);
    expect(out.summary.returnedNoClassroomTrialActive).toBe(1);
  });

  it('does not count someone last seen before we approved them', () => {
    const out = buildTeacherFunnel(
      input({
        requests: [req({ reviewed_at: '2026-08-02T00:00:00Z' })],
        profiles: [seen('2026-08-01T12:00:00Z')],
      }),
    );

    expect(out.summary.returnedNoClassroom).toBe(0);
  });

  it('does not count a teacher who actually made a classroom', () => {
    const out = buildTeacherFunnel(
      input({
        requests: [req({ reviewed_at: '2026-08-02T00:00:00Z' })],
        profiles: [seen('2026-08-09T00:00:00Z')],
        classrooms: [{ id: 'c1', teacher_id: 'u1' }],
      }),
    );

    expect(out.summary.returnedNoClassroom).toBe(0);
  });
});

describe('reasons', () => {
  it('separates the form’s own example chips from a teacher’s own words', () => {
    // 10 of 29 real reasons on 2026-08-21 were use_case_ex1..3 tapped unchanged.
    // Counting them together would rank our marketing copy as the top demand.
    const out = buildTeacherFunnel(
      input({
        requests: [
          req({ id: 'r1', use_case: 'Weekly vocabulary battles with my class', role: 'teacher' }),
          req({ id: 'r2', use_case: 'weekly vocabulary battles with my class ', role: 'tutor', country: 'BR' }),
          req({ id: 'r3', use_case: 'site word builder', role: 'teacher', country: 'US' }),
        ],
      }),
    );

    const chip = out.reasons.find((r) => r.kind === 'chip');
    expect(chip?.count).toBe(2);
    expect(chip?.roles).toEqual(expect.arrayContaining(['teacher', 'tutor']));

    const free = out.reasons.filter((r) => r.kind === 'free');
    expect(free).toHaveLength(1);
    expect(free[0]).toMatchObject({ text: 'site word builder', count: 1, countries: ['US'] });
  });

  it('ignores a request with no stated reason', () => {
    const out = buildTeacherFunnel(input({ requests: [req({ use_case: '   ' })] }));

    expect(out.reasons).toEqual([]);
    expect(out.rows[0].useCaseKind).toBe('empty');
  });
});
