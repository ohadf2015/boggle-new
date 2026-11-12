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

  it('writes to a Japanese teacher in Japanese, linking the Japanese site', () => {
    const { html } = teacherTrialReminder({ full_name: 'Ada', locale: 'ja', bucket: 't-0', trialExpiresAt: ENDS });
    expect(html).toContain('lang="ja"');
    expect(html).toContain('先生向けの無料アクセスは本日で終了します。');
    expect(html).toContain('/ja/teacher/upgrade');
  });

  it('falls back to English for a locale it does not know', () => {
    const locale = 'fr' as unknown as 'en';
    const { html } = teacherTrialReminder({ full_name: 'Ada', locale, bucket: 't-0', trialExpiresAt: ENDS });
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

describe('trial emails on the neo layout', () => {
  const NEO = (html: string) => {
    expect(html).toMatch(/border-(right|left)-width:6px/);
    expect(html).not.toMatch(/undefined|\[object|NaN/);
  };

  it.each(['en', 'he', 'sv'] as const)('reminder %s shows the hourglass and a hard-shadow button', (locale) => {
    for (const bucket of ['t-3', 't-0', 't+3'] as const) {
      const { html } = teacherTrialReminder({ full_name: 'Ada', locale, bucket, trialExpiresAt: ENDS });
      expect(html).toContain('/email/art/hourglass.png');
      NEO(html);
      if (locale === 'he') expect(html).toContain('dir="rtl"');
    }
  });

  it('reminder keeps the price, the upgrade link and the classroom link', () => {
    const { html } = teacherTrialReminder({ full_name: 'Ada', locale: 'en', bucket: 't-0', trialExpiresAt: ENDS });
    expect(html).toContain('$9');
    expect(html).toContain('/en/teacher/upgrade');
    expect(html).toMatch(/\/en\/teacher\?utm/);
  });

  it.each(['en', 'he', 'sv'] as const)('feedback %s uses the neo layout with no upgrade link', (locale) => {
    const { html } = teacherTrialFeedback({ full_name: 'Ada', locale, trialExpiresAt: ENDS });
    expect(html).toMatch(/\/email\/art\/[a-z-]+\.png/);
    expect(html).not.toContain('/teacher/upgrade');
    NEO(html);
  });

  it('copy avoids em-dashes', () => {
    for (const locale of ['en', 'he', 'sv'] as const) {
      expect(teacherTrialFeedback({ full_name: 'Ada', locale, trialExpiresAt: ENDS }).html).not.toContain('—');
      for (const bucket of ['t-3', 't-0', 't+3'] as const) {
        expect(teacherTrialReminder({ full_name: 'Ada', locale, bucket, trialExpiresAt: ENDS }).html).not.toContain('—');
      }
    }
  });
});
