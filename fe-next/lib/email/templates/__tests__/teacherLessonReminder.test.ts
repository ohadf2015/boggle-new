import { describe, expect, it } from 'vitest';
import { teacherLessonReminder, lessonReminderGameUrl } from '../teacherLessonReminder';
import { teacherEmailUrl } from '../teacherEmailLayout';
import { SESSION_TEMPLATES, sessionHostHref, sessionMinutes, sessionPackThemes } from '@/lib/education/sessionTemplates';
import { themedPackCode } from '@/lib/education/themedPacks';

const LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;
const BASE = {
  fullName: 'ada lovelace',
  className: '7B English',
  joinCode: 'QX7K2M',
  classroomId: 'c-1',
  boardLanguage: null,
  lessonAt: '2026-11-12T07:00:00Z',
  timezone: 'Asia/Jerusalem',
};

describe('teacherLessonReminder', () => {
  it('given an English teacher, when rendered, then greets by first name and names the class and time', () => {
    const { subject, html } = teacherLessonReminder({ ...BASE, locale: 'en' });
    expect(subject).toContain('7B English');
    expect(html).toContain('Hi Ada,');
    expect(html).toContain('7B English starts Thursday 9:00');
    expect(html).toContain('5-minute warm-up is ready');
  });

  it('given a join code, when rendered, then shows it left-to-right for the board', () => {
    const { html } = teacherLessonReminder({ ...BASE, locale: 'he' });
    expect(html).toMatch(/<p[^>]*dir="ltr"[^>]*>QX7K2M<\/p>/);
  });

  it('given a class, when rendered, then the main button opens the warm-up lobby for that class with the session template params', () => {
    const { html } = teacherLessonReminder({ ...BASE, locale: 'en' });
    const warmUp = SESSION_TEMPLATES.find((s) => s.id === 'warm-up')!;
    const params = Object.fromEntries(new URLSearchParams(sessionHostHref('en', warmUp, null, 'c-1').split('?')[1]));
    const expected = teacherEmailUrl('en', '/education/classroom-game', 'lesson_reminder', params);
    expect(lessonReminderGameUrl('en', 'c-1')).toBe(expected);
    expect(html).toContain(`href="${expected}"`);
    expect(expected).toContain('/en/education/classroom-game?');
    expect(expected).not.toContain('/en/en/');
    expect(expected).toContain('classroomId=c-1');
    expect(expected).toContain('session=warm-up');
  });

  it('given a class, when rendered, then the quiet link opens Teacher Home', () => {
    const { html } = teacherLessonReminder({ ...BASE, locale: 'sv' });
    expect(html).toContain(teacherEmailUrl('sv', '/teacher', 'lesson_reminder'));
  });

  it.each(LOCALES)('given %s, when rendered, then copy is native, not English', (locale) => {
    const { subject, html } = teacherLessonReminder({ ...BASE, locale });
    expect(subject.length).toBeGreaterThan(5);
    expect(html).toContain(`lang="${locale}"`);
    if (locale !== 'en') {
      expect(html).not.toContain('Open the game');
      expect(html).not.toContain('warm-up is ready');
    }
  });

  it('given Hebrew, when rendered, then the email is right-to-left', () => {
    const { html } = teacherLessonReminder({ ...BASE, locale: 'he' });
    expect(html).toContain('<html dir="rtl" lang="he">');
  });

  it('given a class name with markup, when rendered, then it is escaped', () => {
    const { html } = teacherLessonReminder({ ...BASE, className: '<b>7B</b>', locale: 'en' });
    expect(html).not.toContain('<b>7B</b>');
    expect(html).toContain('&lt;b&gt;7B&lt;/b&gt;');
  });

  it('given a missing name and a bad timezone, when rendered, then still renders a greeting and a UTC time', () => {
    const { html } = teacherLessonReminder({ ...BASE, fullName: '', timezone: 'Nope/Zone', locale: 'en' });
    expect(html).toContain('Hi there,');
    expect(html).toContain('Thursday 7:00');
  });

  it('given the warm-up template, then it still runs the 5 minutes the email promises', () => {
    expect(sessionMinutes(SESSION_TEMPLATES.find((s) => s.id === 'warm-up')!)).toBe(5);
  });

  it('given the class board language, when building the game link, then it carries the same seasonal list the session card would', () => {
    const warmUp = SESSION_TEMPLATES.find((s) => s.id === 'warm-up')!;
    const now = new Date('2026-11-12T07:00:00Z');
    const theme = sessionPackThemes(warmUp, 'en', now)[0];
    const url = new URL(lessonReminderGameUrl('he', 'c-1', 'en', now));
    expect(theme).toBeTruthy();
    expect(url.searchParams.get('pack')).toBe(themedPackCode('en', theme));
    expect(url.pathname).toBe('/he/education/classroom-game');
  });

  it('given an unknown board language, when building the game link, then it opens the warm-up without a list', () => {
    expect(new URL(lessonReminderGameUrl('en', 'c-1', 'xx')).searchParams.get('pack')).toBeNull();
  });

  it('given Russian with a Tuesday lesson and a class named in the nominative, when rendered, then no preposition bends the weekday or the name', () => {
    const { subject, html } = teacherLessonReminder({ ...BASE, className: 'Класс 5А', lessonAt: '2026-11-17T07:00:00Z', locale: 'ru' });
    const text = `${subject} ${html}`;
    expect(text).toContain('вторник');
    expect(text).not.toMatch(/ в вторник| во вторник/);
    expect(text).not.toMatch(/(с|для|в) Класс 5А/);
  });

  it('given Swedish, when rendered, then the weekday is not glued to a bare verb', () => {
    const { html } = teacherLessonReminder({ ...BASE, locale: 'sv' });
    expect(html).not.toMatch(/börjar torsdag/);
  });
});
