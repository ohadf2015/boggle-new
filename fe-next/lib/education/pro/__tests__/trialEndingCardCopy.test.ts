import { describe, it, expect } from 'vitest';
import {
  trialEndingLiveCopy,
  trialEndingEndedCopy,
  trialEndingNeverCopy,
  TRIAL_ENDING_COPY_LOCALES,
} from '../trialEndingCardCopy';
import { locales } from '@/i18n/config';

const END = '2026-11-21T10:00:00.000Z';

describe('trialEndingCardCopy', () => {
  it('covers every shipped locale', () => {
    for (const l of locales) expect(TRIAL_ENDING_COPY_LOCALES).toContain(l);
  });

  it('in a live access trial: days left, keep class reports for $9/mo, no second trial', () => {
    const en = trialEndingLiveCopy('en', 10, END);
    expect(en.title).toBe('Your trial ends in 10 days');
    expect(en.body).toBe('Keep class reports for $9/mo.');
    expect(en.cta).toBe('Keep Teacher Pro after your free trial');
    expect(en.note).toContain('$9');
    expect(en.cta + en.title + en.body).not.toMatch(/14-day/);
    expect(trialEndingLiveCopy('en', 1, END).title).toBe('Your trial ends today');
    expect(trialEndingLiveCopy('en', 2, END).title).toBe('Your trial ends tomorrow');
  });

  it('an ended access trial is straight $9/mo, with no trial wording', () => {
    const en = trialEndingEndedCopy('en');
    expect(en.title).toBe('Your free trial has ended, continue with Teacher Pro for $9/mo');
    expect(en.cta).toBe('Continue with Teacher Pro');
    expect(en.note).toContain('$9');
    expect(`${en.title} ${en.body} ${en.cta} ${en.note}`).not.toMatch(/14-day|Start your|free trial after/i);
  });

  it('never had a trial: the 14-day Teacher Pro trial', () => {
    const en = trialEndingNeverCopy('en');
    expect(en.cta).toContain('14-day');
    expect(en.note).toContain('$9');
  });

  it('fills every locale without leftover placeholders, and none of the in-trial strings offer a second trial', () => {
    for (const l of locales) {
      const live = trialEndingLiveCopy(l, 8, END);
      const ended = trialEndingEndedCopy(l);
      const never = trialEndingNeverCopy(l);
      for (const c of [live, ended, never]) {
        for (const v of Object.values(c)) {
          expect(v).not.toMatch(/\{\w+\}/);
          expect(v.trim().length).toBeGreaterThan(0);
        }
      }
      expect(live.cta + live.title + live.body).not.toMatch(/14/);
      expect(ended.cta + ended.title + ended.body + ended.note).not.toMatch(/14/);
      expect(never.cta).toMatch(/14/);
    }
  });
});
