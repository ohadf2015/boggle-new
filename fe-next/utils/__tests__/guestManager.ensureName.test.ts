/**
 * @vitest-environment happy-dom
 *
 * Guests used to show up as the literal "Guest" on live monitor / solo
 * because nothing assigned a default fun name until they opened a
 * multiplayer sheet. ensureGuestDisplayName must invent + persist one.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ensureGuestDisplayName, getGuestName, setGuestName } from '../guestManager';
import { getStoredUsername, setStoredUsername, clearStoredUsername } from '../profileStorage';
import { validateUsername } from '../validation';

describe('ensureGuestDisplayName', () => {
  beforeEach(() => {
    clearStoredUsername();
    setGuestName('');
  });

  it('invents a fun default (never the literal Guest) for a first-time visitor', () => {
    const name = ensureGuestDisplayName('en');
    expect(name).toBeTruthy();
    expect(name.toLowerCase()).not.toBe('guest');
    expect(validateUsername(name).isValid).toBe(true);
    expect(getStoredUsername()).toBe(name);
    expect(getGuestName()).toBe(name);
  });

  it('is stable across calls', () => {
    const first = ensureGuestDisplayName('en');
    expect(ensureGuestDisplayName('en')).toBe(first);
  });

  it('reuses a stored username instead of generating a new one', () => {
    setStoredUsername('Sly Fox');
    expect(ensureGuestDisplayName('en')).toBe('Sly Fox');
    expect(getGuestName()).toBe('Sly Fox');
  });

  it('promotes a guest-manager-only name into profile storage', () => {
    setGuestName('Disco Pickle');
    expect(ensureGuestDisplayName('en')).toBe('Disco Pickle');
    expect(getStoredUsername()).toBe('Disco Pickle');
  });
});
