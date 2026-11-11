import { describe, expect, it } from 'vitest';
import { freeInsightClassId, toFreeClassPulse } from '../freeClassInsight';
import type { ClassAnalytics } from '../classAnalyticsServer';

const metrics = (students: ClassAnalytics['students']): ClassAnalytics => ({
  studentsNeedingHelp: 1,
  classAverageXp: 40,
  activeStudentsToday: 1,
  weeklyEngagement: 0,
  totalStudents: students.length,
  commonMistakes: [{ word: 'desk', errorRate: 0.8, studentCount: 2 }],
  dailyActive: [{ day: '2026-11-10', count: 1 }],
  students,
});

const pulse = (id: string, status: ClassAnalytics['students'][number]['status']) => ({
  id, status, accuracy: 0.4, attempts: 10, xp: 50, lastPractice: '2026-11-09', activeDays: 2,
});

describe('freeInsightClassId', () => {
  it('given several classes, when picking the free class, then the oldest one wins', () => {
    expect(freeInsightClassId([
      { id: 'b', created_at: '2026-10-02T00:00:00Z' },
      { id: 'a', created_at: '2026-09-01T00:00:00Z' },
      { id: 'c', created_at: '2026-11-01T00:00:00Z' },
    ])).toBe('a');
  });

  it('given two classes made at the same instant, when picking, then the lower id wins on every caller', () => {
    const rows = [{ id: 'z', created_at: '2026-09-01T00:00:00Z' }, { id: 'm', created_at: '2026-09-01T00:00:00Z' }];
    expect(freeInsightClassId(rows)).toBe('m');
    expect(freeInsightClassId([...rows].reverse())).toBe('m');
  });

  it('given no classes, when picking, then there is none', () => {
    expect(freeInsightClassId([])).toBeNull();
  });

  it('given a row with a broken date, when picking, then it sorts after real dates', () => {
    expect(freeInsightClassId([{ id: 'x', created_at: 'nope' }, { id: 'y', created_at: '2026-10-01T00:00:00Z' }])).toBe('y');
  });
});

describe('toFreeClassPulse', () => {
  it('given Pro metrics, when cut for a free teacher, then only ids, statuses and counts survive', () => {
    const out = toFreeClassPulse(metrics([pulse('s1', 'needsHelp'), pulse('s2', 'thriving'), pulse('s3', 'inactive')]));
    expect(Object.keys(out).sort()).toEqual(['counts', 'needsHelp', 'totalStudents']);
    expect(out.needsHelp).toEqual([{ id: 's1', status: 'needsHelp' }, { id: 's3', status: 'inactive' }]);
    for (const row of out.needsHelp) expect(Object.keys(row).sort()).toEqual(['id', 'status']);
    expect(out.counts).toEqual({ needsHelp: 1, inactive: 1, notStarted: 0, steady: 0, thriving: 1 });
    expect(out.totalStudents).toBe(3);
  });

  it('given a class with nobody playing yet, when cut, then the pulse is empty and counts are zero', () => {
    const out = toFreeClassPulse(metrics([]));
    expect(out.needsHelp).toEqual([]);
    expect(out.counts.needsHelp).toBe(0);
  });

  it('given rows from before statuses existed, when cut, then an unknown status is dropped instead of crashing', () => {
    const legacy = { id: 'old', status: 'mystery' } as unknown as ClassAnalytics['students'][number];
    const out = toFreeClassPulse(metrics([legacy, pulse('s1', 'notStarted')]));
    expect(out.needsHelp).toEqual([{ id: 's1', status: 'notStarted' }]);
  });
});
