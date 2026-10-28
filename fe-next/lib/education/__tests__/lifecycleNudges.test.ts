import { describe, it, expect } from 'vitest';
import { planLifecycleNudges, type StageFacts, type StageTeacher } from '../lifecycleNudges';

const NOW = Date.parse('2026-10-25T09:00:00Z');
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();

const teacher = (over: Partial<StageTeacher> = {}): StageTeacher => ({
  userId: 't1', email: 'ada@school.edu', fullName: 'Ada', locale: 'en', ...over,
});

const facts = (over: Partial<StageFacts> = {}): StageFacts => ({
  classrooms: [],
  studentCounts: new Map(),
  realRounds: [],
  ledger: [],
  testUserIds: new Set(),
  ...over,
});

const stageOf = (t: StageTeacher, f: StageFacts) => planLifecycleNudges([t], f, NOW).due[0]?.stage ?? null;

describe('planLifecycleNudges', () => {
  it('Given a class made 2 days ago with no students, Then the share-the-code nudge is due', () => {
    expect(stageOf(teacher(), facts({ classrooms: [{ id: 'c1', teacherId: 't1', createdAt: daysAgo(2) }] }))).toBe('share_code');
  });

  it('Given a paid campaign teacher whose class was created today, Then the share-code nudge is due immediately', () => {
    expect(stageOf(teacher(), facts({
      classrooms: [{ id: 'c1', teacherId: 't1', createdAt: daysAgo(0.01) }],
      paidDay0UserIds: new Set(['t1']),
    }))).toBe('share_code');
  });

  it('Given a class made 6 hours ago, Then it is too early for any nudge', () => {
    expect(stageOf(teacher(), facts({ classrooms: [{ id: 'c1', teacherId: 't1', createdAt: daysAgo(0.25) }] }))).toBeNull();
  });

  it('Given students joined a 3-day-old class but no real live round ran, Then the start-live nudge is due', () => {
    expect(stageOf(teacher(), facts({
      classrooms: [{ id: 'c1', teacherId: 't1', createdAt: daysAgo(3) }],
      studentCounts: new Map([['c1', 12]]),
    }))).toBe('start_live');
  });

  it('Given one real round 4 days ago and none since, Then the second-game nudge is due', () => {
    expect(stageOf(teacher(), facts({
      classrooms: [{ id: 'c1', teacherId: 't1', createdAt: daysAgo(10) }],
      studentCounts: new Map([['c1', 12]]),
      realRounds: [{ teacherId: 't1', completedAt: daysAgo(4) }, { teacherId: 't1', completedAt: daysAgo(4) }],
    }))).toBe('second_game');
  });

  it('Given real rounds on two different UTC days, Then the north star is reached and nothing is sent', () => {
    expect(stageOf(teacher(), facts({
      classrooms: [{ id: 'c1', teacherId: 't1', createdAt: daysAgo(10) }],
      studentCounts: new Map([['c1', 12]]),
      realRounds: [{ teacherId: 't1', completedAt: daysAgo(5) }, { teacherId: 't1', completedAt: daysAgo(1) }],
    }))).toBeNull();
  });

  it('Given the first real round was 1 day or 12 days ago, Then the second-game nudge is outside its D+3..D+10 window', () => {
    const base = { classrooms: [{ id: 'c1', teacherId: 't1', createdAt: daysAgo(20) }], studentCounts: new Map([['c1', 5]]) };
    expect(stageOf(teacher(), facts({ ...base, realRounds: [{ teacherId: 't1', completedAt: daysAgo(1) }] }))).toBeNull();
    expect(stageOf(teacher(), facts({ ...base, realRounds: [{ teacherId: 't1', completedAt: daysAgo(12) }] }))).toBeNull();
  });

  it('Given the stage was already sent once, Then it is never sent again', () => {
    expect(stageOf(teacher(), facts({
      classrooms: [{ id: 'c1', teacherId: 't1', createdAt: daysAgo(9) }],
      ledger: [{ user_id: 't1', kind: 'nudge:share_code', period_key: 'once', sent_at: daysAgo(7) }],
    }))).toBeNull();
  });

  it('Given any nudge in the last 3 days (including an activation nudge), Then the teacher waits', () => {
    const plan = planLifecycleNudges([teacher()], facts({
      classrooms: [{ id: 'c1', teacherId: 't1', createdAt: daysAgo(3) }],
      studentCounts: new Map([['c1', 4]]),
      ledger: [{ user_id: 't1', kind: 'activation:d1', period_key: 'once', sent_at: daysAgo(2) }],
    }), NOW);
    expect(plan.due).toEqual([]);
    expect(plan.skipped.cooldown).toBe(1);
  });

  it('Given a weekly digest went out yesterday, Then it does not count against the nudge cap', () => {
    expect(stageOf(teacher(), facts({
      classrooms: [{ id: 'c1', teacherId: 't1', createdAt: daysAgo(3) }],
      ledger: [{ user_id: 't1', kind: 'weekly_digest', period_key: '2026-W43', sent_at: daysAgo(1) }],
    }))).toBe('share_code');
  });

  it('Given a test account or QA address, Then nothing is planned', () => {
    const f = facts({ classrooms: [{ id: 'c1', teacherId: 't1', createdAt: daysAgo(3) }, { id: 'c2', teacherId: 't2', createdAt: daysAgo(3) }], testUserIds: new Set(['t1']) });
    const plan = planLifecycleNudges([teacher(), teacher({ userId: 't2', email: 'bot@lexiclash.test' })], f, NOW);
    expect(plan.due).toEqual([]);
    expect(plan.skipped.testAccount).toBe(2);
  });

  it('Given a teacher with no class, Then the stage planner leaves them to the activation nudge', () => {
    expect(stageOf(teacher(), facts())).toBeNull();
  });
});
