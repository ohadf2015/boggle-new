import { describe, it, expect } from 'vitest';
import {
  circularMeanMinutes,
  addMinutesWrap,
  inWindow,
} from '../smartReminderTime';

describe('circularMeanMinutes', () => {
  it('returns null for empty array', () => {
    expect(circularMeanMinutes([])).toBeNull();
  });

  it('returns the single value for a one-element array', () => {
    expect(circularMeanMinutes([600])).toBe(600);
  });

  it('averages near-by minutes with arithmetic-like result', () => {
    // 10:00, 11:00, 12:00 → 11:00 (660)
    const m = circularMeanMinutes([600, 660, 720]);
    expect(m).not.toBeNull();
    expect(Math.abs((m as number) - 660)).toBeLessThanOrEqual(1);
  });

  it('handles midnight wrap: 23:30 + 00:30 → 00:00 (not 12:00)', () => {
    const m = circularMeanMinutes([1410, 30]);
    expect(m).not.toBeNull();
    // result lives near 0 — accept either 0 or 1439 (numerical edge)
    const v = m as number;
    expect(v === 0 || v === 1439 || v <= 1 || v >= 1438).toBe(true);
  });

  it('handles spread across midnight: 23:00 + 00:00 + 01:00 → 00:00', () => {
    const m = circularMeanMinutes([1380, 0, 60]);
    expect(m).not.toBeNull();
    const v = m as number;
    expect(v <= 1 || v >= 1438).toBe(true);
  });

  it('always returns an integer within [0, 1439]', () => {
    const samples = [
      [615, 720, 825],
      [0, 1439],
      [400, 500, 600, 700, 800],
    ];
    for (const s of samples) {
      const m = circularMeanMinutes(s) as number;
      expect(Number.isInteger(m)).toBe(true);
      expect(m).toBeGreaterThanOrEqual(0);
      expect(m).toBeLessThanOrEqual(1439);
    }
  });
});

describe('addMinutesWrap', () => {
  it('wraps forward across midnight', () => {
    expect(addMinutesWrap(1430, 30)).toBe(20);
  });

  it('wraps backward below 0', () => {
    expect(addMinutesWrap(0, -30)).toBe(1410);
  });

  it('does not wrap when in range', () => {
    expect(addMinutesWrap(720, 60)).toBe(780);
  });

  it('handles deltas larger than a full day', () => {
    expect(addMinutesWrap(0, 1440)).toBe(0);
    expect(addMinutesWrap(60, 2880)).toBe(60);
  });
});

describe('inWindow', () => {
  it('start is inclusive', () => {
    expect(inWindow(720, 720, 60)).toBe(true);
  });

  it('end is exclusive', () => {
    expect(inWindow(780, 720, 60)).toBe(false);
  });

  it('mid-window true', () => {
    expect(inWindow(750, 720, 60)).toBe(true);
  });

  it('before start false', () => {
    expect(inWindow(719, 720, 60)).toBe(false);
  });

  it('window wraps across midnight: target 23:30, window 60min covers 23:30..00:30', () => {
    expect(inWindow(1410, 1410, 60)).toBe(true); // 23:30
    expect(inWindow(1430, 1410, 60)).toBe(true); // 23:50
    expect(inWindow(10, 1410, 60)).toBe(true); // 00:10
    expect(inWindow(29, 1410, 60)).toBe(true); // 00:29
    expect(inWindow(30, 1410, 60)).toBe(false); // 00:30 = exclusive end
    expect(inWindow(1409, 1410, 60)).toBe(false); // 23:29 — before start
  });
});
