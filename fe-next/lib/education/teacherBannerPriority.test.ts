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

  it('a Pro teacher still sees an active trial countdown', () => {
    expect(pickTeacherBanner({ hasTrial: true, isAdmin: false, hasPro: true })).toBe('trial');
  });
});
