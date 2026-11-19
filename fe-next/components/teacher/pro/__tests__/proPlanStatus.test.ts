import { describe, it, expect } from 'vitest';
import { proPlanStatusLine } from '../proPlanStatus';

const t = (key: string, params?: Record<string, unknown>) => (params ? `${key}|${Object.values(params).join('|')}` : key);
const base = { t, language: 'en', nowMs: Date.parse('2026-11-19T00:00:00Z') };
const END = '2027-09-16T12:00:00Z';

describe('proPlanStatusLine', () => {
  it('Given a gift with an end date, Then it names the date', () => {
    expect(proPlanStatusLine({ ...base, source: 'admin_grant', periodEnd: END })).toBe('eduPlans.manage.gifted|September 16, 2027');
  });

  it('Given a gift with no date, Then it stays open-ended', () => {
    expect(proPlanStatusLine({ ...base, source: 'admin_grant' })).toBe('eduPlans.manage.giftedOpen');
  });

  it('Given a paid plan, Then it says when it renews and for how much', () => {
    expect(proPlanStatusLine({ ...base, status: 'active', periodEnd: END })).toMatch(/^eduPlans\.manage\.renews\|September 16, 2027\|\$/);
  });

  it('Given a paid plan set to cancel, Then it says when it ends instead of promising a renewal', () => {
    expect(proPlanStatusLine({ ...base, status: 'active', periodEnd: END, cancelAtPeriodEnd: true })).toBe('eduPlans.manage.ends|September 16, 2027');
  });

  it('Given a failed payment, Then that wins over the renewal date', () => {
    expect(proPlanStatusLine({ ...base, status: 'past_due', periodEnd: END })).toBe('eduPlans.manage.pastDue');
  });

  it('Given a Polar trial, Then it counts the days left', () => {
    expect(proPlanStatusLine({ ...base, status: 'trialing', trialExpires: '2026-11-24T00:00:00Z' })).toMatch(/^eduPlans\.manage\.trialing\|5\|/);
  });
});
