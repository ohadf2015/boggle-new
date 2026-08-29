/**
 * buildDeepLinkRoute — pure route resolution for incoming deep links.
 *
 * The native app is a WebView pointed at https://www.lexiclash.live (see
 * capacitor.config.ts `server.url`), so an App Link opens the app but the
 * WebView still loads the site ROOT — the path only survives if this function
 * turns it into a route we navigate to.
 *
 * The shape that broke: every real shared web URL already carries a locale
 * (`https://www.lexiclash.live/en/daily`). Prefixing the app's current locale
 * onto that produced `/en/en/daily`, which is a hard 404 on the site, so every
 * shared link bounced the user to the home page.
 */
import { buildDeepLinkRoute } from '../DeepLinkHandler';

describe('buildDeepLinkRoute', () => {
  describe('https App Links (the shape real shared links have)', () => {
    it('does not double-prefix a path that already carries a locale', () => {
      expect(buildDeepLinkRoute('https://www.lexiclash.live/en/daily', 'en')?.route).toBe('/en/daily');
    });

    it('honours the locale in the link over the locale the app is showing', () => {
      // A Hebrew player shares /he/daily with an English player: the link wins,
      // otherwise the shared board opens in the wrong language.
      expect(buildDeepLinkRoute('https://www.lexiclash.live/he/daily', 'en')?.route).toBe('/he/daily');
    });

    it('adds the ambient locale when the link has no locale segment', () => {
      expect(buildDeepLinkRoute('https://www.lexiclash.live/join/ABC123', 'he')?.route).toBe('/he/join/ABC123');
    });

    it('keeps deep multi-segment paths intact', () => {
      expect(buildDeepLinkRoute('https://www.lexiclash.live/en/multiplayer/room/xyz', 'en')?.route)
        .toBe('/en/multiplayer/room/xyz');
    });

    it('preserves query params other than locale/from_app', () => {
      expect(buildDeepLinkRoute('https://www.lexiclash.live/en/join?code=ABC&from_app=1', 'en')?.route)
        .toBe('/en/join?code=ABC');
    });

    it('lets an explicit ?locale= override the path locale', () => {
      expect(buildDeepLinkRoute('https://www.lexiclash.live/en/daily?locale=ja', 'en')?.route).toBe('/ja/daily');
    });

    it('routes a bare origin to the locale home', () => {
      expect(buildDeepLinkRoute('https://www.lexiclash.live/', 'en')?.route).toBe('/en');
    });

    it('routes a locale-only link to that locale home without a trailing slash', () => {
      expect(buildDeepLinkRoute('https://www.lexiclash.live/he', 'en')?.route).toBe('/he');
    });
  });

  describe('custom scheme links', () => {
    it('treats the hostname as the first path segment', () => {
      expect(buildDeepLinkRoute('lexiclash://daily', 'en')?.route).toBe('/en/daily');
    });

    it('strips a locale that arrives as the custom-scheme host', () => {
      expect(buildDeepLinkRoute('lexiclash://he/daily', 'en')?.route).toBe('/he/daily');
    });

    it('handles host + path', () => {
      expect(buildDeepLinkRoute('lexiclash://multiplayer/room/test-room', 'en')?.route)
        .toBe('/en/multiplayer/room/test-room');
    });
  });

  describe('auth callbacks', () => {
    it('flags a locale-less auth callback', () => {
      const result = buildDeepLinkRoute('https://www.lexiclash.live/auth/callback?code=xyz', 'en');
      expect(result?.isAuthCallback).toBe(true);
      expect(result?.route).toBe('/en/auth/callback?code=xyz');
    });

    it('flags a locale-prefixed auth callback and does not double-prefix it', () => {
      const result = buildDeepLinkRoute('https://www.lexiclash.live/en/auth/callback?code=xyz', 'en');
      expect(result?.isAuthCallback).toBe(true);
      expect(result?.route).toBe('/en/auth/callback?code=xyz');
    });

    it('flags a custom-scheme auth callback', () => {
      const result = buildDeepLinkRoute('lexiclash://auth/callback?code=xyz', 'en');
      expect(result?.isAuthCallback).toBe(true);
    });
  });

  describe('bad input', () => {
    it('returns null for an unparseable URL', () => {
      expect(buildDeepLinkRoute('not a url', 'en')).toBeNull();
    });
  });
});
