import { describe, it, expect } from 'vitest';
import { educationBackHref, educationHomeFor } from '../educationBackHref';
import { parentRoute } from '../parentRoute';

describe('educationHomeFor', () => {
  it('sends each role to the hub the /education landing would replace() them to', () => {
    expect(educationHomeFor('en', 'teacher')).toBe('/en/teacher');
    expect(educationHomeFor('he', 'student')).toBe('/he/student');
    expect(educationHomeFor('es', null)).toBe('/es/education');
  });
});

describe('educationBackHref', () => {
  it('classroom-game back reaches the teacher hub, not the landing that bounces back to classroom-game', () => {
    expect(educationBackHref({ pathname: '/en/education/classroom-game', locale: 'en', role: 'teacher' })).toBe('/en/teacher');
  });

  it('a signed-out visitor on classroom-game goes to the public landing (no redirect there)', () => {
    expect(educationBackHref({ pathname: '/en/education/classroom-game', locale: 'en', role: null })).toBe('/en/education');
  });

  it.each([
    '/en/student/profile',
    '/en/student/lessons/123e4567-e89b-12d3-a456-426614174000',
    '/en/student/achievements',
  ])('%s goes back to the student hub, not the marketing landing', (pathname) => {
    expect(educationBackHref({ pathname, locale: 'en', role: null })).toBe('/en/student');
    expect(educationBackHref({ pathname, locale: 'en', role: 'student' })).toBe('/en/student');
  });

  it('/student/join never points at /student (anonymous users are pushed straight back to join)', () => {
    expect(educationBackHref({ pathname: '/en/student/join', locale: 'en', role: null })).toBe('/en/education');
  });

  it.each([
    '/en/teacher/classroom',
    '/en/teacher/reports',
    '/en/teacher/curriculum',
    '/en/teacher/upgrade',
    '/en/teacher/profile',
  ])('%s goes back to the teacher hub', (pathname) => {
    expect(educationBackHref({ pathname, locale: 'en', role: 'teacher' })).toBe('/en/teacher');
  });

  it('classroom analytics agrees with parentRoute: Teacher HQ (no page exists at /teacher/classroom/[id])', () => {
    const pathname = '/en/teacher/classroom/abc123/analytics';
    expect(educationBackHref({ pathname, locale: 'en', role: 'teacher' })).toBe(parentRoute(pathname));
    expect(parentRoute(pathname)).toBe('/en/teacher');
  });

  it('other education pages fall back to the viewer-appropriate education home', () => {
    expect(educationBackHref({ pathname: '/en/education/duels/abc', locale: 'en', role: null })).toBe('/en/education');
    expect(educationBackHref({ pathname: '/en/education/duels/abc', locale: 'en', role: 'teacher' })).toBe('/en/teacher');
    expect(educationBackHref({ pathname: '/en/education/duels/abc', locale: 'en', role: 'student' })).toBe('/en/student');
  });

  it('keeps the locale and ignores query strings', () => {
    expect(educationBackHref({ pathname: '/he/student/profile?tab=x', locale: 'he', role: null })).toBe('/he/student');
  });

  it('never resolves to the bare app home', () => {
    for (const role of ['teacher', 'student', null] as const) {
      for (const p of ['/en/education', '/en/teacher', '/en/student', '/en/join/ABC', '', '/en']) {
        const dest = educationBackHref({ pathname: p, locale: 'en', role });
        expect(dest === '/en' || dest === '/').toBe(false);
      }
    }
  });
});
