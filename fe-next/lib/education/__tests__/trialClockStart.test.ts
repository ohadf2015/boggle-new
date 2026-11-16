import { describe, it, expect } from 'vitest';
import { FIRST_GAME_RESTART_MARK, markFirstGameRestart, planTrialClockStart } from '../trialClockStart';

const NOW = Date.parse('2026-10-25T12:00:00Z');
const FOURTEEN_DAYS_LATER = '2026-11-08T12:00:00.000Z';

describe('planTrialClockStart: the access trial runs from the first real live game', () => {
  it('restarts an expired, never-used trial for 14 days from now', () => {
    expect(planTrialClockStart({ trial_expires_at: '2026-09-01T00:00:00Z', trial_reminders_sent: ['t-3', 't-0', 't+3'] }, NOW)).toEqual({
      trial_expires_at: FOURTEEN_DAYS_LATER,
      trial_reminders_sent: [FIRST_GAME_RESTART_MARK],
    });
  });

  it('extends a trial that would end sooner, keeping non-reminder markers', () => {
    expect(planTrialClockStart({ trial_expires_at: '2026-10-28T00:00:00Z', trial_reminders_sent: ['t-3', 'goodwill_ext_2026_08_29'] }, NOW)).toEqual({
      trial_expires_at: FOURTEEN_DAYS_LATER,
      trial_reminders_sent: ['goodwill_ext_2026_08_29', FIRST_GAME_RESTART_MARK],
    });
  });

  it('never shortens a trial that already runs longer', () => {
    expect(planTrialClockStart({ trial_expires_at: '2026-12-01T00:00:00Z', trial_reminders_sent: [] }, NOW)).toBeNull();
  });

  it('does nothing for a teacher with no access trial window', () => {
    expect(planTrialClockStart({ trial_expires_at: null, trial_reminders_sent: null }, NOW)).toBeNull();
  });

  it('restarts once only: a second "first game" never hands out another 14 days', () => {
    const first = planTrialClockStart({ trial_expires_at: '2026-09-01T00:00:00Z', trial_reminders_sent: ['t+3'] }, NOW)!;
    const later = NOW + 20 * 86_400_000;
    expect(planTrialClockStart({ trial_expires_at: first.trial_expires_at, trial_reminders_sent: first.trial_reminders_sent }, later)).toBeNull();
  });

  it('sets the end to 14 days from the first game, never adds to a live window (no stacking)', () => {
    // 10 days still left: the new end is 14 days from now, not 24.
    const plan = planTrialClockStart({ trial_expires_at: '2026-11-04T12:00:00Z', trial_reminders_sent: [] }, NOW)!;
    expect(plan.trial_expires_at).toBe(FOURTEEN_DAYS_LATER);
  });

  it('markFirstGameRestart only adds the marker, once', () => {
    expect(markFirstGameRestart({ trial_expires_at: null, trial_reminders_sent: ['t-3'] })).toEqual({ trial_reminders_sent: ['t-3', FIRST_GAME_RESTART_MARK] });
    expect(markFirstGameRestart({ trial_expires_at: null, trial_reminders_sent: [FIRST_GAME_RESTART_MARK] })).toBeNull();
  });
});
