import { describe, it, expect } from 'vitest';
import {
  windowRange,
  countInRange,
  periodDelta,
  dailySeries,
  teacherHealth,
  funnelConversion,
} from '../eduMetrics';

const NOW = Date.parse('2026-10-08T00:00:00Z');
const DAY = 86_400_000;

describe('windowRange', () => {
  it('splits a window into current and immediately prior period', () => {
    const r = windowRange(7, NOW);
    expect(r.start).toBe(NOW - 7 * DAY);
    expect(r.end).toBe(NOW);
    expect(r.priorStart).toBe(NOW - 14 * DAY);
    expect(r.priorEnd).toBe(NOW - 7 * DAY);
  });
});

describe('countInRange', () => {
  it('counts timestamps inside (start, end] and ignores null or unparseable values', () => {
    const r = windowRange(7, NOW);
    const ts = [
      new Date(NOW - 1 * DAY).toISOString(),
      new Date(NOW - 10 * DAY).toISOString(),
      null,
      'not-a-date',
    ];
    expect(countInRange(ts, r.start, r.end)).toBe(1);
  });
});

describe('periodDelta', () => {
  it('returns the percent change against the prior period', () => {
    expect(periodDelta(12, 8)).toEqual({ current: 12, prior: 8, pct: 50 });
  });

  it('returns pct null when the prior period is zero, never Infinity', () => {
    expect(periodDelta(5, 0)).toEqual({ current: 5, prior: 0, pct: null });
  });
});

describe('dailySeries', () => {
  it('returns one bucket per day, oldest first, ending today', () => {
    const series = dailySeries(
      [new Date(NOW - 1000).toISOString(), new Date(NOW - 2 * DAY).toISOString()],
      NOW,
      3,
    );
    expect(series).toEqual([1, 0, 1]);
  });
});

describe('teacherHealth', () => {
  it('is thriving when active in the last 7 days and running live rounds', () => {
    expect(teacherHealth({ lastActiveMs: NOW - 2 * DAY, roundsLast7d: 3, nowMs: NOW })).toBe('thriving');
  });

  it('is at_risk when last active 8 to 21 days ago', () => {
    expect(teacherHealth({ lastActiveMs: NOW - 10 * DAY, roundsLast7d: 0, nowMs: NOW })).toBe('at_risk');
  });

  it('is dormant when never active or silent for more than 21 days', () => {
    expect(teacherHealth({ lastActiveMs: null, roundsLast7d: null, nowMs: NOW })).toBe('dormant');
    expect(teacherHealth({ lastActiveMs: NOW - 40 * DAY, roundsLast7d: 0, nowMs: NOW })).toBe('dormant');
  });

  it('judges on last activity alone when the rounds source is unavailable', () => {
    expect(teacherHealth({ lastActiveMs: NOW - 1 * DAY, roundsLast7d: null, nowMs: NOW })).toBe('thriving');
  });
});

describe('funnelConversion', () => {
  it('computes step conversion and marks the steepest drop', () => {
    const steps = funnelConversion([
      { key: 'signup', count: 54 },
      { key: 'class', count: 19 },
      { key: 'student', count: 8 },
    ]);
    expect(steps[1].pctOfPrev).toBeCloseTo(35.2, 1);
    expect(steps[2].pctOfPrev).toBeCloseTo(42.1, 1);
    expect(steps.filter((s) => s.isBiggestDrop).map((s) => s.key)).toEqual(['class']);
  });

  it('gives null conversion when the previous step is zero', () => {
    const steps = funnelConversion([
      { key: 'a', count: 0 },
      { key: 'b', count: 0 },
    ]);
    expect(steps[1].pctOfPrev).toBeNull();
    expect(steps.some((s) => s.isBiggestDrop)).toBe(false);
  });
});
