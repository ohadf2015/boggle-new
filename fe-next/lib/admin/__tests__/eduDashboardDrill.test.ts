import { describe, it, expect } from 'vitest';
import { buildEduDashboard, type EduDashboardInput } from '../eduDashboard';

const NOW = Date.parse('2026-10-08T00:00:00Z');
const DAY = 86_400_000;
const ago = (days: number) => new Date(NOW - days * DAY).toISOString();

const input = (): EduDashboardInput => ({
  nowMs: NOW,
  windowDays: 7,
  teachers: [
    { id: 'recent', name: 'Recent', last_seen_at: ago(2) },
    { id: 'old', name: 'Old', last_seen_at: ago(20) },
  ],
  approvals: [
    { user_id: 'recent', reviewed_at: ago(3), trial_expires_at: ago(-11) },
    { user_id: 'old', reviewed_at: ago(30), trial_expires_at: ago(-1) },
  ],
  requested: 2,
  classrooms: [
    { id: 'c1', teacher_id: 'recent', name: 'A' },
    { id: 'c2', teacher_id: 'old', name: 'B' },
  ],
  memberships: [],
  outreach: null,
  rounds: [
    { classroom_id: 'c1', teacher_id: 'recent', game_mode: 'classic', player_count: 3, completed_at: ago(1) },
    { classroom_id: 'c2', teacher_id: 'old', game_mode: 'classic', player_count: 3, completed_at: ago(10) },
  ],
  subscriptions: [{ user_id: 'old', status: 'active', created_at: ago(2) }],
});

describe('KPI drill-down', () => {
  it('lists exactly the teachers behind each teacher KPI in the current window', () => {
    const { drill, kpis } = buildEduDashboard(input());
    expect(drill.kpi.activeTeachers).toEqual({ kind: 'teachers', ids: ['recent'] });
    expect(drill.kpi.newTeachers).toEqual({ kind: 'teachers', ids: ['recent'] });
    expect(drill.kpi.trialsStarted).toEqual({ kind: 'teachers', ids: ['recent'] });
    expect(drill.kpi.trialsPaid).toEqual({ kind: 'teachers', ids: ['old'] });
    expect(drill.kpi.liveRounds).toEqual({ kind: 'teachers', ids: ['recent'] });
    expect(drill.kpi.activeTeachers?.ids).toHaveLength(kpis.activeTeachers.current);
    expect(drill.kpi.trialsPaid?.ids).toHaveLength(kpis.trialsPaid.current);
  });

  it('drills class KPIs to classes, matching the KPI count', () => {
    const { drill, kpis } = buildEduDashboard(input());
    expect(drill.kpi.classesWithLiveGame).toEqual({ kind: 'classes', ids: ['c1'] });
    expect(drill.kpi.classesWithLiveGame?.ids).toHaveLength(kpis.classesWithLiveGame!.current);
  });

  it('has no round drill-down while rounds are unmeasured', () => {
    const { drill } = buildEduDashboard({ ...input(), rounds: null });
    expect(drill.kpi.liveRounds).toBeNull();
    expect(drill.kpi.classesWithLiveGame).toBeNull();
  });
});

describe('class rows', () => {
  it('carry the teacher name and when the class last played', () => {
    const { classes } = buildEduDashboard(input());
    expect(classes.find((c) => c.id === 'c1')).toMatchObject({ teacherName: 'Recent', lastRoundAt: ago(1), roundsInWindow: 1 });
  });
});
