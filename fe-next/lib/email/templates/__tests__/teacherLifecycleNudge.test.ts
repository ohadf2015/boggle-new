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
    expect(html).toContain('https://www.lexiclash.live/he/teacher?utm_source=email&amp;utm_medium=lifecycle&amp;utm_campaign=edu_start_live"');
    expect(subject).toBe(he.teacherLifecycleEmail.start_live.subject);
    expect(html).toContain('דנה');
  });

  it('Given a reactivation, Then the CTA opens class creation; a name with markup is escaped', () => {
    const { html } = teacherLifecycleNudge({ fullName: '<b>Ada</b>', locale: 'en', stage: 'reactivate' });
    expect(html).toContain('/en/teacher/classroom/new');
    expect(html).not.toContain('<b>Ada</b>');
    expect(html).toContain('&lt;b&gt;Ada&lt;/b&gt;');
  });

  it('Given a share-code email with its class, Then it shows the code and the student link, and the button opens that class tagged for measurement', () => {
    const { html } = teacherLifecycleNudge({ fullName: 'Ada', locale: 'en', stage: 'share_code', classroom: { id: 'c 1', joinCode: 'KITE43', language: 'he' } });
    expect(html).toContain('KITE43');
    expect(html).toContain('https://www.lexiclash.live/he/join/KITE43');
    expect(html).toContain(en.teacherLifecycleEmail.codeLabel);
    expect(html).toContain('https://www.lexiclash.live/en/teacher/classroom/new?classroomId=c%201&amp;utm_source=email&amp;utm_medium=lifecycle&amp;utm_campaign=edu_share_code');
  });

  it('Given a start-live email with its class, Then the button opens that class, and no code box is added', () => {
    const { html } = teacherLifecycleNudge({ fullName: 'Ada', locale: 'en', stage: 'start_live', classroom: { id: 'c1', joinCode: 'KITE43', language: null } });
    expect(html).toContain('/en/teacher/classroom/new?classroomId=c1&amp;utm_source=email&amp;utm_medium=lifecycle&amp;utm_campaign=edu_start_live');
    expect(html).not.toContain(en.teacherLifecycleEmail.codeLabel);
  });

  it('Given a code with markup, Then it is escaped', () => {
    const { html } = teacherLifecycleNudge({ fullName: 'Ada', locale: 'en', stage: 'share_code', classroom: { id: 'c1', joinCode: '<x>', language: 'en' } });
    expect(html).not.toContain('<x>');
  });

  it.each(Object.keys(LOCALES))('Given locale %s, Then the code and link labels are translated', (loc) => {
    const dict = (LOCALES as Record<string, Record<string, unknown>>)[loc].teacherLifecycleEmail as Record<string, string>;
    for (const k of ['codeLabel', 'linkLabel']) {
      expect(typeof dict[k], `${loc}.${k}`).toBe('string');
      if (loc !== 'en') expect(dict[k]).not.toBe((en as never as { teacherLifecycleEmail: Record<string, string> }).teacherLifecycleEmail[k]);
    }
  });
});
