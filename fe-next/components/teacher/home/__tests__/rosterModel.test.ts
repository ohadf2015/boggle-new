import { describe, it, expect } from 'vitest';
import { rosterAccuracy, rosterCounts, rosterRows, rosterStatus } from '../rosterModel';

const NOW = Date.parse('2026-11-04T12:00:00Z');
const DAY = 86_400_000;
const iso = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString();

const student = (id: string, totalXp: number, lastPracticeDate: string | null) => ({
  studentId: id,
  displayName: `S-${id}`,
  totalXp,
  wordsMastered: 3,
  wordsAttempted: 9,
  overallAccuracy: 0.8,
  currentStreak: 2,
  lastPracticeDate,
});

describe('rosterStatus', () => {
  it('Given practice within the last 7 days, Then the student is done', () => {
    expect(rosterStatus(iso(0), NOW)).toBe('done');
    expect(rosterStatus(iso(6.9), NOW)).toBe('done');
  });

  it('Given practice only before this week, Then the student is late', () => {
    expect(rosterStatus(iso(8), NOW)).toBe('late');
  });

  it('Given no practice ever, Then the student has not started', () => {
    expect(rosterStatus(null, NOW)).toBe('idle');
  });

  it('Given an unparseable date, Then it reads as not started instead of done', () => {
    expect(rosterStatus('not-a-date', NOW)).toBe('idle');
  });
});

describe('rosterRows', () => {
  it('Given a level from the progress read, Then the row carries it, and a missing or zero level reads as none', () => {
    const [withLevel] = rosterRows([{ ...student('a', 10, null), currentLevel: 3 }], NOW);
    expect(withLevel.level).toBe(3);
    expect(rosterRows([student('b', 10, null)], NOW)[0].level).toBeNull();
    expect(rosterRows([{ ...student('c', 10, null), currentLevel: 0 }], NOW)[0].level).toBeNull();
  });


  it('Given students, Then rows are sorted by XP, highest first, each with its status', () => {
    const rows = rosterRows([student('a', 10, null), student('b', 90, iso(1)), student('c', 40, iso(10))], NOW);
    expect(rows.map((r) => [r.id, r.status])).toEqual([
      ['b', 'done'],
      ['c', 'late'],
      ['a', 'idle'],
    ]);
  });

  it('Given equal XP, Then the order falls back to name so it never jumps between renders', () => {
    const rows = rosterRows([student('z', 5, null), student('m', 5, null)], NOW);
    expect(rows.map((r) => r.id)).toEqual(['m', 'z']);
  });
});

describe('rosterCounts', () => {
  it('Given rows, Then it counts each status', () => {
    const rows = rosterRows([student('a', 1, iso(0)), student('b', 1, iso(0)), student('c', 1, iso(9)), student('d', 1, null)], NOW);
    expect(rosterCounts(rows)).toEqual({ done: 2, late: 1, idle: 1 });
  });
});

describe('rosterAccuracy', () => {
  const row = (accuracy: number, wordsAttempted: number) => ({ ...rosterRows([student('a', 1, iso(0))], NOW)[0], accuracy, wordsAttempted });

  it('Given answered words, Then it turns the percent into a 0..1 share', () => {
    expect(rosterAccuracy(row(72, 10))).toBeCloseTo(0.72);
  });

  it('Given nothing answered yet, Then there is no share rather than a fake 0%', () => {
    expect(rosterAccuracy(row(0, 0))).toBeNull();
  });

  it('Given an out-of-range percent, Then it is clamped to the meter', () => {
    expect(rosterAccuracy(row(140, 3))).toBe(1);
    expect(rosterAccuracy(row(-5, 3))).toBe(0);
  });
});
