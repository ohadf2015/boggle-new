/**
 * parentRoute — compute the URL-hierarchy parent of a (resolved) pathname.
 * "Back one level" = drop one path segment, locale-aware, with overrides for
 * routes whose URL parent has no page of its own.
 */
import { describe, it, expect } from 'vitest';
import { parentRoute } from '../parentRoute';

describe('parentRoute', () => {
  it('returns home for a localized top-level section', () => {
    // GIVEN a top-level section under a locale
    // WHEN computing its parent
    // THEN it is the localized home
    expect(parentRoute('/en/daily')).toBe('/en');
    expect(parentRoute('/he/settings')).toBe('/he');
  });

  it('drops exactly one segment for nested routes', () => {
    expect(parentRoute('/en/daily/archive')).toBe('/en/daily');
    expect(parentRoute('/en/daily/archive/2026-01-01')).toBe('/en/daily/archive');
    expect(parentRoute('/sv/legal/terms')).toBe('/sv/legal');
  });

  it('preserves the locale segment', () => {
    expect(parentRoute('/ja/words/apple')).toBe('/ja/words');
    expect(parentRoute('/es/education/duels')).toBe('/es/education');
  });

  it('recognises every supported locale, incl. ru (was dropped by a hardcoded 5-list)', () => {
    expect(parentRoute('/ru/settings')).toBe('/ru');
    expect(parentRoute('/ru/daily/archive')).toBe('/ru/daily');
    expect(parentRoute('/ru')).toBe('/ru');
  });

  it('returns the localized home (a no-op) when already at home', () => {
    expect(parentRoute('/en')).toBe('/en');
    expect(parentRoute('/he/')).toBe('/he');
  });

  it('tolerates trailing slashes', () => {
    expect(parentRoute('/en/daily/archive/')).toBe('/en/daily');
  });

  it('drops exactly one segment when no override matches', () => {
    // The party mode was removed, so its PARENT_OVERRIDES entry is gone; these
    // deep routes now fall through to the default "drop one segment" rule.
    // (The override mechanism itself is still exercised by the source when a
    // future PARENT_OVERRIDES entry is added.)
    expect(parentRoute('/en/party/abc123/host')).toBe('/en/party/abc123');
    expect(parentRoute('/he/party/xyz/play')).toBe('/he/party/xyz');
  });

  it('handles non-locale roots (e.g. party-screen)', () => {
    expect(parentRoute('/party-screen/room42')).toBe('/party-screen');
    expect(parentRoute('/party-screen')).toBe('/');
  });

  it('handles the bare root', () => {
    expect(parentRoute('/')).toBe('/');
    expect(parentRoute('')).toBe('/');
  });

  describe('education route PARENT_OVERRIDES', () => {
    it('sends top-level /teacher to /education, not home', () => {
      expect(parentRoute('/en/teacher')).toBe('/en/education');
      expect(parentRoute('/he/teacher')).toBe('/he/education');
      expect(parentRoute('/ru/teacher')).toBe('/ru/education');
    });

    it('sends top-level /student to /education, not home', () => {
      expect(parentRoute('/en/student')).toBe('/en/education');
      expect(parentRoute('/sv/student')).toBe('/sv/education');
    });

    it('sends top-level /join to /education, not home', () => {
      expect(parentRoute('/en/join')).toBe('/en/education');
      expect(parentRoute('/ja/join')).toBe('/ja/education');
    });

    it('sends top-level /classroom to /education, not home', () => {
      expect(parentRoute('/en/classroom')).toBe('/en/education');
      expect(parentRoute('/es/classroom')).toBe('/es/education');
    });

    it('does NOT override nested education routes — they follow normal parent rules', () => {
      // /en/teacher/classroom → /en/teacher (drop one segment)
      // /en/teacher/classroom/abc/analytics → /en/teacher/classroom/abc (drop one segment)
      // Not affected by override, follows default "drop one segment" rule
      expect(parentRoute('/en/teacher/classroom')).toBe('/en/teacher');
      expect(parentRoute('/en/teacher/classroom/abc/analytics')).toBe('/en/teacher/classroom/abc');
      expect(parentRoute('/en/student/join')).toBe('/en/student');
    });
  });
});
