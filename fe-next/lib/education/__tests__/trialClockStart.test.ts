import { describe, it, expect } from 'vitest';
import { planTrialClockStart } from '../trialClockStart';

const NOW = Date.parse('2026-10-25T12:00:00Z');
const FOURTEEN_DAYS_LATER = '2026-11-08T12:00:00.000Z';

describe('planTrialClockStart: the access trial runs from the first real live game', () => {
  it('restarts an expired, never-used trial for 14 days from now', () => {
    expect(planTrialClockStart({ trial_expires_at: '2026-09-01T00:00:00Z', trial_reminders_sent: ['t-3', 't-0', 't+3'] }, NOW)).toEqual({
      trial_expires_at: FOURTEEN_DAYS_LATER,
      trial_reminders_sent: [],
    });
  });

  it('extends a trial that would end sooner, keeping non-reminder markers', () => {
    expect(planTrialClockStart({ trial_expires_at: '2026-10-28T00:00:00Z', trial_reminders_sent: ['t-3', 'goodwill_ext_2026_08_29'] }, NOW)).toEqual({
      trial_expires_at: FOURTEEN_DAYS_LATER,
      trial_reminders_sent: ['goodwill_ext_2026_08_29'],
    });
  });

  it('never shortens a trial that already runs longer', () => {
    expect(planTrialClockStart({ trial_expires_at: '2026-12-01T00:00:00Z', trial_reminders_sent: [] }, NOW)).toBeNull();
  });

  it('does nothing for a teacher with no access trial window', () => {
    expect(planTrialClockStart({ trial_expires_at: null, trial_reminders_sent: null }, NOW)).toBeNull();
  });
});
