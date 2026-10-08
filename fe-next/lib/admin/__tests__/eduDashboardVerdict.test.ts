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
  it('reports the furthest funnel stage each approved teacher reached', () => {
    const out = buildEduDashboard(stuckFixture());
    const stage = (id: string) => out.teachers.find((t) => t.id === id)?.stage;
    expect(stage('t1')).toBe('student');
    expect(stage('t2')).toBe('classroom');
    expect(stage('t4')).toBe('approved');
  });

  it('gives no stage to a teacher who was never approved', () => {
    const fixture = stuckFixture();
    const out = buildEduDashboard({
      ...fixture,
      teachers: [...fixture.teachers, { id: 'x', name: 'Unapproved', last_seen_at: ago(40) }],
      classrooms: [...fixture.classrooms, { id: 'cx', teacher_id: 'x', name: 'X' }],
    });
    expect(out.teachers.find((t) => t.id === 'x')?.stage).toBeNull();
    expect(out.verdict!.rescue.map((r) => r.id)).not.toContain('x');
  });
});

describe('biggest-leak verdict', () => {
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

  it('keeps the verdict count, the rescue total and the funnel in agreement', () => {
    const out = buildEduDashboard(stuckFixture());
    const idx = out.funnel.findIndex((s) => s.key === out.verdict!.stepKey);
    const prev = out.funnel[idx - 1].count;
    const drop = out.funnel[idx].count;
    expect(out.verdict!.lost).toBe(prev - drop);
    expect(out.verdict!.rescueTotal).toBe(out.verdict!.lost);
  });

  it('lists the stuck teachers most recently active first, excluding teachers past the drop', () => {
    const out = buildEduDashboard(stuckFixture());
    expect(out.verdict!.rescue.map((r) => r.id)).toEqual(['t2', 't3']);
    expect(out.verdict!.rescue.map((r) => r.stage)).toEqual(['classroom', 'classroom']);
  });

  it('caps the rescue list at eight rows but keeps the full total', () => {
    const teachers = Array.from({ length: 10 }, (_, i) => ({
      id: `s${i}`,
      name: `T${i}`,
      last_seen_at: ago(i + 1),
    }));
    const out = buildEduDashboard(
      base({
        requested: 10,
        teachers,
        approvals: teachers.map((t) => approved(t.id)),
        classrooms: teachers.map((t) => ({ id: `c-${t.id}`, teacher_id: t.id, name: t.name })),
      }),
    );
    expect(out.verdict!.rescueTotal).toBe(10);
    expect(out.verdict!.rescue).toHaveLength(8);
  });

  it('returns no verdict when nothing reached the funnel', () => {
    expect(buildEduDashboard(base()).verdict).toBeNull();
  });

  it('marks the cohort unavailable when the leak is the application step itself', () => {
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
    expect(out.verdict!.rescue).toEqual([]);
    expect(out.verdict!.rescueTotal).toBe(0);
  });
});
