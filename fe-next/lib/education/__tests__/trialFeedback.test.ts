import { describe, it, expect } from 'vitest';
import { pickTrialEmail, FEEDBACK_AFTER_DAYS, FEEDBACK_MIN_DAYS_LEFT } from '../trialReminders';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-11-05T09:40:00.000Z');
const at = (days: number) => new Date(NOW + days * DAY).toISOString();

describe('pickTrialEmail', () => {
  it('waits until five days after approval', () => {
    expect(pickTrialEmail(at(-4), at(10), [], NOW)).toBeNull();
    expect(pickTrialEmail(at(-FEEDBACK_AFTER_DAYS), at(9), [], NOW)).toBe('feedback');
  });

  it('sends the check-in once', () => {
    expect(pickTrialEmail(at(-6), at(8), ['feedback'], NOW)).toBeNull();
  });

  it('leaves the ask to the t-3 email once the end is near', () => {
    expect(pickTrialEmail(at(-10), at(FEEDBACK_MIN_DAYS_LEFT - 0.6), [], NOW)).toBeNull();
    expect(pickTrialEmail(at(-11), at(2.5), [], NOW)).toBe('t-3');
  });

  it('lets a due trial-ending email win over the check-in', () => {
    expect(pickTrialEmail(at(-11), at(2.5), ['feedback'], NOW)).toBe('t-3');
  });

  it('never sends a check-in after any trial-ending email', () => {
    expect(pickTrialEmail(at(-6), at(8), ['t-3'], NOW)).toBeNull();
  });

  it('needs both dates', () => {
    expect(pickTrialEmail(null, at(8), [], NOW)).toBeNull();
    expect(pickTrialEmail(at(-6), null, [], NOW)).toBeNull();
    expect(pickTrialEmail('nope', at(8), [], NOW)).toBeNull();
  });

  // The two teachers in trial on Nov 5 2026: both are inside the last five days,
  // so they get the softened t-3 (which asks for feedback), not a separate check-in.
  it('sends Lenita and Lino the t-3 email, not a second feedback note', () => {
    const lenita = { approved: '2026-10-24T16:57:09Z', ends: '2026-11-07T16:57:09Z' };
    const lino = { approved: '2026-10-26T18:42:10Z', ends: '2026-11-09T18:42:10Z' };
    expect(pickTrialEmail(lenita.approved, lenita.ends, [], NOW)).toBe('t-3');
    expect(pickTrialEmail(lino.approved, lino.ends, [], NOW)).toBeNull();
    expect(pickTrialEmail(lino.approved, lino.ends, [], Date.parse('2026-11-07T09:40:00Z'))).toBe('t-3');
  });
});
