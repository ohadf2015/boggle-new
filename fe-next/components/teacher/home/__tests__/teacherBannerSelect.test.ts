import { describe, expect, it } from 'vitest';
import { selectTeacherBanner, type TeacherBannerInput } from '../teacherBannerSelect';

const base: TeacherBannerInput = {
  proLoading: false,
  proKnown: true,
  hasPro: false,
  status: 'active',
  source: 'polar',
  trialUsed: false,
  pendingCheckout: false,
  isAdmin: false,
  accessLoading: false,
  accessTrialExpired: false,
  accessTrialLive: false,
  trialReminderOpen: false,
  trialEndedDismissed: false,
  polarTrialExpiring: false,
  trialExpiringDismissed: false,
};
const pick = (over: Partial<TeacherBannerInput>) => selectTeacherBanner({ ...base, ...over });

describe('selectTeacherBanner', () => {
  it('given the plan is still loading, when picking, then nothing is decided yet', () => {
    expect(pick({ proLoading: true })).toEqual({ kind: 'pending' });
    expect(pick({ accessLoading: true })).toEqual({ kind: 'pending' });
  });

  it('given the plan lookup failed, when picking, then it says error, not "no banner"', () => {
    expect(pick({ proKnown: false })).toEqual({ kind: 'error' });
  });

  it('given a free teacher with nothing billing-related going on, when picking, then no banner (upsells are not banners)', () => {
    expect(pick({})).toEqual({ kind: 'none' });
  });

  it('given a declined renewal, when picking, then payment failed wins over everything', () => {
    expect(pick({ hasPro: true, status: 'past_due', source: 'polar', pendingCheckout: true })).toEqual({ kind: 'show', banner: 'paymentFailed' });
  });

  it('given a live Polar trial, when picking, then the trial lifecycle banner shows, and the expiring one near the end', () => {
    expect(pick({ hasPro: true, status: 'trialing' })).toEqual({ kind: 'show', banner: 'trialing' });
    expect(pick({ hasPro: true, status: 'trialing', polarTrialExpiring: true })).toEqual({ kind: 'show', banner: 'trialExpiring' });
    expect(pick({ hasPro: true, status: 'trialing', polarTrialExpiring: true, trialExpiringDismissed: true })).toEqual({ kind: 'none' });
  });

  it('given paid Pro, when picking, then no banner', () => {
    expect(pick({ hasPro: true })).toEqual({ kind: 'none' });
  });

  it('given admin-granted Pro marked trialing, when picking, then no trial banner', () => {
    expect(pick({ hasPro: true, status: 'trialing', source: 'admin_grant' })).toEqual({ kind: 'none' });
  });

  it('given an unfinished checkout, when picking, then the resume banner shows (not for admins)', () => {
    expect(pick({ pendingCheckout: true })).toEqual({ kind: 'show', banner: 'pendingCheckout' });
    expect(pick({ pendingCheckout: true, isAdmin: true })).toEqual({ kind: 'none' });
  });

  it('given an ended Polar trial, when picking, then reactivate shows until dismissed', () => {
    expect(pick({ trialUsed: true })).toEqual({ kind: 'show', banner: 'reactivate' });
    expect(pick({ trialUsed: true, trialEndedDismissed: true })).toEqual({ kind: 'none' });
  });

  it('given the access trial is in its last days or ended, when picking, then the reminder or the renewal card shows', () => {
    expect(pick({ trialReminderOpen: true })).toEqual({ kind: 'show', banner: 'trialReminder' });
    expect(pick({ accessTrialExpired: true })).toEqual({ kind: 'show', banner: 'trialExpired' });
    expect(pick({ accessTrialExpired: true, isAdmin: true })).toEqual({ kind: 'show', banner: 'trialExpired' });
  });

  it('given a live access trial with days left, when picking, then the trial-ending card shows (not only the last 3 days)', () => {
    expect(pick({ accessTrialLive: true })).toEqual({ kind: 'show', banner: 'trialEnding' });
    expect(pick({ accessTrialLive: true, trialReminderOpen: true })).toEqual({ kind: 'show', banner: 'trialEnding' });
    expect(pick({ accessTrialLive: true, isAdmin: true })).toEqual({ kind: 'show', banner: 'trialEnding' });
  });
});
