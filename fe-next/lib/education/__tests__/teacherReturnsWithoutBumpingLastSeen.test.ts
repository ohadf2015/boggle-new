/**
 * Measurement-gap regression (audit 2026-10-31).
 *
 * A teacher who returns without bumping last_seen_at still has to count.
 * activeTeachers and the funnel read greatest(last_seen_at, last round
 * started_at, last_sign_in_at), not the stuck signup column alone.
 */
import { describe, it, expect } from 'vitest';
import { buildEduDashboard, type EduDashboardInput } from '@/lib/admin/eduDashboard';
import { buildTeacherFunnel, type TeacherFunnelInput } from '../teacherFunnel';

const NOW = Date.parse('2026-10-08T00:00:00Z');
const DAY = 86_400_000;
const ago = (days: number) => new Date(NOW - days * DAY).toISOString();

const dashboard = (over: Partial<EduDashboardInput> = {}): EduDashboardInput => ({
  nowMs: NOW,
  windowDays: 7,
  teachers: [{ id: 't1', name: 'Ada', last_seen_at: ago(1) }],
  approvals: [{ user_id: 't1', reviewed_at: ago(3), trial_expires_at: ago(-20) }],
  requested: 1,
  classrooms: [{ id: 'c1', teacher_id: 't1', name: 'Math' }],
  memberships: [{ classroom_id: 'c1', student_id: 's1' }],
  rounds: [],
  subscriptions: [],
  ...over,
});

const FUNNEL_NOW = Date.parse('2026-08-12T00:00:00Z');
const req = (over: Partial<TeacherFunnelInput['requests'][number]> = {}) => ({
  id: 'r1',
  user_id: 'cr',
  email: 'cr@school.org',
  full_name: 'CR Teacher',
  locale: 'es',
  country: 'CR',
  status: 'approved',
  created_at: '2026-08-01T00:00:00Z',
  reviewed_at: '2026-08-02T00:00:00Z',
  trial_expires_at: '2026-08-25T00:00:00Z',
  ...over,
});

describe('teacher who returns without bumping last_seen_at', () => {
  it('counts as an active teacher when rounds are recent and last_seen_at is stuck at signup', () => {
    const signup = ago(40);
    const roundStart = ago(1);
    const out = buildEduDashboard(
      dashboard({
        teachers: [
          {
            id: 'stuck',
            name: 'Never back',
            last_seen_at: signup,
            last_sign_in_at: signup,
            last_round_started_at: signup,
          },
          {
            id: 'cr',
            name: 'CR',
            last_seen_at: signup,
            last_sign_in_at: signup,
            last_round_started_at: roundStart,
          },
        ],
      }),
    );

    expect(out.kpis.activeTeachers).toEqual({ current: 1, prior: 0, pct: null });
    expect(out.drill.kpi.activeTeachers).toEqual({ kind: 'teachers', ids: ['cr'] });
    expect(out.teachers.find((t) => t.id === 'cr')?.lastActiveAt).toBe(roundStart);
  });

  it('counts a sign-in-only returner as active when last_seen_at was never bumped', () => {
    const out = buildEduDashboard(
      dashboard({
        teachers: [
          {
            id: 'signin',
            name: 'Signed in',
            last_seen_at: ago(40),
            last_sign_in_at: ago(1),
            last_round_started_at: null,
          },
        ],
      }),
    );

    expect(out.kpis.activeTeachers.current).toBe(1);
    expect(out.drill.kpi.activeTeachers).toEqual({ kind: 'teachers', ids: ['signin'] });
    expect(out.teachers.find((t) => t.id === 'signin')?.lastActiveAt).toBe(ago(1));
  });

  it('counts as returned in the teacher funnel when the only fresh clock is a classroom round', () => {
    const signup = '2026-08-01T00:00:00Z';
    const roundStart = '2026-08-10T12:00:00Z';
    const out = buildTeacherFunnel({
      requests: [req()],
      profiles: [{ id: 'cr', user_role: 'teacher', last_seen_at: signup, last_sign_in_at: signup }],
      classrooms: [],
      memberships: [],
      assignments: [],
      roundStarts: [{ teacher_id: 'cr', started_at: roundStart }],
      nowMs: FUNNEL_NOW,
    });

    expect(out.rows[0].lastSeenAt).toBe(roundStart);
    expect(out.rows[0].lastSeenAt).not.toBe(signup);
    expect(out.summary.returnedNoClassroom).toBe(1);
  });

  it('does not leave a teaching returner stuck at signup last_seen when they have rounds', () => {
    const signup = '2026-08-01T00:00:00Z';
    const roundStart = '2026-08-10T12:00:00Z';
    const out = buildTeacherFunnel({
      requests: [req()],
      profiles: [{ id: 'cr', user_role: 'teacher', last_seen_at: signup, last_sign_in_at: '2026-08-03T00:00:00Z' }],
      classrooms: [{ id: 'c1', teacher_id: 'cr' }],
      memberships: [{ classroom_id: 'c1', student_id: 's1' }],
      assignments: [],
      roundStarts: [{ teacher_id: 'cr', started_at: roundStart }],
      nowMs: FUNNEL_NOW,
    });

    expect(out.rows[0].stage).toBe('teaching');
    expect(out.rows[0].lastSeenAt).toBe(roundStart);
    expect(out.summary.returnedNoClassroom).toBe(0);
  });
});
