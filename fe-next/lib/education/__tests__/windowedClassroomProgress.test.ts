import { describe, it, expect } from 'vitest';
import {
  deriveWindowedClassroomProgress,
  windowStartIso,
  type WindowRosterStudent,
  type WindowSession,
} from '../windowedClassroomProgress';

const NOW = Date.parse('2026-09-23T12:00:00.000Z');

const roster: WindowRosterStudent[] = [
  { studentId: 's1', name: 'Ada' },
  { studentId: 's2', name: 'Blaise' },
  { studentId: 's3', name: 'Claude' },
];

function session(overrides: Partial<WindowSession> & Pick<WindowSession, 'studentId'>): WindowSession {
  return {
    completedAt: new Date(NOW - 2 * 86400000).toISOString(),
    foundCount: 8,
    missedCount: 2,
    ...overrides,
  };
}

describe('windowStartIso', () => {
  it('is 7 days before now for the week window', () => {
    expect(windowStartIso(7, NOW)).toBe('2026-09-16T12:00:00.000Z');
  });

  it('is 30 days before now for the month window', () => {
    expect(windowStartIso(30, NOW)).toBe('2026-08-24T12:00:00.000Z');
  });
});

describe('deriveWindowedClassroomProgress', () => {
  it('computes 7d completion and accuracy per student', () => {
    const report = deriveWindowedClassroomProgress({
      windowDays: 7,
      roster,
      now: NOW,
      sessions: [
        session({ studentId: 's1', foundCount: 9, missedCount: 1 }),
        session({ studentId: 's1', foundCount: 7, missedCount: 3, completedAt: new Date(NOW - 86400000).toISOString() }),
        session({ studentId: 's2', foundCount: 2, missedCount: 8 }),
      ],
    });

    expect(report.rosterCount).toBe(3);
    expect(report.activeCount).toBe(2);
    expect(report.completionPct).toBe(67);
    expect(report.students.find((s) => s.studentId === 's1')).toMatchObject({
      sessionsCompleted: 2,
      accuracyPct: 80,
      completed: true,
    });
    expect(report.students.find((s) => s.studentId === 's2')?.accuracyPct).toBe(20);
    expect(report.students.find((s) => s.studentId === 's3')).toMatchObject({
      sessionsCompleted: 0,
      accuracyPct: null,
      completed: false,
    });
    // Mean of rated students: (80 + 20) / 2
    expect(report.accuracyPct).toBe(50);
  });

  it('drops sessions older than the window', () => {
    const report = deriveWindowedClassroomProgress({
      windowDays: 7,
      roster,
      now: NOW,
      sessions: [
        session({ studentId: 's1', completedAt: new Date(NOW - 8 * 86400000).toISOString() }),
        session({ studentId: 's2', completedAt: new Date(NOW - 2 * 86400000).toISOString() }),
      ],
    });
    expect(report.activeCount).toBe(1);
    expect(report.students.find((s) => s.studentId === 's1')?.completed).toBe(false);
    expect(report.students.find((s) => s.studentId === 's2')?.completed).toBe(true);
  });

  it('keeps a 30d session that a 7d window would drop', () => {
    const old = session({ studentId: 's1', completedAt: new Date(NOW - 20 * 86400000).toISOString() });
    const week = deriveWindowedClassroomProgress({ windowDays: 7, roster, sessions: [old], now: NOW });
    const month = deriveWindowedClassroomProgress({ windowDays: 30, roster, sessions: [old], now: NOW });
    expect(week.activeCount).toBe(0);
    expect(month.activeCount).toBe(1);
    expect(month.completionPct).toBe(33);
  });

  it('does not invent percents on an empty roster', () => {
    const report = deriveWindowedClassroomProgress({
      windowDays: 7,
      roster: [],
      sessions: [session({ studentId: 'ghost' })],
      now: NOW,
    });
    expect(report.completionPct).toBeNull();
    expect(report.accuracyPct).toBeNull();
    expect(report.students).toEqual([]);
  });

  it('leaves accuracy null when sessions have no lesson words', () => {
    const report = deriveWindowedClassroomProgress({
      windowDays: 7,
      roster,
      now: NOW,
      sessions: [session({ studentId: 's1', foundCount: 0, missedCount: 0 })],
    });
    expect(report.students[0].completed).toBe(true);
    expect(report.students[0].accuracyPct).toBeNull();
    expect(report.accuracyPct).toBeNull();
    expect(report.completionPct).toBe(33);
  });
});
