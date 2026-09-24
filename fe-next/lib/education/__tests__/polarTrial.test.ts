import { describe, it, expect } from 'vitest';
import { polarTrialDaysLeft, polarTrialExpires, polarTrialUx } from '../polarTrial';

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
      showBadge: true, showReactivation: false, offerTrial: false,
    });
  });

  it('a paying teacher sees no trial chrome', () => {
    expect(polarTrialUx({ hasPro: true, status: 'active', source: 'polar', trialUsed: true })).toEqual({
      showBadge: false, showReactivation: false, offerTrial: false,
    });
  });

  it('an expired Polar trial reactivates for $9 and does not offer another trial', () => {
    expect(polarTrialUx({ hasPro: false, status: 'canceled', source: 'polar', trialUsed: true })).toEqual({
      showBadge: false, showReactivation: true, offerTrial: false,
    });
  });

  it('a free teacher who never trialed can start one', () => {
    expect(polarTrialUx({ hasPro: false, status: 'active', source: 'polar', trialUsed: false })).toEqual({
      showBadge: false, showReactivation: false, offerTrial: true,
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
