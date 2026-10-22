import { describe, it, expect } from 'vitest';
import { buildEduDashboard, type EduDashboardInput } from '../eduDashboard';

const NOW = Date.parse('2026-10-08T00:00:00Z');
const DAY = 86_400_000;
const ago = (days: number) => new Date(NOW - days * DAY).toISOString();

const base = (over: Partial<EduDashboardInput> = {}): EduDashboardInput => ({
  nowMs: NOW,
  windowDays: 7,
  teachers: [],
  approvals: [],
  requested: 0,
  classrooms: [],
  memberships: [],
  rounds: null,
  subscriptions: [],
  ...over,
});

const approved = (id: string) => ({ user_id: id, reviewed_at: ago(3), trial_expires_at: null });

// t1 reached a student, t2/t3 made a class with no students, t4 approved but no class.
const stuckFixture = (): EduDashboardInput =>
  base({
    requested: 5,
    teachers: [
      { id: 't1', name: 'Ada', last_seen_at: ago(1) },
      { id: 't2', name: 'Bo', last_seen_at: ago(1) },
      { id: 't3', name: 'Cy', last_seen_at: ago(3) },
      { id: 't4', name: 'Di', last_seen_at: ago(2) },
    ],
    approvals: [approved('t1'), approved('t2'), approved('t3'), approved('t4')],
    classrooms: [
      { id: 'c1', teacher_id: 't1', name: 'A' },
      { id: 'c2', teacher_id: 't2', name: 'B' },
      { id: 'c3', teacher_id: 't3', name: 'C' },
    ],
    memberships: [{ classroom_id: 'c1', student_id: 's1' }],
  });

describe('funnel stage per approved teacher', () => {
  it('reports where each approved teacher stopped', () => {
    const out = buildEduDashboard(stuckFixture());
    const stage = (id: string) => out.teachers.find((t) => t.id === id)?.stage;
    expect(stage('t1')).toBe('has_students');
    expect(stage('t2')).toBe('no_students');
    expect(stage('t4')).toBe('no_class');
  });

  it('gives no stage to a teacher who was never approved', () => {
    const fixture = stuckFixture();
    const out = buildEduDashboard({
      ...fixture,
      teachers: [...fixture.teachers, { id: 'x', name: 'Unapproved', last_seen_at: ago(40) }],
      classrooms: [...fixture.classrooms, { id: 'cx', teacher_id: 'x', name: 'X' }],
    });
    expect(out.teachers.find((t) => t.id === 'x')?.stage).toBeNull();
    expect(out.drill.funnel.classroom).not.toContain('x');
  });

  it('lists an approved person with no teacher role as locked out, so they show up at all', () => {
    const fixture = stuckFixture();
    const out = buildEduDashboard({
      ...fixture,
      approvals: [...fixture.approvals, { ...approved('lock'), email: 'lock@school.org' }],
    });
    const row = out.teachers.find((t) => t.id === 'lock');
    expect(row).toMatchObject({ stage: 'locked_out', canSignIn: false, email: 'lock@school.org' });
    expect(out.teachers.find((t) => t.id === 't1')?.canSignIn).toBe(true);
  });
});

describe('funnel', () => {
  it('has a can-sign-in step between approval and the first class', () => {
    const fixture = stuckFixture();
    const out = buildEduDashboard({ ...fixture, approvals: [...fixture.approvals, approved('lock')] });
    expect(out.funnel.map((s) => [s.key, s.count])).toEqual([
      ['requested', 5],
      ['approved', 5],
      ['signin', 4],
      ['classroom', 3],
      ['student', 1],
    ]);
  });
});

describe('biggest drop-off verdict', () => {
  it('names the drop step and how many teachers it lost, from the funnel', () => {
    const out = buildEduDashboard(stuckFixture());
    expect(out.verdict).toMatchObject({
      stepKey: 'student',
      fromKey: 'classroom',
      fromCount: 3,
      toCount: 1,
      lost: 2,
      pct: 33.3,
      cohortAvailable: true,
    });
  });

  it('keeps the verdict count and the drill-down cohort in agreement', () => {
    const out = buildEduDashboard(stuckFixture());
    expect(out.drill.funnel[out.verdict!.fromKey as 'classroom']).toHaveLength(out.verdict!.lost);
  });

  it('returns no verdict when nothing reached the funnel', () => {
    expect(buildEduDashboard(base()).verdict).toBeNull();
  });

  it('marks the cohort unavailable when the drop is at the application step itself', () => {
    const out = buildEduDashboard(
      base({
        requested: 10,
        teachers: [{ id: 't1', name: 'Ada', last_seen_at: ago(1) }],
        approvals: [approved('t1'), approved('t2')],
        classrooms: [
          { id: 'c1', teacher_id: 't1', name: 'A' },
          { id: 'c2', teacher_id: 't2', name: 'B' },
        ],
        memberships: [{ classroom_id: 'c1', student_id: 's1' }, { classroom_id: 'c2', student_id: 's2' }],
      }),
    );
    expect(out.verdict).toMatchObject({ stepKey: 'approved', lost: 8, cohortAvailable: false });
  });
});
