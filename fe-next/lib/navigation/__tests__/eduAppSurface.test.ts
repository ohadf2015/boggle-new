import { describe, it, expect } from 'vitest';
import { isEduAppSurface, isPlanPage } from '@/lib/navigation/eduAppSurface';

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
  ])('hides on %s', (path) => {
    expect(isEduAppSurface(path)).toBe(true);
  });

  it.each([
    '/en',
    '/en/multiplayer',
    '/en/education/esl-word-games',
    '/en/education/vocabulary-games-classroom',
    '/en/teacher-appreciation',
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

describe('isPlanPage — pages whose own legal links replace the fixed site footer', () => {
  it.each(['/en/teacher/upgrade', '/en/pricing', '/he/pricing?plan=school'])('drops the site footer on %s', (path) => {
    expect(isPlanPage(path)).toBe(true);
  });

  it.each(['/en/student', '/en/teacher', '/en/teacher/reports', '/en/education', '/en/join', '/en'])('keeps the site footer on %s', (path) => {
    expect(isPlanPage(path)).toBe(false);
  });
});
