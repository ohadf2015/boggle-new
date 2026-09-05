import { describe, it, expect } from 'vitest';
import { pickTeacherBanner } from './teacherBannerPriority';

/**
 * The teacher dashboard stacked three monetization banners at once.
 *
 * Observed 2026-08-30 on production: above the dashboard a teacher could get a
 * trial-urgency banner, a "Running 5+ classrooms? Ask about district pricing"
 * upsell, AND an "upgrade to Pro" strip — then a welcome banner and an
 * onboarding modal on top. Across 35 teachers the module has 4 classrooms and
 * one student, so district pricing is being pitched to people who have never
 * run a game.
 *
 * Show at most one, and pick the one that is true for this teacher right now.
 */
describe('pickTeacherBanner', () => {
  it('prefers the trial countdown — it is the only time-critical one', () => {
    expect(pickTeacherBanner({ hasTrial: true, isAdmin: false })).toBe('trial');
  });

  it('falls back to the Pro upgrade when there is no trial running', () => {
    expect(pickTeacherBanner({ hasTrial: false, isAdmin: false })).toBe('pro');
  });

  it('shows an admin nothing — they already have access', () => {
    expect(pickTeacherBanner({ hasTrial: false, isAdmin: true })).toBe('none');
  });

  it('still shows an admin their trial state if one exists', () => {
    expect(pickTeacherBanner({ hasTrial: true, isAdmin: true })).toBe('trial');
  });

  it('never returns more than one banner', () => {
    const results = [
      pickTeacherBanner({ hasTrial: true, isAdmin: false }),
      pickTeacherBanner({ hasTrial: false, isAdmin: false }),
      pickTeacherBanner({ hasTrial: false, isAdmin: true }),
    ];
    results.forEach((r) => expect(typeof r).toBe('string'));
  });
});

/**
 * A Pro teacher — paid or gifted — must never be asked to upgrade. Until this
 * case existed the dashboard showed "Upgrade to Pro" above a Pro teacher's
 * dashboard, which reads as "your Pro did not take".
 */
describe('pickTeacherBanner for a Pro teacher', () => {
  it('shows nothing to a Pro teacher with no trial', () => {
    expect(pickTeacherBanner({ hasTrial: false, isAdmin: false, hasPro: true })).toBe('none');
  });

  it('shows nothing while the entitlement is still unknown — never an upsell that a later answer retracts', () => {
    expect(pickTeacherBanner({ hasTrial: false, isAdmin: false, hasPro: false, proLoading: true })).toBe('none');
  });

  /**
   * Pro wins over a trial, both stages of it.
   *
   * A gifted-Pro teacher keeps her old `teacher_access_requests.trial_expires_at`,
   * and `hasTrial` was checked FIRST. Verified in prod on 2026-09-05: a teacher
   * granted Pro through 2027 was about to see a "20 days left in your trial"
   * countdown over a dashboard whose own header says PRO — and once that date
   * passed, `TrialUrgencyBanner`'s expired branch would have turned it into an
   * "Upgrade now" card sitting on top of a year of gifted Pro. That is the exact
   * thing this file's docstring promises never to do.
   */
  it('shows a Pro teacher nothing, even while a stale trial deadline is still on file', () => {
    expect(pickTeacherBanner({ hasTrial: true, isAdmin: false, hasPro: true })).toBe('none');
  });

  it('shows nothing to a trial teacher whose Pro entitlement has not answered yet', () => {
    // Class 1: two sources, one late. Render the pessimistic state until the
    // late one lands, rather than a countdown Pro will immediately retract.
    expect(pickTeacherBanner({ hasTrial: true, isAdmin: false, hasPro: false, proLoading: true })).toBe('none');
  });

  it('still shows the countdown to a genuine trial teacher who is not Pro', () => {
    expect(pickTeacherBanner({ hasTrial: true, isAdmin: false, hasPro: false, proLoading: false })).toBe('trial');
  });
});
