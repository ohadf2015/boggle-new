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

  it('returns the localized home (a no-op) when already at home', () => {
    expect(parentRoute('/en')).toBe('/en');
    expect(parentRoute('/he/')).toBe('/he');
  });

  it('tolerates trailing slashes', () => {
    expect(parentRoute('/en/daily/archive/')).toBe('/en/daily');
  });

  it('applies overrides where the URL parent has no page', () => {
    // /party/<id>/host and /play have no /party/<id> page → back goes to /party
    expect(parentRoute('/en/party/abc123/host')).toBe('/en/party');
    expect(parentRoute('/he/party/xyz/play')).toBe('/he/party');
  });

  it('handles non-locale roots (e.g. party-screen)', () => {
    expect(parentRoute('/party-screen/room42')).toBe('/party-screen');
    expect(parentRoute('/party-screen')).toBe('/');
  });

  it('handles the bare root', () => {
    expect(parentRoute('/')).toBe('/');
    expect(parentRoute('')).toBe('/');
  });
});
