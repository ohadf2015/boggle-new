import { describe, it, expect } from 'vitest';
import {
  polarTrialDaysLeft,
  polarTrialCountdown,
  polarTrialExpires,
  polarTrialUx,
  polarTrialChipUpgrade,
  isPolarTrialDay10Expiring,
  polarCheckoutWelcomeKind,
  isPolarTrialLapse,
  classifyPolarTrialCancel,
} from '../polarTrial';

const END = '2026-10-08T00:00:00.000Z';

describe('polarTrialExpires', () => {
  it('maps a trialing Pro row to current_period_end', () => {
    expect(polarTrialExpires({
      tier: 'pro', status: 'trialing', source: 'polar', current_period_end: END,
    })).toBe(END);
  });

  it('is null for a paying row, a grant, and a canceled row', () => {
    expect(polarTrialExpires({ tier: 'pro', status: 'active', source: 'polar', current_period_end: END })).toBeNull();
    expect(polarTrialExpires({ tier: 'pro', status: 'trialing', source: 'admin_grant', current_period_end: END })).toBeNull();
    expect(polarTrialExpires({ tier: 'pro', status: 'canceled', source: 'polar', current_period_end: END })).toBeNull();
    expect(polarTrialExpires(null)).toBeNull();
  });
});

describe('polarTrialUx', () => {
  it('a live Polar trial shows the badge and neither ask', () => {
    expect(polarTrialUx({ hasPro: true, status: 'trialing', source: 'polar', trialUsed: true })).toEqual({
      showBadge: true, showLifecycleBanner: true, showReactivation: false, offerTrial: false,
    });
  });

  it('a paying teacher sees no trial chrome', () => {
    expect(polarTrialUx({ hasPro: true, status: 'active', source: 'polar', trialUsed: true })).toEqual({
      showBadge: false, showLifecycleBanner: false, showReactivation: false, offerTrial: false,
    });
  });

  it('an expired Polar trial reactivates for $9 and does not offer another trial', () => {
    expect(polarTrialUx({ hasPro: false, status: 'canceled', source: 'polar', trialUsed: true })).toEqual({
      showBadge: false, showLifecycleBanner: false, showReactivation: true, offerTrial: false,
    });
  });

  it('a free teacher who never trialed can start one', () => {
    expect(polarTrialUx({ hasPro: false, status: 'active', source: 'polar', trialUsed: false })).toEqual({
      showBadge: false, showLifecycleBanner: false, showReactivation: false, offerTrial: true,
    });
  });

  it('a gift is not a Polar trial', () => {
    expect(polarTrialUx({ hasPro: true, status: 'active', source: 'admin_grant', trialUsed: false }).showBadge).toBe(false);
  });
});

describe('polarTrialDaysLeft', () => {
  const now = Date.parse('2026-10-01T00:00:00.000Z');

  it('rounds up whole days and hits zero at the end', () => {
    expect(polarTrialDaysLeft('2026-10-08T00:00:00.000Z', now)).toBe(7);
    expect(polarTrialDaysLeft('2026-10-01T01:00:00.000Z', now)).toBe(1);
    expect(polarTrialDaysLeft('2026-09-30T00:00:00.000Z', now)).toBe(0);
    expect(polarTrialDaysLeft(null, now)).toBeNull();
  });
});

describe('polarTrialChipUpgrade', () => {
  it('is true at 3 days or fewer, false above, false when unknown', () => {
    expect(polarTrialChipUpgrade(3)).toBe(true);
    expect(polarTrialChipUpgrade(0)).toBe(true);
    expect(polarTrialChipUpgrade(4)).toBe(false);
    expect(polarTrialChipUpgrade(null)).toBe(false);
  });
});

describe('isPolarTrialDay10Expiring', () => {
  it('is true from day 10 (4 days left) through today, false before and when unknown', () => {
    expect(isPolarTrialDay10Expiring(4)).toBe(true);
    expect(isPolarTrialDay10Expiring(0)).toBe(true);
    expect(isPolarTrialDay10Expiring(5)).toBe(false);
    expect(isPolarTrialDay10Expiring(null)).toBe(false);
  });
});

describe('polarCheckoutWelcomeKind', () => {
  it('a Polar trial return is the trial welcome, not the paid one', () => {
    expect(polarCheckoutWelcomeKind({
      checkoutSuccess: true, hasPro: true, source: 'polar', status: 'trialing',
    })).toBe('trial');
  });

  it('a paid Polar return is the paid celebration', () => {
    expect(polarCheckoutWelcomeKind({
      checkoutSuccess: true, hasPro: true, source: 'polar', status: 'active',
    })).toBe('paid');
  });

  it('stays quiet without checkout success, without Pro, or on a gift', () => {
    expect(polarCheckoutWelcomeKind({
      checkoutSuccess: false, hasPro: true, source: 'polar', status: 'trialing',
    })).toBe('none');
    expect(polarCheckoutWelcomeKind({
      checkoutSuccess: true, hasPro: false, source: 'polar', status: 'trialing',
    })).toBe('none');
    expect(polarCheckoutWelcomeKind({
      checkoutSuccess: true, hasPro: true, source: 'admin_grant', status: 'active',
    })).toBe('none');
  });
});

