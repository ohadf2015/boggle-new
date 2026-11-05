import { describe, it, expect } from 'vitest';
import { teacherTrialReminder } from '../teacherTrialReminder';
import { teacherTrialFeedback } from '../teacherTrialFeedback';

const ENDS = '2026-11-09T18:42:10Z';

describe('teacherTrialReminder', () => {
  it('no longer tells current teachers the module was broken in August', () => {
    for (const locale of ['en', 'he', 'sv'] as const) {
      for (const bucket of ['t-3', 't-0', 't+3'] as const) {
        const { html } = teacherTrialReminder({ full_name: 'Ada', locale, bucket, trialExpiresAt: ENDS });
        expect(html).not.toMatch(/August|21 באוגוסט|augusti/);
      }
    }
  });

  it('writes to a Swedish teacher in Swedish, with a feedback ask', () => {
    const { subject, html } = teacherTrialReminder({ full_name: 'lino bossio', locale: 'sv', bucket: 't-3', trialExpiresAt: ENDS });
    expect(subject).toBe('Din LexiClash-provperiod slutar 9 november');
    expect(html).toContain('Hej Lino,');
    expect(html).toContain('Svara bara på det här mejlet');
    expect(html).toContain('/sv/teacher/upgrade');
  });

  it('falls back to English for other locales', () => {
    const { html } = teacherTrialReminder({ full_name: 'Ada', locale: 'ja', bucket: 't-0', trialExpiresAt: ENDS });
    expect(html).toContain('Your free teacher access ends today.');
    expect(html).toContain('/en/teacher/upgrade');
  });

  it('escapes the teacher name', () => {
    const { html } = teacherTrialReminder({ full_name: '<b>x</b>', locale: 'en', bucket: 't-3', trialExpiresAt: ENDS });
    expect(html).not.toContain('<b>x</b>');
  });

  it('greets without a name when there is none', () => {
    const { html } = teacherTrialReminder({ full_name: '  ', locale: 'en', bucket: 't-3', trialExpiresAt: ENDS });
    expect(html).toContain('Hi there,');
  });
});

describe('teacherTrialFeedback', () => {
  it('asks how it is going and offers no upgrade', () => {
    const { subject, html } = teacherTrialFeedback({ full_name: 'Ada', locale: 'en', trialExpiresAt: ENDS });
    expect(subject).toBe('How is LexiClash going with your class?');
    expect(html).toContain('Just reply to this email');
    expect(html).toContain('November 9');
    expect(html).not.toContain('/teacher/upgrade');
    expect(html).not.toContain('$9');
  });

  it('is right-to-left in Hebrew', () => {
    const { html } = teacherTrialFeedback({ full_name: 'דנה', locale: 'he', trialExpiresAt: ENDS });
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('שלום דנה,');
  });
});
