import { describe, it, expect } from 'vitest';
import { trialEndedCopy, TRIAL_ENDED_LOCALES } from '../trialEndedCopy';

const TRIAL_WORDS = /14|trial\b|try|prueba gratis de|provperiod av|トライアルを始|пробный период Teacher/i;

describe('trialEndedCopy', () => {
  it('covers all six teacher locales', () => {
    expect(TRIAL_ENDED_LOCALES.sort()).toEqual(['en', 'es', 'he', 'ja', 'ru', 'sv']);
  });

  it('English: trial has ended, continue with Teacher Pro at $9/mo', () => {
    expect(trialEndedCopy('en')).toEqual({
      title: 'Your free trial has ended: continue with Teacher Pro',
      cta: 'Continue with Teacher Pro',
      note: '$9/mo · Cancel anytime',
      badge: 'Free trial ended',
    });
  });

  it('every locale: the $9 price, and the button never offers a trial', () => {
    for (const l of TRIAL_ENDED_LOCALES) {
      const c = trialEndedCopy(l);
      expect(c.note).toContain('$9');
      expect(c.cta).not.toMatch(TRIAL_WORDS);
      expect(c.note).not.toMatch(/14/);
    }
  });

  it('isolates the price in Hebrew and falls back to English', () => {
    expect(trialEndedCopy('he').note).toContain('\u2066$9\u2069');
    expect(trialEndedCopy('fr').cta).toBe('Continue with Teacher Pro');
  });
});
