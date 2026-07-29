import { describe, it, expect } from 'vitest';
import {
  OFFLINE_CAPABLE_MODES,
  OFFLINE_MODES,
  isOfflineCapable,
  offlineCapableRoutes,
} from '../offlineCapableModes';

const LOCALES = ['en', 'he', 'sv', 'ja', 'es'];

describe('offlineCapableModes', () => {
  describe('OFFLINE_CAPABLE_MODES', () => {
    it('includes the original bundled-data modes', () => {
      expect(OFFLINE_CAPABLE_MODES).toContain('blast');
      expect(OFFLINE_CAPABLE_MODES).toContain('connections');
      expect(OFFLINE_CAPABLE_MODES).toContain('daily');
    });

    it('includes the widened client-side solo modes', () => {
      expect(OFFLINE_CAPABLE_MODES).toContain('adventure');
      expect(OFFLINE_CAPABLE_MODES).toContain('brain');
      expect(OFFLINE_CAPABLE_MODES).toContain('singleplayer');
      expect(OFFLINE_CAPABLE_MODES).toContain('word-craft');
    });

    it('does NOT include multiplayer or other server-only modes', () => {
      expect(OFFLINE_CAPABLE_MODES).not.toContain('multiplayer');
      expect(OFFLINE_CAPABLE_MODES).not.toContain('friends');
      expect(OFFLINE_CAPABLE_MODES).not.toContain('community');
      expect(OFFLINE_CAPABLE_MODES).not.toContain('party');
      expect(OFFLINE_CAPABLE_MODES).not.toContain('custom');
    });
  });

  describe('OFFLINE_MODES metadata', () => {
    it('exposes one metadata entry per capable segment', () => {
      const segments = OFFLINE_MODES.map((m) => m.segment);
      expect(new Set(segments)).toEqual(new Set(OFFLINE_CAPABLE_MODES));
    });

    it('every entry has a non-empty i18n labelKey and an entry builder', () => {
      for (const m of OFFLINE_MODES) {
        expect(typeof m.labelKey).toBe('string');
        expect(m.labelKey.length).toBeGreaterThan(0);
        expect(typeof m.entry).toBe('function');
      }
    });

    it('entry() returns a locale-prefixed href', () => {
      const blast = OFFLINE_MODES.find((m) => m.segment === 'blast')!;
      expect(blast.entry('he')).toBe('/he/blast');
    });

    it('singleplayer entry uses the offline-safe ?practice=1 path (bare route redirects to MP)', () => {
      const sp = OFFLINE_MODES.find((m) => m.segment === 'singleplayer')!;
      expect(sp.entry('en')).toBe('/en/singleplayer?practice=1');
    });
  });

  describe('isOfflineCapable', () => {
    it('returns true for every offline-capable mode across locales', () => {
      for (const loc of LOCALES) {
        for (const seg of OFFLINE_CAPABLE_MODES) {
          expect(isOfflineCapable(`/${loc}/${seg}`)).toBe(true);
        }
      }
    });

    it('returns true for the singleplayer route incl. the practice query', () => {
      expect(isOfflineCapable('/en/singleplayer?practice=1')).toBe(true);
      expect(isOfflineCapable('/he/singleplayer')).toBe(true);
    });

    it('returns true for a sub-path under an offline-capable route', () => {
      expect(isOfflineCapable('/he/connections/2026-06-03')).toBe(true);
      expect(isOfflineCapable('/en/daily/results')).toBe(true);
      expect(isOfflineCapable('/en/brain/drills/combo-master')).toBe(true);
      expect(isOfflineCapable('/en/adventure/world/1')).toBe(true);
    });

    it('handles trailing slashes and query strings', () => {
      expect(isOfflineCapable('/en/blast/')).toBe(true);
      expect(isOfflineCapable('/en/blast?level=3')).toBe(true);
      expect(isOfflineCapable('/he/connections/?x=1')).toBe(true);
    });

    it('returns true when no locale prefix is present', () => {
      expect(isOfflineCapable('/blast')).toBe(true);
      expect(isOfflineCapable('/word-craft')).toBe(true);
    });

    it('returns false for server-only routes', () => {
      expect(isOfflineCapable('/en/multiplayer')).toBe(false);
      expect(isOfflineCapable('/he/friends')).toBe(false);
      expect(isOfflineCapable('/en/community')).toBe(false);
      expect(isOfflineCapable('/es/account')).toBe(false);
      expect(isOfflineCapable('/en/party')).toBe(false);
      expect(isOfflineCapable('/en/custom')).toBe(false);
    });

    it('returns false for the locale home page and bare root', () => {
      expect(isOfflineCapable('/en')).toBe(false);
      expect(isOfflineCapable('/he/')).toBe(false);
      expect(isOfflineCapable('/')).toBe(false);
      expect(isOfflineCapable('')).toBe(false);
    });

    it('does not treat a route that merely starts with a capable name as capable', () => {
      expect(isOfflineCapable('/en/blast-tips')).toBe(false);
      expect(isOfflineCapable('/en/connections-guide')).toBe(false);
      expect(isOfflineCapable('/en/word-craft-help')).toBe(false);
    });
  });

  describe('offlineCapableRoutes', () => {
    it('returns the full entry href for every mode in every locale (SW precache)', () => {
      const routes = offlineCapableRoutes();
      expect(routes).toContain('/en/blast');
      expect(routes).toContain('/he/connections');
      expect(routes).toContain('/ja/daily');
      expect(routes).toContain('/en/adventure');
      expect(routes).toContain('/en/brain');
      expect(routes).toContain('/en/word-craft');
      // singleplayer precaches the playable URL, not the redirecting bare route
      expect(routes).toContain('/en/singleplayer?practice=1');
      expect(routes).not.toContain('/en/singleplayer');
      // 5 locales x 7 modes
      expect(routes).toHaveLength(35);
    });
  });
});
