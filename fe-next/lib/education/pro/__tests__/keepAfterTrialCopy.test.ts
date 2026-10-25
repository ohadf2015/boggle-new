import { describe, it, expect } from 'vitest';
import { keepAfterTrialCopy, accessTrialLive, KEEP_AFTER_TRIAL_LOCALES } from '../keepAfterTrialCopy';
import { locales } from '@/i18n/config';

const END = '2026-11-07T16:57:09.000Z';

describe('keepAfterTrialCopy', () => {
  it('covers every shipped locale', () => {
    for (const l of locales) expect(KEEP_AFTER_TRIAL_LOCALES).toContain(l);
  });

  it('says $9/mo starts at trial end, with the date, and cancel anytime, in every locale', () => {
    for (const l of locales) {
      const c = keepAfterTrialCopy(l, END);
      for (const v of Object.values(c)) {
        expect(v).not.toMatch(/\{\w+\}/);
        expect(v.trim().length).toBeGreaterThan(0);
      }
      expect(c.note).toContain('$9');
      expect(c.note).not.toMatch(/14/);
    }
    expect(keepAfterTrialCopy('en', END).note).toBe('$9/mo starts when your trial ends (Nov 7) · Cancel anytime');
  });

  it('isolates the price and date inside Hebrew', () => {
    expect(keepAfterTrialCopy('he', END).note).toContain('\u2066$9\u2069');
  });

  it('accessTrialLive only for a future end', () => {
    expect(accessTrialLive(null)).toBe(false);
    expect(accessTrialLive('bad')).toBe(false);
    expect(accessTrialLive(END, Date.parse(END) - 1)).toBe(true);
    expect(accessTrialLive(END, Date.parse(END))).toBe(false);
  });
});
