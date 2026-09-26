/**
 * The entry Back button (`mpExit('back-from-entry')`) needs the in-app route the
 * player came from. `document.referrer` only reflects the initial document load,
 * so after any client-side hop (home → daily → multiplayer) it still names the
 * first page, or nothing. This store is fed by NavigationProvider on every route
 * change and remembers the last NON-multiplayer route.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordInAppPath,
  getTrackedPreviousPath,
  resetInAppPathHistory,
} from '../NavigationContext';

describe('previousInAppPath store', () => {
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

  it('a language switch inside multiplayer does not overwrite the route before it', () => {
    recordInAppPath('/en/daily');
    recordInAppPath('/en/multiplayer');
    recordInAppPath('/he/multiplayer');
    recordInAppPath('/he/multiplayer?room=ABC123');
    expect(getTrackedPreviousPath()).toBe('/en/daily');
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

  it('ignores junk (external / protocol-relative / empty)', () => {
    recordInAppPath('/en/daily');
    recordInAppPath('//evil.example/x');
    recordInAppPath('');
    recordInAppPath('/en/multiplayer');
    expect(getTrackedPreviousPath()).toBe('/en/daily');
  });
});
