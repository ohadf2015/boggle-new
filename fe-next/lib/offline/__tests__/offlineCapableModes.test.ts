import { describe, it, expect } from 'vitest';
import {
  OFFLINE_CAPABLE_MODES,
  isOfflineCapable,
  offlineCapableRoutes,
} from '../offlineCapableModes';

describe('offlineCapableModes', () => {
  describe('OFFLINE_CAPABLE_MODES', () => {
    it('includes blast, connections, and daily', () => {
      expect(OFFLINE_CAPABLE_MODES).toContain('blast');
      expect(OFFLINE_CAPABLE_MODES).toContain('connections');
      expect(OFFLINE_CAPABLE_MODES).toContain('daily');
    });

    it('does NOT include multiplayer or other server-only modes', () => {
      expect(OFFLINE_CAPABLE_MODES).not.toContain('multiplayer');
      expect(OFFLINE_CAPABLE_MODES).not.toContain('friends');
      expect(OFFLINE_CAPABLE_MODES).not.toContain('community');
    });
  });

  describe('isOfflineCapable', () => {
    it('returns true for a locale-prefixed offline-capable route', () => {
      expect(isOfflineCapable('/en/blast')).toBe(true);
      expect(isOfflineCapable('/he/connections')).toBe(true);
      expect(isOfflineCapable('/es/daily')).toBe(true);
    });

    it('returns true for every supported locale prefix', () => {
      for (const loc of ['en', 'he', 'sv', 'ja', 'es']) {
        expect(isOfflineCapable(`/${loc}/blast`)).toBe(true);
      }
    });

    it('returns true for a sub-path under an offline-capable route', () => {
      expect(isOfflineCapable('/he/connections/2026-06-03')).toBe(true);
      expect(isOfflineCapable('/en/daily/results')).toBe(true);
    });

    it('handles trailing slashes and query strings', () => {
      expect(isOfflineCapable('/en/blast/')).toBe(true);
      expect(isOfflineCapable('/en/blast?level=3')).toBe(true);
      expect(isOfflineCapable('/he/connections/?x=1')).toBe(true);
    });

    it('returns true when no locale prefix is present', () => {
      expect(isOfflineCapable('/blast')).toBe(true);
      expect(isOfflineCapable('/connections')).toBe(true);
    });

    it('returns false for server-only routes', () => {
      expect(isOfflineCapable('/en/multiplayer')).toBe(false);
      expect(isOfflineCapable('/he/friends')).toBe(false);
      expect(isOfflineCapable('/en/community')).toBe(false);
      expect(isOfflineCapable('/es/account')).toBe(false);
    });

    it('returns false for the locale home page', () => {
      expect(isOfflineCapable('/en')).toBe(false);
      expect(isOfflineCapable('/he/')).toBe(false);
    });

    it('returns false for the bare root', () => {
      expect(isOfflineCapable('/')).toBe(false);
      expect(isOfflineCapable('')).toBe(false);
    });

    it('does not treat a route that merely starts with a capable name as capable', () => {
      // e.g. a marketing route like /en/blast-tips is NOT the game
      expect(isOfflineCapable('/en/blast-tips')).toBe(false);
      expect(isOfflineCapable('/en/connections-guide')).toBe(false);
    });
  });

  describe('offlineCapableRoutes', () => {
    it('returns concrete locale-prefixed paths for SW precaching', () => {
      const routes = offlineCapableRoutes();
      expect(routes).toContain('/en/blast');
      expect(routes).toContain('/he/connections');
      expect(routes).toContain('/ja/daily');
      // 5 locales x 3 modes
      expect(routes).toHaveLength(15);
    });
  });
});
