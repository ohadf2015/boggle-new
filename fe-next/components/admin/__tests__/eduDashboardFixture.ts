export const delta = (current: number, prior: number) => ({
  current,
  prior,
  pct: prior === 0 ? null : Math.round(((current - prior) / prior) * 1000) / 10,
});

export const teacher = (id: string, name: string, health: string, over: Record<string, unknown> = {}) => ({
  id,
  name,
  email: `${id}@school.example`,
  lastActiveAt: '2026-10-07T10:00:00Z',
  canSignIn: true,
  classes: 1,
  students: 0,
  roundsLast7d: null,
  health,
  stage: 'no_students',
  trialExpiresAt: null,
  paying: false,
  joinCode: 'ABC123',
  lastOutreachAt: null,
  ...over,
});

const stuck = Array.from({ length: 10 }, (_, i) => teacher(`s${i}`, `Stuck ${i}`, 'at_risk'));

export const dashboardPayload = (over: Record<string, unknown> = {}) => ({
  windowDays: 7,
  roundsAvailable: true,
  outreachAvailable: true,
  kpis: {
    activeTeachers: { current: 12, prior: 0, pct: null },
    newTeachers: delta(2, 1),
    classesWithLiveGame: delta(1, 1),
    liveRounds: delta(4, 2),
    trialsStarted: delta(3, 0),
    trialsPaid: delta(0, 0),
  },
  sparklines: {
    activeTeachers: null,
    newTeachers: [0, 1, 1],
    classesWithLiveGame: [0, 1, 0],
    liveRounds: [1, 2, 1],
    trialsStarted: [1, 1, 1],
    trialsPaid: [0, 0, 0],
  },
  teachers: [
    teacher('d1', 'Dormant Dee', 'dormant', { lastActiveAt: '2026-08-01T00:00:00Z', stage: 'no_class', classes: 0 }),
    teacher('t1', 'Thriving Tim', 'thriving', { students: 4, stage: 'has_students' }),
    ...stuck,
  ],
  classes: [
    { id: 'c1', name: 'Period 3', teacherId: 't1', teacherName: 'Thriving Tim', students: 4, lastRoundAt: '2026-10-07T09:00:00Z', roundsInWindow: 4 },
    { id: 'c2', name: 'Empty room', teacherId: 's0', teacherName: 'Stuck 0', students: 0, lastRoundAt: null, roundsInWindow: 0 },
  ],
  dyingClasses: [],
  modeMix: [{ mode: 'classic', rounds: 4, players: 9 }],
  funnel: [
    { key: 'requested', count: 20, pctOfPrev: null, isBiggestDrop: false },
    { key: 'approved', count: 12, pctOfPrev: 60, isBiggestDrop: false },
    { key: 'signin', count: 12, pctOfPrev: 100, isBiggestDrop: false },
    { key: 'classroom', count: 11, pctOfPrev: 91.7, isBiggestDrop: false },
    { key: 'student', count: 1, pctOfPrev: 9.1, isBiggestDrop: true },
  ],
  verdict: { stepKey: 'student', fromKey: 'classroom', fromCount: 11, toCount: 1, lost: 10, pct: 9.1, cohortAvailable: true },
  drill: {
    kpi: {
      activeTeachers: { kind: 'teachers', ids: ['t1', 's0'] },
      newTeachers: { kind: 'teachers', ids: ['t1', 's1'] },
      classesWithLiveGame: { kind: 'classes', ids: ['c1'] },
      liveRounds: { kind: 'teachers', ids: ['t1'] },
      trialsStarted: { kind: 'teachers', ids: ['s2'] },
      trialsPaid: { kind: 'teachers', ids: [] },
    },
    funnel: {
      requested: [],
      approved: [],
      signin: ['d1'],
      classroom: stuck.map((s) => s.id),
      student: ['t1'],
    },
  },
  attention: {
    items: [
      { kind: 'locked_out', teacherId: 'd1', classId: null, className: null, dueAt: null },
      { kind: 'no_students', teacherId: 's0', classId: null, className: null, dueAt: null },
    ],
    total: 2,
  },
  ...over,
});
