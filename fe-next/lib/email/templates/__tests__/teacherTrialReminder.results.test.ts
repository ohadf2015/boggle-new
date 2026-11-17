import { describe, it, expect } from 'vitest';
import { teacherTrialReminder, TRIAL_REMINDER_CHECKOUT_SOURCE } from '../teacherTrialReminder';
import { isProOfferEntry } from '@/lib/education/pro/upgradeEntry';
import type { TeacherLocale } from '@/lib/education/types';

const LOCALES: TeacherLocale[] = ['en', 'he', 'sv', 'ja', 'es', 'ru'];
const results = { gamesRun: 3, students: 24, wordsFound: 412, topScore: 318, longestWord: 'GARDEN' };
const base = { full_name: 'Ada Lovelace', trialExpiresAt: '2026-11-20T00:00:00Z' };

describe('teacherTrialReminder: class results + one-tap $9/mo checkout', () => {
  it('the checkout link source opens the checkout on arrival (a Pro offer placement)', () => {
    expect(isProOfferEntry(TRIAL_REMINDER_CHECKOUT_SOURCE)).toBe(true);
  });

  for (const locale of LOCALES) {
    for (const bucket of ['t-3', 't-0', 't+3'] as const) {
      it(`${locale} ${bucket}: shows the class numbers, the longest word, and links to checkout`, () => {
        const { html } = teacherTrialReminder({ ...base, locale, bucket, results });
        expect(html).toContain('GARDEN');
        expect(html).toContain('318');
        expect(html).toContain('412');
        expect(html).toContain(`/${locale}/teacher/upgrade?source=${TRIAL_REMINDER_CHECKOUT_SOURCE}`);
      });
    }
  }

  it('in the free trial: "Keep Teacher Pro after your free trial"; after it ends: straight to $9/mo', () => {
    expect(teacherTrialReminder({ ...base, locale: 'en', bucket: 't-3', results }).html).toContain('Keep Teacher Pro after your free trial');
    expect(teacherTrialReminder({ ...base, locale: 'en', bucket: 't-0', results }).html).toContain('Keep Teacher Pro after your free trial');
    const ended = teacherTrialReminder({ ...base, locale: 'en', bucket: 't+3', results }).html;
    expect(ended).toContain('Get Teacher Pro for $9/mo');
    expect(ended).not.toContain('free trial');
    expect(ended).not.toMatch(/14-day/);
  });

  it('no class games on record: no results block, the email still goes out', () => {
    const { html } = teacherTrialReminder({ ...base, locale: 'en', bucket: 't-3', results: { ...results, gamesRun: 0 } });
    expect(html).not.toContain('Your class so far');
    expect(html).toContain('/en/teacher/upgrade');
  });
});
