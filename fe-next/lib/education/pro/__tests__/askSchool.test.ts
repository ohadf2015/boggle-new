import { describe, it, expect } from 'vitest';
import { sanitizeRequesterName, buildAskSchoolLink, readAskSchoolParams, buildMailtoHref } from '../askSchool';

describe('sanitizeRequesterName', () => {
  it('keeps an ordinary name, trimmed', () => {
    expect(sanitizeRequesterName('  Ms. Rivera ')).toBe('Ms. Rivera');
  });

  it('keeps non-latin names', () => {
    expect(sanitizeRequesterName('מורה דנה')).toBe('מורה דנה');
    expect(sanitizeRequesterName('佐藤先生')).toBe('佐藤先生');
  });

  it('caps the length at 60 characters', () => {
    expect(sanitizeRequesterName('a'.repeat(200))).toHaveLength(60);
  });

  it('refuses anything that looks like a link or markup', () => {
    expect(sanitizeRequesterName('Pay now at evil.com')).toBe('');
    expect(sanitizeRequesterName('https://x.y')).toBe('');
    expect(sanitizeRequesterName('www.example')).toBe('');
    expect(sanitizeRequesterName('<script>')).toBe('');
    expect(sanitizeRequesterName('me@school.org')).toBe('');
  });

  it('returns empty for non-strings and blanks', () => {
    expect(sanitizeRequesterName(undefined)).toBe('');
    expect(sanitizeRequesterName(null)).toBe('');
    expect(sanitizeRequesterName('   ')).toBe('');
  });
});

describe('buildAskSchoolLink', () => {
  it('points at the school tab of the upgrade page in the right locale', () => {
    const url = new URL(buildAskSchoolLink({ origin: 'https://www.lexiclash.live', locale: 'he', name: 'Dana' }));
    expect(url.pathname).toBe('/he/teacher/upgrade');
    expect(url.searchParams.get('plan')).toBe('school');
    expect(url.searchParams.get('for')).toBe('Dana');
  });

  it('drops the name when it does not survive sanitising', () => {
    const url = new URL(buildAskSchoolLink({ origin: 'https://www.lexiclash.live', locale: 'en', name: 'evil.com' }));
    expect(url.searchParams.has('for')).toBe(false);
  });
});

describe('readAskSchoolParams', () => {
  it('opens the school tab and returns the sanitised requester', () => {
    expect(readAskSchoolParams(new URLSearchParams('plan=school&for=Ms%20Rivera'))).toEqual({
      tab: 'school',
      requester: 'Ms Rivera',
    });
  });

  it('defaults to the teacher tab with no requester', () => {
    expect(readAskSchoolParams(new URLSearchParams(''))).toEqual({ tab: 'teacher', requester: '' });
    expect(readAskSchoolParams(new URLSearchParams('plan=school&for=x.com'))).toEqual({ tab: 'school', requester: '' });
  });
});

describe('buildMailtoHref', () => {
  it('encodes subject and body', () => {
    const href = buildMailtoHref('Teacher Pro & us', 'Line 1\nLine 2');
    expect(href.startsWith('mailto:?subject=')).toBe(true);
    expect(href).toContain('Teacher%20Pro%20%26%20us');
    expect(href).toContain('Line%201%0ALine%202');
  });
});
