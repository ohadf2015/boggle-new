import { describe, expect, it } from 'vitest';
import {
  REMINDER_AHEAD_MINUTES,
  REMINDER_GRACE_MINUTES,
  defaultLessonAt,
  formatLessonTime,
  isReminderDue,
  validateLessonAt,
} from '../lessonPlan';

const MIN = 60_000;
const NOW = new Date(2026, 10, 11, 20, 15);

describe('defaultLessonAt', () => {
  it('given an evening, when asked for a default, then returns 9:00 local the next day', () => {
    const at = defaultLessonAt(NOW);
    expect([at.getFullYear(), at.getMonth(), at.getDate(), at.getHours(), at.getMinutes()]).toEqual([2026, 10, 12, 9, 0]);
  });

  it('given the last day of a month, when asked for a default, then rolls into the next month', () => {
    const at = defaultLessonAt(new Date(2026, 10, 30, 22, 0));
    expect([at.getMonth(), at.getDate(), at.getHours()]).toEqual([11, 1, 9]);
  });
});

describe('validateLessonAt', () => {
  it('given a lesson tomorrow, when validated, then it is ok', () => {
    expect(validateLessonAt(defaultLessonAt(NOW), NOW)).toEqual({ ok: true });
  });

  it('given a lesson 29 minutes ahead, when validated, then it is too soon', () => {
    expect(validateLessonAt(new Date(NOW.getTime() + 29 * MIN), NOW)).toEqual({ ok: false, reason: 'too_soon' });
  });

  it('given a lesson exactly 30 minutes ahead, when validated, then it is ok', () => {
    expect(validateLessonAt(new Date(NOW.getTime() + 30 * MIN), NOW)).toEqual({ ok: true });
  });

  it('given a lesson in the past, when validated, then it is too soon', () => {
    expect(validateLessonAt(new Date(NOW.getTime() - 60 * MIN), NOW)).toEqual({ ok: false, reason: 'too_soon' });
  });

  it('given a lesson 61 days ahead, when validated, then it is too far', () => {
    expect(validateLessonAt(new Date(NOW.getTime() + 61 * 24 * 60 * MIN), NOW)).toEqual({ ok: false, reason: 'too_far' });
  });

  it('given an invalid date, when validated, then it is invalid', () => {
    expect(validateLessonAt(new Date('nope'), NOW)).toEqual({ ok: false, reason: 'invalid' });
  });
});

describe('isReminderDue', () => {
  it('uses a 75-minute lead and a 30-minute grace', () => {
    expect(REMINDER_AHEAD_MINUTES).toBe(75);
    expect(REMINDER_GRACE_MINUTES).toBe(30);
  });

  it.each([
    [60, true],
    [75, true],
    [76, false],
    [90, false],
    [0, true],
    [-30, true],
    [-31, false],
    [24 * 60, false],
  ] as Array<[number, boolean]>)('given a lesson %i minutes from now, when checked, then due is %s', (minutes, due) => {
    expect(isReminderDue(new Date(NOW.getTime() + minutes * MIN), NOW)).toBe(due);
  });

  it('given an invalid date, when checked, then it is not due', () => {
    expect(isReminderDue(new Date('nope'), NOW)).toBe(false);
  });
});

describe('formatLessonTime', () => {
  const at = new Date('2026-11-12T07:00:00Z');

  it('given a teacher timezone, when formatted, then shows weekday and time there', () => {
    const out = formatLessonTime(at, 'Asia/Jerusalem', 'en');
    expect(out).toMatch(/Thursday/);
    expect(out).toMatch(/9:00/);
  });

  it('given no timezone, when formatted, then falls back to UTC', () => {
    expect(formatLessonTime(at, null, 'en')).toMatch(/7:00/);
  });

  it('given an invalid timezone, when formatted, then falls back to UTC without throwing', () => {
    expect(formatLessonTime(at, 'Mars/Olympus', 'en')).toMatch(/7:00/);
  });

  it('given an invalid locale, when formatted, then still formats without throwing', () => {
    expect(formatLessonTime(at, 'UTC', 'not a locale!!')).toMatch(/7:00/);
  });

  it('given Hebrew, when formatted, then uses the Hebrew weekday', () => {
    expect(formatLessonTime(at, 'Asia/Jerusalem', 'he')).toMatch(/חמישי/);
  });
});
