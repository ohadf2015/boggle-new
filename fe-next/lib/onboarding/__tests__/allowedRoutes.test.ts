import { describe, it, expect } from 'vitest';
import { isOnboardingAllowedRoute, isLandingRoute } from '../allowedRoutes';

describe('isOnboardingAllowedRoute', () => {
  describe('allows locale homepage', () => {
    it.each([
      '/',
      '/en',
      '/en/',
      '/he',
      '/he/',
      '/sv',
      '/ja',
      '/es',
    ])('returns true for %s', (path) => {
      expect(isOnboardingAllowedRoute(path)).toBe(true);
    });

    it('ignores query string', () => {
      expect(isOnboardingAllowedRoute('/en?utm_source=share')).toBe(true);
    });

    it('ignores hash', () => {
      expect(isOnboardingAllowedRoute('/he#anchor')).toBe(true);
    });
  });

  describe('rejects blog and SEO routes', () => {
    it.each([
      '/en/blog/best-boggle-alternatives-2026',
      '/en/blog/boggle-vs-scrabble',
      '/en/blog/boggle-vs-wordle',
      '/he/blog/foo',
      '/en/word-of-the-day',
      '/en/best-online-word-games',
      '/en/brain-training-word-games',
      '/en/play-boggle-online-free',
      '/he/multiplayer',
      '/en/multiplayer',
      '/sv/legal',
      '/en/how-to-play',
      '/en/community',
      '/en/practice',
      '/ja/daily',
    ])('returns false for %s', (path) => {
      expect(isOnboardingAllowedRoute(path)).toBe(false);
    });
  });

  describe('rejects malformed input', () => {
    it.each([
      [null, 'null'],
      [undefined, 'undefined'],
      ['', 'empty string'],
    ])('returns false for %s (%s)', (value) => {
      expect(isOnboardingAllowedRoute(value)).toBe(false);
    });

    it('rejects path without locale prefix', () => {
      expect(isOnboardingAllowedRoute('/foo')).toBe(false);
    });

    it('rejects unsupported locale', () => {
      expect(isOnboardingAllowedRoute('/de')).toBe(false);
    });
  });
});

describe('isLandingRoute', () => {
  it.each(['/', '/en', '/en/', '/he', '/sv', '/ja', '/es'])(
    'returns true for the marketing landing route %s',
    (path) => {
      expect(isLandingRoute(path)).toBe(true);
    },
  );

  it.each([
    '/en/3d-test',
    '/en/practice',
    '/en/multiplayer',
    '/he/daily',
    '/en/blog/boggle-vs-wordle',
  ])('returns false for the in-app/content route %s (popup allowed there)', (path) => {
    expect(isLandingRoute(path)).toBe(false);
  });

  it.each([null, undefined, ''])('returns false for malformed input %s', (value) => {
    expect(isLandingRoute(value)).toBe(false);
  });
});
