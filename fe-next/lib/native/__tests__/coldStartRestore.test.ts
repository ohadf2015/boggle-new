import {
  isRestorableRoute,
  parseSavedRoute,
  resolveColdStartTarget,
  stripLocale,
  ROUTE_RESTORE_WINDOW_MS,
  type SavedRoute,
} from '../coldStartRestore';

describe('coldStartRestore', () => {
  describe('stripLocale', () => {
    it('removes a recognized locale prefix', () => {
      expect(stripLocale('/en/profile')).toBe('/profile');
      expect(stripLocale('/he/friends/123')).toBe('/friends/123');
      expect(stripLocale('/ru/profile')).toBe('/profile');
    });

    it('returns "/" for the bare locale home', () => {
      expect(stripLocale('/en')).toBe('/');
    });

    it('leaves a path without a locale prefix untouched', () => {
      expect(stripLocale('/profile')).toBe('/profile');
    });
  });

  describe('isRestorableRoute', () => {
    it('allows curated hub/account screens', () => {
      expect(isRestorableRoute('/profile')).toBe(true);
      expect(isRestorableRoute('/leaderboard')).toBe(true);
      expect(isRestorableRoute('/friends/abc')).toBe(true);
      expect(isRestorableRoute('/settings')).toBe(true);
    });

    it('denies gameplay and transient routes (default-deny)', () => {
      expect(isRestorableRoute('/singleplayer')).toBe(false);
      expect(isRestorableRoute('/multiplayer')).toBe(false);
      expect(isRestorableRoute('/blast')).toBe(false);
      expect(isRestorableRoute('/daily')).toBe(false);
      expect(isRestorableRoute('/auth/callback')).toBe(false);
      expect(isRestorableRoute('/join/ABC123')).toBe(false);
    });

    it('denies the home path itself', () => {
      expect(isRestorableRoute('/')).toBe(false);
    });

    it('does not allow a prefix collision (/profiles is not /profile)', () => {
      expect(isRestorableRoute('/profiles-fake')).toBe(false);
    });
  });

  describe('parseSavedRoute', () => {
    it('parses a well-formed payload', () => {
      expect(parseSavedRoute('{"path":"/en/profile","ts":123}')).toEqual({
        path: '/en/profile',
        ts: 123,
      });
    });

    it('returns null for null, malformed JSON, or wrong shape', () => {
      expect(parseSavedRoute(null)).toBeNull();
      expect(parseSavedRoute('not json')).toBeNull();
      expect(parseSavedRoute('{"path":"/x"}')).toBeNull();
      expect(parseSavedRoute('{"ts":1}')).toBeNull();
      expect(parseSavedRoute('42')).toBeNull();
    });
  });

  describe('resolveColdStartTarget', () => {
    const now = 1_000_000_000;
    const fresh = (path: string): SavedRoute => ({ path, ts: now - 1000 });

    it('restores a fresh, allowlisted route when booted to home', () => {
      expect(
        resolveColdStartTarget({ currentPath: '/en', saved: fresh('/en/profile'), now })
      ).toBe('/en/profile');
    });

    it('does not restore when not booted to home (already elsewhere)', () => {
      expect(
        resolveColdStartTarget({ currentPath: '/en/leaderboard', saved: fresh('/en/profile'), now })
      ).toBeNull();
    });

    it('does not restore a gameplay route — lands on home instead', () => {
      expect(
        resolveColdStartTarget({ currentPath: '/en', saved: fresh('/en/singleplayer'), now })
      ).toBeNull();
    });

    it('does not restore a stale route beyond the window', () => {
      const stale: SavedRoute = { path: '/en/profile', ts: now - ROUTE_RESTORE_WINDOW_MS - 1 };
      expect(resolveColdStartTarget({ currentPath: '/en', saved: stale, now })).toBeNull();
    });

    it('ignores a future timestamp (clock skew)', () => {
      const future: SavedRoute = { path: '/en/profile', ts: now + 5000 };
      expect(resolveColdStartTarget({ currentPath: '/en', saved: future, now })).toBeNull();
    });

    it('returns null when there is nothing saved', () => {
      expect(resolveColdStartTarget({ currentPath: '/en', saved: null, now })).toBeNull();
    });

    it('returns null when the saved route equals the current path', () => {
      expect(
        resolveColdStartTarget({ currentPath: '/en', saved: fresh('/en'), now })
      ).toBeNull();
    });
  });
});
