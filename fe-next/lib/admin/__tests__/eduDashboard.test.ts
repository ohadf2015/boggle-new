import { describe, it, expect } from 'vitest';
import { buildEduDashboard, type EduDashboardInput } from '../eduDashboard';

const NOW = Date.parse('2026-10-08T00:00:00Z');
const DAY = 86_400_000;
const ago = (days: number) => new Date(NOW - days * DAY).toISOString();

const base = (over: Partial<EduDashboardInput> = {}): EduDashboardInput => ({
  nowMs: NOW,
  windowDays: 7,
  teachers: [{ id: 't1', name: 'Ada', last_seen_at: ago(1) }],
  approvals: [{ user_id: 't1', reviewed_at: ago(3), trial_expires_at: ago(-20) }],
  classrooms: [{ id: 'c1', teacher_id: 't1', name: 'Math', created_at: ago(30) }],
  memberships: [{ classroom_id: 'c1', student_id: 's1' }],
  rounds: [],
  subscriptions: [],
  ...over,
});

describe('buildEduDashboard KPIs', () => {
  it('counts active teachers and computes the change against the prior window', () => {
    const out = buildEduDashboard(
      base({
        teachers: [
          { id: 't1', name: 'Ada', last_seen_at: ago(1) },
          { id: 't2', name: 'Bo', last_seen_at: ago(10) },
        ],
      }),
    );
    expect(out.kpis.activeTeachers).toEqual({ current: 1, prior: 1, pct: 0 });
  });

  it('reports rounds-based KPIs as null when classroom_rounds is not live', () => {
    const out = buildEduDashboard(base({ rounds: null }));
    expect(out.roundsAvailable).toBe(false);
    expect(out.kpis.liveRounds).toBeNull();
    expect(out.kpis.classesWithLiveGame).toBeNull();
  });

  it('counts live rounds and distinct classes with a round in the window', () => {
    const out = buildEduDashboard(
      base({
        rounds: [
          { classroom_id: 'c1', teacher_id: 't1', game_mode: 'classic', player_count: 4, completed_at: ago(2) },
          { classroom_id: 'c1', teacher_id: 't1', game_mode: 'wordcraft', player_count: 3, completed_at: ago(3) },
        ],
      }),
    );
    expect(out.kpis.liveRounds?.current).toBe(2);
    expect(out.kpis.classesWithLiveGame?.current).toBe(1);
  });

  it('counts a Pro trial as paid only when the subscription is active', () => {
    const out = buildEduDashboard(
      base({
        subscriptions: [{ user_id: 't1', status: 'active', created_at: ago(2) }],
      }),
    );
    expect(out.kpis.trialsStarted.current).toBe(1);
    expect(out.kpis.trialsPaid.current).toBe(1);
  });
});

describe('buildEduDashboard tables', () => {
  it('uses last activity alone for teacher health when rounds are unavailable', () => {
    const out = buildEduDashboard(base({ rounds: null }));
    expect(out.teachers[0].health).toBe('thriving');
  });

  it('flags a class with students and no live round in 14 days as dying', () => {
    const out = buildEduDashboard(
      base({
        rounds: [
          { classroom_id: 'c1', teacher_id: 't1', game_mode: 'classic', player_count: 1, completed_at: ago(30) },
        ],
      }),
    );
    expect(out.dyingClasses.map((c) => c.id)).toEqual(['c1']);
  });

  it('never lists a dying class when rounds are unavailable, since silence then means nothing', () => {
    const out = buildEduDashboard(base({ rounds: null }));
    expect(out.dyingClasses).toEqual([]);
  });

  it('builds mode mix from rounds', () => {
    const out = buildEduDashboard(
      base({
        rounds: [
          { classroom_id: 'c1', teacher_id: 't1', game_mode: 'classic', player_count: 4, completed_at: ago(2) },
          { classroom_id: 'c1', teacher_id: 't1', game_mode: 'classic', player_count: 2, completed_at: ago(4) },
          { classroom_id: 'c1', teacher_id: 't1', game_mode: 'wordcraft', player_count: 3, completed_at: ago(5) },
        ],
      }),
    );
    expect(out.modeMix).toEqual([
      { mode: 'classic', rounds: 2, players: 6 },
      { mode: 'wordcraft', rounds: 1, players: 3 },
    ]);
  });

  it('counts distinct students per class, not membership rows', () => {
    const out = buildEduDashboard(
      base({
        memberships: [
          { classroom_id: 'c1', student_id: 's1' },
          { classroom_id: 'c1', student_id: 's1' },
        ],
      }),
    );
    expect(out.classes[0].students).toBe(1);
  });
});
