/**
 * The install/push prompts are chrome everywhere in the app and an obstacle on
 * exactly two kinds of surface: a teacher's one-screen dashboard, and anything
 * that is being projected in front of a class. `PWAInstallPrompt` docks at
 * `fixed bottom-4 z-[100]` and `PushNotificationPrompt` at `fixed z-50` —
 * both land on top of `TeacherLiveControls`' docked strip (`z-[70]`), which is
 * where START GAME lives.
 */
import { describe, it, expect } from 'vitest';
import { isQuietChromeSurface } from '../quietChromeRoutes';

describe('isQuietChromeSurface', () => {
  it.each([
    '/teacher',
    '/en/teacher',
    '/he/teacher/reports',
    '/ja/teacher/classroom/abc/analytics',
    '/student',
    '/es/student/achievements',
    '/sv/student/lessons/42',
    '/education/classroom-game',
    '/ru/education/classroom-game',
    '/multiplayer',
    '/en/multiplayer',
  ])('silences the install stack on %s', (path) => {
    expect(isQuietChromeSurface(path)).toBe(true);
  });

  it.each([
    '/',
    '/en',
    '/en/education',
    '/en/education/duels',
    '/he/play',
    '/en/teachers-lounge',
    '/en/students-union',
    '/en/multiplayer-tips',
  ])('leaves the rest of the app alone on %s', (path) => {
    expect(isQuietChromeSurface(path)).toBe(false);
  });

  it('matches on whole segments, never on a prefix', () => {
    // `startsWith('/teacher')` would claim this and strip its chrome.
    expect(isQuietChromeSurface('/en/teacher-appreciation')).toBe(false);
  });

  it('answers false for a missing pathname rather than throwing', () => {
    expect(isQuietChromeSurface(null)).toBe(false);
    expect(isQuietChromeSurface(undefined)).toBe(false);
  });
});
