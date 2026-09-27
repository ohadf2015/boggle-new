/**
 * detectLocaleFromPath — extract locale from pathname or fallback to 'en'
 *
 * Used by error boundaries (including global-error.tsx) to preserve locale
 * through recovery navigation. Must support all 6 live locales.
 */
import { describe, it, expect } from 'vitest';
import { detectLocaleFromPath } from '../detectLocaleFromPath';

describe('detectLocaleFromPath', () => {
  it('detects all 6 supported locales', () => {
    expect(detectLocaleFromPath('/en/teacher')).toBe('en');
    expect(detectLocaleFromPath('/he/student')).toBe('he');
    expect(detectLocaleFromPath('/sv/multiplayer')).toBe('sv');
    expect(detectLocaleFromPath('/ja/leaderboard')).toBe('ja');
    expect(detectLocaleFromPath('/es/profile')).toBe('es');
    expect(detectLocaleFromPath('/ru/adventure')).toBe('ru');
  });

  it('fallbacks to en when no locale matches', () => {
    expect(detectLocaleFromPath('/multiplayer')).toBe('en');
    expect(detectLocaleFromPath('/xy/teacher')).toBe('en');
    expect(detectLocaleFromPath('')).toBe('en');
    expect(detectLocaleFromPath('/')).toBe('en');
  });

  it('ignores query params and hashes', () => {
    expect(detectLocaleFromPath('/ru/teacher?code=ABC')).toBe('ru');
    expect(detectLocaleFromPath('/he/student#section')).toBe('he');
    expect(detectLocaleFromPath('/ja/profile?x=1&y=2#top')).toBe('ja');
  });

  it('requires locale as first segment after slash', () => {
    expect(detectLocaleFromPath('/teacher/en')).toBe('en'); // 'en' in second position doesn't count
    expect(detectLocaleFromPath('/en/')).toBe('en');
    expect(detectLocaleFromPath('/en')).toBe('en');
  });
});
