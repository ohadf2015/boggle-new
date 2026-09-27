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
    '/en/singleplayer',
    '/en/blast',
    '/en/brain',
    '/en/adventure',
    '/en/profile',
    '/en/settings',
    '/en/quests',
    '/en/leaderboard',
    // Blog/editorial content is explicitly NOT a marketing landing — popup allowed.
    '/en/blog/boggle-vs-wordle',
  ])('returns false for the in-app/content route %s (popup allowed there)', (path) => {
    expect(isLandingRoute(path)).toBe(false);
  });

  describe('marketing / SEO landing doorways (popup suppressed)', () => {
    it.each([
      // Education SEO section — the reported case (full-screen popup buried the
      // /education/esl-word-games hero on a search-visitor doorway).
      '/en/education',
      '/en/education/esl-word-games',
      '/en/education/for-schools',
      '/en/education/duels',
      '/he/education',
      // Info / content doorways
      '/en/about',
      '/en/faq',
      '/en/how-to-play',
      '/en/rules',
      '/en/glossary',
      '/en/guides',
      '/en/contact',
      '/en/legal',
      '/en/accessibility',
      '/en/editorial-policy',
      // Word-game SEO doorways
      '/en/best-online-word-games',
      '/en/play-boggle-online-free',
      '/en/word-games-online-free',
      '/en/brain-training-word-games',
      '/en/competitive-word-games',
      '/en/multiplayer-word-game-online',
      '/en/online-word-games-with-friends',
      '/en/words-with-friends-alternative',
      '/en/free-multiplayer-word-game',
      '/en/scrabble-alternative-online',
      // Locale-specific landings
      '/he/hebrew-multiplayer-word-game',
      '/sv/swedish-multiplayer-word-game',
      '/es/juego-de-palabras-multijugador',
      // Competitor comparison landings
      '/en/lexiclash-vs-scrabble',
      '/en/lexiclash-vs-wordle',
      '/en/lexiclash-vs-quizlet',
      '/he/lexiclash-neged-wordle',
    ])('returns true for %s', (path) => {
      expect(isLandingRoute(path)).toBe(true);
    });

    it('does not match a non-landing route that merely shares a prefix', () => {
      // '/aboutus' must not be swallowed by the '/about' prefix.
      expect(isLandingRoute('/en/aboutus')).toBe(false);
    });
  });

  it.each([null, undefined, ''])('returns false for malformed input %s', (value) => {
    expect(isLandingRoute(value)).toBe(false);
  });
});
