/**
 * The MP entry's Back (`mpExit('back-from-entry')`) needs the in-app route the
 * player came from. `document.referrer` only reflects the initial document
 * load: after any client-side hop (home → daily → multiplayer) it still names
 * the first page, or nothing. NavigationProvider feeds this store on every route
 * change; it remembers the last NON-multiplayer route.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordInAppPath,
  getTrackedPreviousPath,
  resetInAppPathHistory,
} from '../previousInAppPath';

describe('previousInAppPath', () => {
  beforeEach(() => resetInAppPathHistory());

  it('knows nothing before any navigation is recorded', () => {
    expect(getTrackedPreviousPath()).toBeNull();
  });

  it('a single page load has no previous route', () => {
    recordInAppPath('/en/multiplayer');
    expect(getTrackedPreviousPath()).toBeNull();
  });

  it('an SPA hop daily → multiplayer remembers /en/daily', () => {
    recordInAppPath('/en/daily');
    recordInAppPath('/en/multiplayer');
    expect(getTrackedPreviousPath()).toBe('/en/daily');
  });

  it('keeps the query string of the route the player left', () => {
    recordInAppPath('/en/daily?date=2026-09-26');
    recordInAppPath('/en/multiplayer');
    expect(getTrackedPreviousPath()).toBe('/en/daily?date=2026-09-26');
  });

  it('moves inside multiplayer (a room code in the URL) never overwrite the route before it', () => {
    recordInAppPath('/en/daily');
    recordInAppPath('/en/multiplayer');
    recordInAppPath('/en/multiplayer?room=ABC123');
    expect(getTrackedPreviousPath()).toBe('/en/daily');
  });

  it('a language switch inside multiplayer takes the way back along in the new language', () => {
    recordInAppPath('/en/daily?date=2026-09-26');
    recordInAppPath('/en/multiplayer');
    recordInAppPath('/he/multiplayer');
    expect(getTrackedPreviousPath()).toBe('/he/daily?date=2026-09-26');
  });

  it('the most recent non-MP route wins', () => {
    recordInAppPath('/en');
    recordInAppPath('/en/daily');
    recordInAppPath('/en/leaderboard');
    recordInAppPath('/en/multiplayer');
    expect(getTrackedPreviousPath()).toBe('/en/leaderboard');
  });

  it('re-recording the same route is not a hop', () => {
    recordInAppPath('/en/daily');
    recordInAppPath('/en/daily');
    expect(getTrackedPreviousPath()).toBeNull();
  });

  it('ignores junk (protocol-relative / external / empty)', () => {
    recordInAppPath('/en/daily');
    recordInAppPath('//evil.example/x');
    recordInAppPath('https://evil.example/x');
    recordInAppPath('');
    recordInAppPath('/en/multiplayer');
    expect(getTrackedPreviousPath()).toBe('/en/daily');
  });
});
