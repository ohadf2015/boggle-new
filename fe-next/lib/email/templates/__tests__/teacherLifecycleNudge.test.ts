import { describe, it, expect } from 'vitest';
import { teacherLifecycleNudge } from '../teacherLifecycleNudge';
import { en } from '@/translations/en.js';
import { he } from '@/translations/he.js';
import { sv } from '@/translations/sv.js';
import { ja } from '@/translations/ja.js';
import { es } from '@/translations/es.js';
import { ru } from '@/translations/ru.js';

const LOCALES = { en, he, sv, ja, es, ru } as const;
const STAGES = ['share_code', 'start_live', 'second_game', 'reactivate'] as const;
const FIELDS = ['subject', 'lead', 'body', 'cta'] as const;

describe('teacherLifecycleNudge', () => {
  it.each(Object.keys(LOCALES))('Given locale %s, Then every stage has its own subject, lead, body and CTA (no English fallback)', (loc) => {
    const dict = (LOCALES as Record<string, Record<string, unknown>>)[loc].teacherLifecycleEmail as Record<string, Record<string, string>>;
    expect(dict).toBeTruthy();
    for (const stage of STAGES) {
      for (const f of FIELDS) {
        expect(typeof dict[stage]?.[f], `${loc}.${stage}.${f}`).toBe('string');
        if (loc !== 'en') expect(dict[stage][f], `${loc}.${stage}.${f} untranslated`).not.toBe((en as never as { teacherLifecycleEmail: Record<string, Record<string, string>> }).teacherLifecycleEmail[stage][f]);
      }
    }
    for (const k of ['greeting', 'ask', 'signoff']) expect(typeof (dict as unknown as Record<string, string>)[k]).toBe('string');
  });

  it('Given a Hebrew teacher, Then the email is right-to-left and links to the Hebrew dashboard', () => {
    const { html, subject } = teacherLifecycleNudge({ fullName: 'דנה', locale: 'he', stage: 'start_live' });
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('https://www.lexiclash.live/he/teacher"');
    expect(subject).toBe(he.teacherLifecycleEmail.start_live.subject);
    expect(html).toContain('דנה');
  });

  it('Given a reactivation, Then the CTA opens class creation; a name with markup is escaped', () => {
    const { html } = teacherLifecycleNudge({ fullName: '<b>Ada</b>', locale: 'en', stage: 'reactivate' });
    expect(html).toContain('/en/teacher/classroom/new');
    expect(html).not.toContain('<b>Ada</b>');
    expect(html).toContain('&lt;b&gt;Ada&lt;/b&gt;');
  });
});