describe('isPolarTrialLapse', () => {
  it('is true when Polar cancels a still-trialing Teacher Pro row', () => {
    expect(isPolarTrialLapse({
      status: 'trialing', trial: true, trial_end: END, current_period_end: END,
    })).toBe(true);
  });

  it('is true when Polar reports canceled and the period end is the trial end', () => {
    expect(isPolarTrialLapse({
      status: 'canceled', trial: true, trial_end: END, current_period_end: END,
    })).toBe(true);
  });

  it('is false for a paid cancel (period continues past the trial end)', () => {
    expect(isPolarTrialLapse({
      status: 'canceled',
      trial: true,
      trial_end: END,
      current_period_end: '2026-11-08T00:00:00.000Z',
    })).toBe(false);
  });

  it('is false for an active or never-trialed row', () => {
    expect(isPolarTrialLapse({
      status: 'active', trial: true, trial_end: END, current_period_end: END,
    })).toBe(false);
    expect(isPolarTrialLapse({ status: 'canceled', trial: false, trial_end: null, current_period_end: END })).toBe(false);
  });
});

describe('polarTrialCountdown', () => {
  const NOW = Date.parse('2026-10-01T00:00:00.000Z');

  it('counts whole days while more than one day remains', () => {
    const iso = new Date(NOW + 5 * 86_400_000).toISOString();
    expect(polarTrialCountdown(iso, NOW, 'en')).toEqual({ key: 'education.trial.days_left', count: 5 });
  });

  it('switches to hours inside the final day, like the access-trial badge', () => {
    const iso = new Date(NOW + 5 * 3_600_000).toISOString();
    expect(polarTrialCountdown(iso, NOW, 'en')).toEqual({ key: 'education.trial.hours_left', count: 5 });
  });

  it('uses the singular form at one day/hour and plural rules for Russian', () => {
    expect(polarTrialCountdown(new Date(NOW + 86_400_000).toISOString(), NOW, 'en'))
      .toEqual({ key: 'education.trial.hours_left', count: 24 });
    expect(polarTrialCountdown(new Date(NOW + 3_600_000).toISOString(), NOW, 'en'))
      .toEqual({ key: 'education.trial.hour_left', count: 1 });
    expect(polarTrialCountdown(new Date(NOW + 21 * 86_400_000).toISOString(), NOW, 'ru'))
      .toEqual({ key: 'education.trial.day_left', count: 21 });
  });

  it('is null when the expiry is unknown, and 0 hours once it has passed', () => {
    expect(polarTrialCountdown(null, NOW, 'en')).toBeNull();
    expect(polarTrialCountdown('not-a-date', NOW, 'en')).toBeNull();
    expect(polarTrialCountdown(new Date(NOW - 1000).toISOString(), NOW, 'en'))
      .toEqual({ key: 'education.trial.hours_left', count: 0 });
  });
});

describe('classifyPolarTrialCancel', () => {
  const NOW = Date.parse('2026-11-23T07:45:32.000Z');
  const TRIAL_END = '2026-12-06T19:21:51.009Z';

  it('a cancel while Polar still says trialing is scheduled, even without cancel_at_period_end', () => {
    expect(classifyPolarTrialCancel({
      status: 'trialing',
      trial: true,
      trial_end: TRIAL_END,
      current_period_end: TRIAL_END,
    }, NOW)).toBe('scheduled');
  });

  it('a cancel_at_period_end during a future trial is scheduled even if status is already canceled', () => {
    expect(classifyPolarTrialCancel({
      status: 'canceled',
      trial: true,
      cancel_at_period_end: true,
      trial_end: TRIAL_END,
      current_period_end: TRIAL_END,
    }, NOW)).toBe('scheduled');
  });

  it('a cancel after the trial end, with no paid period after it, is a lapse', () => {
    expect(classifyPolarTrialCancel({
      status: 'canceled',
      trial: true,
      trial_end: '2026-10-01T00:00:00.000Z',
      current_period_end: '2026-10-01T00:00:00.000Z',
    }, NOW)).toBe('lapsed');
  });

  it('a paid cancel (period continues past the trial) is not a trial end', () => {
    expect(classifyPolarTrialCancel({
      status: 'canceled',
      trial: true,
      trial_end: '2026-10-01T00:00:00.000Z',
      current_period_end: '2026-11-08T00:00:00.000Z',
    }, NOW)).toBe('paid');
  });

  it('a never-trialed cancel is not a trial end', () => {
    expect(classifyPolarTrialCancel({
      status: 'canceled',
      trial: false,
      trial_end: null,
      current_period_end: TRIAL_END,
    }, NOW)).toBe('not_trial');
  });
});
