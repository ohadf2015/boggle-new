import { describe, it, expect } from 'vitest';
import { teacherActivationNudge } from '../teacherActivationNudge';
import type { TeacherLocale } from '@/lib/education/types';
import { en } from '../../../../translations/en.js';
import { he } from '../../../../translations/he.js';
import { sv } from '../../../../translations/sv.js';
import { ja } from '../../../../translations/ja.js';
import { es } from '../../../../translations/es.js';
import { ru } from '../../../../translations/ru.js';

const LOBBY_LABEL: Record<TeacherLocale, string> = Object.fromEntries(
  Object.entries({ en, he, sv, ja, es, ru }).map(([k, dict]) => [
    k,
    (dict as { education: { projectorLobby: { practiceFirst: string } } }).education.projectorLobby.practiceFirst,
  ]),
) as Record<TeacherLocale, string>;

const LOCALES: TeacherLocale[] = ['en', 'he', 'sv', 'ja', 'es', 'ru'];

describe('teacherActivationNudge', () => {
  it.each(LOCALES)('links %s teachers straight into class setup for every bucket', (locale) => {
    for (const bucket of ['d1', 'd3', 'd7'] as const) {
      const { subject, html } = teacherActivationNudge({ full_name: 'Ada', locale, bucket });
      expect(subject.length).toBeGreaterThan(0);
      expect(html).toContain(`https://www.lexiclash.live/${locale}/teacher/classroom/new`);
      expect(html).toContain('Ada');
      expect(html).not.toContain('/teacher/upgrade');
    }
  });

  it('gives each bucket its own subject', () => {
    const subjects = (['d1', 'd3', 'd7'] as const).map(
      (bucket) => teacherActivationNudge({ full_name: 'Ada', locale: 'en', bucket }).subject,
    );
    expect(new Set(subjects).size).toBe(3);
  });

  it.each(LOCALES)('day 3 points %s teachers at the 3-bot practice in their language', (locale) => {
    const { html } = teacherActivationNudge({ full_name: 'Ada', locale, bucket: 'd3' });
    expect(html).toMatch(/3/);
    const d1 = teacherActivationNudge({ full_name: 'Ada', locale, bucket: 'd1' }).html;
    expect(d1).not.toMatch(/\b3\b/);
  });

  it.each(LOCALES)('day 3 quotes the %s lobby button label exactly as the app shows it', (locale) => {
    const { html } = teacherActivationNudge({ full_name: 'Ada', locale, bucket: 'd3' });
    expect(LOBBY_LABEL[locale]).toBeTruthy();
    expect(html).toContain(LOBBY_LABEL[locale]);
  });

  it('renders Hebrew right-to-left', () => {
    const { html } = teacherActivationNudge({ full_name: 'מורה', locale: 'he', bucket: 'd1' });
    expect(html).toContain('dir="rtl"');
    expect(html).not.toContain('Create my first class');
  });

  it('escapes a hostile display name', () => {
    const { html } = teacherActivationNudge({ full_name: '<script>alert(1)</script>', locale: 'en', bucket: 'd7' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
