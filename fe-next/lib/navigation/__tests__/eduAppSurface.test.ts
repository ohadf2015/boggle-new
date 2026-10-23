import { describe, it, expect } from 'vitest';
import { hidesSiteFooter, isEduAppSurface, isPlanPage } from '@/lib/navigation/eduAppSurface';

describe('isEduAppSurface — where player chrome (bottom nav, floating widgets) stays off', () => {
  it.each([
    '/en/teacher',
    '/he/teacher/upgrade',
    '/en/teacher/classroom/abc/analytics',
    '/en/student',
    '/ja/student/lessons',
    '/en/join',
    '/join/ABC123',
    '/en/pricing',
    '/he/pricing',
    '/en/education',
    '/en/education/access',
    '/en/education/live',
    '/en/education/classroom-game',
    '/sv/education/lists',
    '/teacher',
    '/en/education/duels',
    '/he/education/duels/abc123',
    '/en/education/help',
    '/es/education/help/getting-started',
    '/en/education/esl-word-games',
    '/es/education/vocabulary-games-classroom',
    '/he/education/brain-breaks-word-games',
  ])('hides on %s', (path) => {
    expect(isEduAppSurface(path)).toBe(true);
  });

  it.each([
    '/en',
    '/en/multiplayer',
    '/en/teacher-appreciation',
    '/en/educational',
    '/en/pricing-tips',
    '/en/daily',
    '',
  ])('leaves player chrome on %s', (path) => {
    expect(isEduAppSurface(path)).toBe(false);
  });

  it('ignores the query string', () => {
    expect(isEduAppSurface('/en/pricing?plan=school')).toBe(true);
  });
});

describe('isPlanPage', () => {
  it('is the site-footer gate under its old name', () => {
    expect(isPlanPage).toBe(hidesSiteFooter);
  });
});
